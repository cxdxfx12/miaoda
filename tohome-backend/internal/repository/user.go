// Package repository 数据访问层
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"

	"github.com/miaoda/backend/internal/model"
)

// 错误定义
var (
	ErrNotFound = errors.New("记录不存在")
	ErrExists   = errors.New("记录已存在")
)

// UserRepository 用户仓储
type UserRepository struct {
	db    *sqlx.DB
	redis *redis.Client
}

// NewUserRepository 创建用户仓储
func NewUserRepository(db *sqlx.DB, redis *redis.Client) *UserRepository {
	return &UserRepository{db: db, redis: redis}
}

// GetByID 根据ID获取用户
func (r *UserRepository) GetByID(ctx context.Context, id int64) (*model.User, error) {
	var user model.User
	err := r.db.GetContext(ctx, &user,
		`SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByPhone 根据手机号获取用户
func (r *UserRepository) GetByPhone(ctx context.Context, phone string) (*model.User, error) {
	var user model.User
	err := r.db.GetContext(ctx, &user,
		`SELECT * FROM users WHERE phone = $1 AND deleted_at IS NULL`, phone)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetByOpenID 根据微信OpenID获取用户
func (r *UserRepository) GetByOpenID(ctx context.Context, openID string) (*model.User, error) {
	var user model.User
	err := r.db.GetContext(ctx, &user,
		`SELECT * FROM users WHERE openid = $1 AND deleted_at IS NULL`, openID)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// BindWechat 绑定微信OpenID
func (r *UserRepository) BindWechat(ctx context.Context, userID int64, openID, unionID string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET openid = $1, unionid = $2, updated_at = $3 WHERE id = $4`,
		openID, unionID, time.Now(), userID)
	return err
}

// FindAdminByUsername 根据用户名从 admins 表查找管理员
func (r *UserRepository) FindAdminByUsername(ctx context.Context, username string) (*model.Admin, error) {
	var admin model.Admin
	err := r.db.GetContext(ctx, &admin,
		`SELECT * FROM admins WHERE username = $1 AND deleted_at IS NULL`, username)
	if err != nil {
		return nil, err
	}
	return &admin, nil
}

// FindAdminByID 根据ID查找管理员
func (r *UserRepository) FindAdminByID(ctx context.Context, id int64) (*model.Admin, error) {
	var admin model.Admin
	err := r.db.GetContext(ctx, &admin,
		`SELECT * FROM admins WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return nil, err
	}
	return &admin, nil
}

// UpdateAdminPassword 更新管理员密码
func (r *UserRepository) UpdateAdminPassword(ctx context.Context, id int64, passwordHash string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE admins SET password_hash = $1, updated_at = $2 WHERE id = $3`,
		passwordHash, time.Now(), id)
	return err
}

// Create 创建用户
func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	query := `
		INSERT INTO users (phone, password_hash, nickname, avatar, gender, member_level, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at`
	now := time.Now()
	err := r.db.QueryRowxContext(ctx, query,
		user.Phone, user.PasswordHash, user.Nickname, user.Avatar, user.Gender, user.MemberLevel, user.Status, now, now,
	).Scan(&user.ID, &user.CreatedAt)
	if err != nil {
		return err
	}
	user.UpdatedAt = now
	return nil
}

// Update 更新用户
func (r *UserRepository) Update(ctx context.Context, user *model.User) error {
	query := `
		UPDATE users
		SET nickname = $1, avatar = $2, gender = $3, birthday = $4, email = $5, updated_at = $6
		WHERE id = $7 AND deleted_at IS NULL`
	_, err := r.db.ExecContext(ctx, query,
		user.Nickname, user.Avatar, user.Gender, user.Birthday, user.Email, time.Now(), user.ID)
	return err
}

// UpdateLastLogin 更新最后登录信息
func (r *UserRepository) UpdateLastLogin(ctx context.Context, id int64, ip string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET last_login_at = $1, last_login_ip = $2 WHERE id = $3`,
		time.Now(), ip, id)
	return err
}

// UpdatePassword 更新密码
func (r *UserRepository) UpdatePassword(ctx context.Context, id int64, passwordHash string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3`,
		passwordHash, time.Now(), id)
	return err
}

