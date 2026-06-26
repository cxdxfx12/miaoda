package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/pkg/database"
	"github.com/miaoda/backend/pkg/response"
)

type backupDBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
}

type backupTableInfo struct {
	Name string `json:"name"`
	Rows int64  `json:"rows"`
}

type backupMeta struct {
	ID          string            `json:"id"`
	Filename    string            `json:"filename"`
	CreatedAt   string            `json:"created_at"`
	Size        int64             `json:"size"`
	SizeText    string            `json:"size_text"`
	DBName      string            `json:"db_name"`
	Format      string            `json:"format"`
	Scope       string            `json:"scope"`
	TableCount  int               `json:"table_count"`
	TotalRows   int64             `json:"total_rows"`
	Tables      []backupTableInfo `json:"tables"`
	Description string            `json:"description"`
}

var backupNamePattern = regexp.MustCompile(`^backup_[0-9]{8}_[0-9]{6}_[a-z0-9_]+\.sql$`)

func getBackupDir() string {
	if dir := strings.TrimSpace(os.Getenv("BACKUP_DIR")); dir != "" {
		return dir
	}
	return "/app/backups"
}

func getBackupDBConfig() backupDBConfig {
	return backupDBConfig{
		Host:     firstEnv("POSTGRES_HOST", "postgres"),
		Port:     firstEnv("POSTGRES_PORT", "5432"),
		User:     firstEnv("POSTGRES_USER", "tohome"),
		Password: firstEnv("POSTGRES_PASSWORD", "tohome123"),
		DBName:   firstEnv("POSTGRES_DB", "tohome"),
	}
}

func firstEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func safeBackupFilename(filename string) (string, bool) {
	name := filepath.Base(filename)
	return name, backupNamePattern.MatchString(name)
}

func quotePGIdentifier(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func formatBackupSize(size int64) string {
	if size < 1024 {
		return fmt.Sprintf("%d B", size)
	}
	if size < 1024*1024 {
		return fmt.Sprintf("%.1f KB", float64(size)/1024)
	}
	if size < 1024*1024*1024 {
		return fmt.Sprintf("%.1f MB", float64(size)/1024/1024)
	}
	return fmt.Sprintf("%.1f GB", float64(size)/1024/1024/1024)
}

func collectBackupTables(ctx context.Context) ([]backupTableInfo, int64, error) {
	db := database.Database()
	if db == nil {
		return nil, 0, fmt.Errorf("数据库未连接")
	}
	var names []string
	if err := db.SelectContext(ctx, &names, `
		SELECT table_name
		FROM information_schema.tables
		WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
		ORDER BY table_name
	`); err != nil {
		return nil, 0, err
	}
	tables := make([]backupTableInfo, 0, len(names))
	var total int64
	for _, name := range names {
		var count int64
		query := fmt.Sprintf(`SELECT COUNT(*) FROM %s`, quotePGIdentifier(name))
		if err := db.GetContext(ctx, &count, query); err != nil {
			count = 0
		}
		tables = append(tables, backupTableInfo{Name: name, Rows: count})
		total += count
	}
	return tables, total, nil
}

func (h *AdminHandler) createDatabaseBackup(ctx context.Context, description string) (*backupMeta, error) {
	dir := getBackupDir()
	if err := os.MkdirAll(dir, 0750); err != nil {
		return nil, fmt.Errorf("创建备份目录失败: %w", err)
	}
	cfg := getBackupDBConfig()
	now := time.Now()
	id := now.Format("20060102_150405")
	suffix := "manual"
	if strings.Contains(description, "恢复前") {
		suffix = "pre_restore"
	}
	filename := fmt.Sprintf("backup_%s_%s.sql", id, suffix)
	path := filepath.Join(dir, filename)

	tables, totalRows, err := collectBackupTables(ctx)
	if err != nil {
		return nil, fmt.Errorf("读取备份表信息失败: %w", err)
	}

	dumpCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(dumpCtx, "pg_dump",
		"-h", cfg.Host,
		"-p", cfg.Port,
		"-U", cfg.User,
		"-d", cfg.DBName,
		"--clean",
		"--if-exists",
		"--no-owner",
		"--no-privileges",
		"--format=plain",
		"--file", path,
	)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+cfg.Password)
	if output, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(path)
		return nil, fmt.Errorf("执行 pg_dump 失败: %v: %s", err, strings.TrimSpace(string(output)))
	}
	stat, err := os.Stat(path)
	if err != nil {
		return nil, fmt.Errorf("读取备份文件失败: %w", err)
	}

	meta := &backupMeta{
		ID:          id,
		Filename:    filename,
		CreatedAt:   now.Format(time.RFC3339),
		Size:        stat.Size(),
		SizeText:    formatBackupSize(stat.Size()),
		DBName:      cfg.DBName,
		Format:      "PostgreSQL SQL",
		Scope:       "public schema 全量结构和数据",
		TableCount:  len(tables),
		TotalRows:   totalRows,
		Tables:      tables,
		Description: description,
	}
	metaPath := path + ".json"
	data, _ := json.MarshalIndent(meta, "", "  ")
	if err := os.WriteFile(metaPath, data, 0640); err != nil {
		return nil, fmt.Errorf("写入备份元数据失败: %w", err)
	}
	return meta, nil
}

func readBackupMeta(path string) (*backupMeta, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var meta backupMeta
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, err
	}
	if stat, err := os.Stat(filepath.Join(filepath.Dir(path), meta.Filename)); err == nil {
		meta.Size = stat.Size()
		meta.SizeText = formatBackupSize(stat.Size())
	}
	return &meta, nil
}

// AdminListBackups 获取数据库备份文件列表
func (h *AdminHandler) AdminListBackups(c *gin.Context) {
	dir := getBackupDir()
	_ = os.MkdirAll(dir, 0750)
	matches, _ := filepath.Glob(filepath.Join(dir, "backup_*.sql.json"))
	items := make([]*backupMeta, 0, len(matches))
	for _, metaPath := range matches {
		meta, err := readBackupMeta(metaPath)
		if err == nil && meta != nil {
			items = append(items, meta)
		}
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt > items[j].CreatedAt
	})
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

// AdminBackup 手动创建数据库备份
func (h *AdminHandler) AdminBackup(c *gin.Context) {
	meta, err := h.createDatabaseBackup(c.Request.Context(), "手动备份")
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "备份已完成", "backup": meta})
}

// AdminDownloadBackup 下载数据库备份文件
func (h *AdminHandler) AdminDownloadBackup(c *gin.Context) {
	filename, ok := safeBackupFilename(c.Param("filename"))
	if !ok {
		response.ParamError(c, "备份文件名无效")
		return
	}
	path := filepath.Join(getBackupDir(), filename)
	if _, err := os.Stat(path); err != nil {
		response.NotFound(c)
		return
	}
	c.Header("Content-Type", "application/sql")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.File(path)
}

// AdminRestoreBackup 从指定备份恢复数据库
func (h *AdminHandler) AdminRestoreBackup(c *gin.Context) {
	filename, ok := safeBackupFilename(c.Param("filename"))
	if !ok {
		response.ParamError(c, "备份文件名无效")
		return
	}
	path := filepath.Join(getBackupDir(), filename)
	if _, err := os.Stat(path); err != nil {
		response.NotFound(c)
		return
	}

	safetyBackup, err := h.createDatabaseBackup(c.Request.Context(), "恢复前自动备份")
	if err != nil {
		response.ServerError(c, "恢复前自动备份失败，已取消恢复: "+err.Error())
		return
	}

	cfg := getBackupDBConfig()
	restoreCtx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(restoreCtx, "psql",
		"-h", cfg.Host,
		"-p", cfg.Port,
		"-U", cfg.User,
		"-d", cfg.DBName,
		"-v", "ON_ERROR_STOP=1",
		"-f", path,
	)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+cfg.Password)
	if output, err := cmd.CombinedOutput(); err != nil {
		response.ServerError(c, fmt.Sprintf("恢复失败: %v: %s", err, strings.TrimSpace(string(output))))
		return
	}
	response.Success(c, gin.H{
		"message":       "恢复已完成",
		"restored_file": filename,
		"safety_backup": safetyBackup,
	})
}

// AdminDeleteBackup 删除指定备份文件
func (h *AdminHandler) AdminDeleteBackup(c *gin.Context) {
	filename, ok := safeBackupFilename(c.Param("filename"))
	if !ok {
		response.ParamError(c, "备份文件名无效")
		return
	}
	path := filepath.Join(getBackupDir(), filename)
	if _, err := os.Stat(path); err != nil {
		response.NotFound(c)
		return
	}
	_ = os.Remove(path)
	_ = os.Remove(path + ".json")
	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "删除成功"})
}

func (m backupMeta) CreatedAtText() string {
	t, err := time.Parse(time.RFC3339, m.CreatedAt)
	if err != nil {
		return m.CreatedAt
	}
	return t.Format("2006-01-02 15:04:05")
}

func (m backupMeta) TotalRowsText() string {
	return strconv.FormatInt(m.TotalRows, 10)
}