// GetCache 获取缓存的用户信息
func (r *UserRepository) GetCache(ctx context.Context, id int64) (*model.User, error) {
	key := fmt.Sprintf("user:%d", id)
	data, err := r.redis.Get(ctx, key).Bytes()
	if err != nil {
		return nil, err
	}
	var user model.User
	if err := json.Unmarshal(data, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

// SetCache 设置用户缓存
func (r *UserRepository) SetCache(ctx context.Context, user *model.User) error {
	key := fmt.Sprintf("user:%d", user.ID)
	data, err := json.Marshal(user)
	if err != nil {
		return err
	}
	return r.redis.Set(ctx, key, data, time.Hour).Err()
}

// DeleteCache 删除用户缓存
func (r *UserRepository) DeleteCache(ctx context.Context, id int64) error {
	key := fmt.Sprintf("user:%d", id)
	return r.redis.Del(ctx, key).Err()
}

// ===================== 管理后台方法 =====================

// GetDashboardStats 仪表盘统计
func (r *UserRepository) GetDashboardStats(ctx context.Context) (map[string]interface{}, error) {
	stats := map[string]interface{}{}
	// 用户总数
	var userCount int64
	if err := r.db.GetContext(ctx, &userCount, `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`); err == nil {
		stats["user_count"] = userCount
	}
	// 达人总数
	var talentCount int64
	if err := r.db.GetContext(ctx, &talentCount, `SELECT COUNT(*) FROM technicians WHERE deleted_at IS NULL AND status = 1`); err == nil {
		stats["talent_count"] = talentCount
	}
	// 订单总数
	var orderCount int64
	if err := r.db.GetContext(ctx, &orderCount, `SELECT COUNT(*) FROM orders`); err == nil {
		stats["order_count"] = orderCount
	}
	return stats, nil
}

// AdminList 管理员用户列表
func (r *UserRepository) AdminList(ctx context.Context, page, pageSize int, status, level int, keyword string) ([]model.User, int64, error) {
	var users []model.User
	var total int64
	offset := (page - 1) * pageSize

	// 构建动态过滤条件
	where := "deleted_at IS NULL"
	args := []interface{}{}
	argIdx := 1

	if status >= 0 {
		where += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}
	if level >= 0 {
		where += fmt.Sprintf(" AND member_level = $%d", argIdx)
		args = append(args, level)
		argIdx++
	}
	if keyword != "" {
		where += fmt.Sprintf(" AND (nickname ILIKE $%d OR phone ILIKE $%d)", argIdx, argIdx+1)
		kw := "%" + keyword + "%"
		args = append(args, kw, kw)
		argIdx += 2
	}

	// 查询总数
	countQuery := "SELECT COUNT(*) FROM users WHERE " + where
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		total = 0
	}

	// 查询列表
	args = append(args, pageSize, offset)
	listQuery := fmt.Sprintf("SELECT * FROM users WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d", where, argIdx, argIdx+1)
	if err := r.db.SelectContext(ctx, &users, listQuery, args...); err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// FindByID 通过ID查找用户（别名）
func (r *UserRepository) FindByID(ctx context.Context, id int64) (*model.User, error) {
	return r.GetByID(ctx, id)
}

// UpdateStatus 更新用户状态
func (r *UserRepository) UpdateStatus(ctx context.Context, id int64, status int) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET status = $1, updated_at = $2 WHERE id = $3`,
		status, time.Now(), id)
	return err
}

// AdminUpdate 管理员完整更新用户
func (r *UserRepository) AdminUpdate(ctx context.Context, user *model.User) error {
	query := `
		UPDATE users
		SET phone = $1, password_hash = $2, nickname = $3, avatar = $4,
		    gender = $5, member_level = $6, status = $7, updated_at = $8
		WHERE id = $9 AND deleted_at IS NULL`
	_, err := r.db.ExecContext(ctx, query,
		user.Phone, user.PasswordHash, user.Nickname, user.Avatar,
		user.Gender, user.MemberLevel, user.Status, time.Now(), user.ID)
	return err
}

// SoftDelete 软删除用户
func (r *UserRepository) SoftDelete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET deleted_at = $1, updated_at = $1 WHERE id = $2`,
		time.Now(), id)
	return err
}
