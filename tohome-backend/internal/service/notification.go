// Package service 业务逻辑层 - 通知服务
package service

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"

	"github.com/miaoda/backend/internal/config"
	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/pkg/logger"
)

// NotificationService 通知服务
type NotificationService struct {
	db    *sqlx.DB
	redis *redis.Client
	cfg   *config.Config
}

// NewNotificationService 创建通知服务
func NewNotificationService(db *sqlx.DB, redis *redis.Client, cfg *config.Config) *NotificationService {
	return &NotificationService{db: db, redis: redis, cfg: cfg}
}

// SendNotification 发送通知
func (s *NotificationService) SendNotification(ctx context.Context, userID int64, userType int, notifyType, title, content string, data map[string]interface{}) error {
	dataJSON := "{}"
	if data != nil {
		b, _ := json.Marshal(data)
		dataJSON = string(b)
	}

	notif := &model.Notification{
		UserID:    userID,
		UserType:  userType,
		Type:      notifyType,
		Title:     title,
		Content:   &content,
		Data:      model.JSON(dataJSON),
		IsRead:    0,
		CreatedAt: time.Now(),
	}

	_, err := s.db.NamedExecContext(ctx, `INSERT INTO notifications (user_id, user_type, type, title, content, data, is_read, created_at)
		VALUES (:user_id, :user_type, :type, :title, :content, :data, :is_read, :created_at)`, notif)
	if err != nil {
		return fmt.Errorf("保存通知失败: %w", err)
	}

	// 远程推送（极光推送等）
	s.pushToDevice(ctx, userID, userType, title, content)

	logger.Info("通知已发送: user=%d, type=%s, title=%s", userID, notifyType, title)
	return nil
}

// GetNotifications 获取通知列表
func (s *NotificationService) GetNotifications(ctx context.Context, userID int64, userType int, page, pageSize int) ([]model.Notification, int64, error) {
	var total int64
	countQuery := `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND user_type = $2 AND deleted_at IS NULL`
	s.db.GetContext(ctx, &total, countQuery, userID, userType)

	offset := (page - 1) * pageSize
	var list []model.Notification
	err := s.db.SelectContext(ctx, &list, `SELECT * FROM notifications WHERE user_id = $1 AND user_type = $2 AND deleted_at IS NULL 
		ORDER BY created_at DESC LIMIT $3 OFFSET $4`, userID, userType, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	return list, total, nil
}

// MarkAsRead 标记已读
func (s *NotificationService) MarkAsRead(ctx context.Context, id int64, userID int64) error {
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `UPDATE notifications SET is_read = 1, read_at = $1 WHERE id = $2 AND user_id = $3`, now, id, userID)
	return err
}

// MarkAllAsRead 全部标记已读
func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID int64, userType int) error {
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `UPDATE notifications SET is_read = 1, read_at = $1 WHERE user_id = $2 AND user_type = $3 AND is_read = 0`, now, userID, userType)
	return err
}

// GetUnreadCount 获取未读数
func (s *NotificationService) GetUnreadCount(ctx context.Context, userID int64, userType int) (int, error) {
	var count int
	err := s.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND user_type = $2 AND is_read = 0 AND deleted_at IS NULL`, userID, userType)
	return count, err
}

// DeleteNotification 删除通知
func (s *NotificationService) DeleteNotification(ctx context.Context, id int64, userID int64) error {
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `UPDATE notifications SET deleted_at = $1 WHERE id = $2 AND user_id = $3`, now, id, userID)
	return err
}

// pushToDevice 推送到设备（极光推送/个推/Firebase）
func (s *NotificationService) pushToDevice(ctx context.Context, userID int64, userType int, title, content string) {
	cfg := s.cfg.ThirdParty.Push
	if cfg.Provider == "" {
		return
	}

	switch cfg.Provider {
	case "jpush":
		s.pushViaJPush(ctx, userID, userType, title, content, &cfg)
	case "getui":
		s.pushViaGeTui(ctx, userID, userType, title, content, &cfg)
	case "firebase":
		// Firebase Cloud Messaging - 通过 HTTP V1 API
		s.pushViaFirebase(ctx, userID, userType, title, content)
	default:
		logger.Debug("未配置推送提供商或提供商不支持: %s", cfg.Provider)
	}
}

// pushViaJPush 极光推送 REST API
func (s *NotificationService) pushViaJPush(ctx context.Context, userID int64, userType int, title, content string, cfg *config.PushConfig) {
	if cfg.JPush.AppKey == "" || cfg.JPush.MasterSecret == "" {
		logger.Debug("极光推送未配置 AppKey/MasterSecret")
		return
	}

	// 构造推送 payload
	payload := map[string]interface{}{
		"platform": "all",
		"audience": map[string]interface{}{
			"alias": []string{fmt.Sprintf("%s_%d", mapUserType(userType), userID)},
		},
		"notification": map[string]interface{}{
			"android": map[string]interface{}{
				"alert":  content,
				"title":  title,
				"extras": map[string]interface{}{"user_id": userID, "user_type": userType},
			},
			"ios": map[string]interface{}{
				"alert": map[string]interface{}{
					"title": title,
					"body":  content,
				},
				"badge":  "+1",
				"sound":  "default",
				"extras": map[string]interface{}{"user_id": userID, "user_type": userType},
			},
		},
		"options": map[string]interface{}{
			"apns_production": s.cfg.App.Env == "production",
			"time_to_live":    86400,
		},
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.jpush.cn/v3/push", bytes.NewReader(body))
	if err != nil {
		logger.Error("创建极光推送请求失败: %v", err)
		return
	}

	// 设置 Basic Auth 头
	auth := base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", cfg.JPush.AppKey, cfg.JPush.MasterSecret)))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Error("极光推送请求失败: %v", err)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == http.StatusOK {
		logger.Info("极光推送成功: user=%d, title=%s", userID, title)
	} else {
		logger.Error("极光推送失败: status=%d, body=%s", resp.StatusCode, string(respBody))
	}
}

// pushViaGeTui 个推 REST API (V2)
func (s *NotificationService) pushViaGeTui(ctx context.Context, userID int64, userType int, title, content string, cfg *config.PushConfig) {
	if cfg.GeTui.AppID == "" || cfg.GeTui.AppKey == "" || cfg.GeTui.MasterSecret == "" {
		logger.Debug("个推未配置 AppID/AppKey/MasterSecret")
		return
	}

	// 获取 auth token (简化实现，实际应缓存)
	token, err := s.getGeTuiToken(ctx, cfg)
	if err != nil {
		logger.Error("获取个推 token 失败: %v", err)
		return
	}

	timestamp := strconv.FormatInt(time.Now().UnixMilli(), 10)
	cid := fmt.Sprintf("%s_%d", mapUserType(userType), userID)

	payload := map[string]interface{}{
		"request_id": fmt.Sprintf("%d_%d", userID, time.Now().UnixNano()),
		"audience": map[string]interface{}{
			"cid": []string{cid},
		},
		"push_message": map[string]interface{}{
			"notification": map[string]interface{}{
				"title":     title,
				"body":      content,
				"click_type": "intent",
			},
		},
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, "POST", "https://restapi.getui.com/v2/"+cfg.GeTui.AppID+"/push/single/cid", bytes.NewReader(body))
	if err != nil {
		logger.Error("创建个推请求失败: %v", err)
		return
	}

	req.Header.Set("Content-Type", "application/json;charset=utf-8")
	req.Header.Set("token", token)
	_ = timestamp

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.Error("个推推送请求失败: %v", err)
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == http.StatusOK {
		logger.Info("个推推送成功: user=%d, title=%s", userID, title)
	} else {
		logger.Error("个推推送失败: status=%d, body=%s", resp.StatusCode, string(respBody))
	}
}

// getGeTuiToken 获取个推 access token
func (s *NotificationService) getGeTuiToken(ctx context.Context, cfg *config.PushConfig) (string, error) {
	timestamp := strconv.FormatInt(time.Now().UnixMilli(), 10)
	signStr := fmt.Sprintf("%s%s%s", cfg.GeTui.AppKey, timestamp, cfg.GeTui.MasterSecret)
	sign := fmt.Sprintf("%x", sha256.Sum256([]byte(signStr)))

	payload := map[string]string{
		"sign":      sign,
		"timestamp": timestamp,
		"appkey":    cfg.GeTui.AppKey,
	}
	body, _ := json.Marshal(payload)

	resp, err := http.Post("https://restapi.getui.com/v2/"+cfg.GeTui.AppID+"/auth",
		"application/json;charset=utf-8", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("请求个推auth失败: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
		Data struct {
			Token    string `json:"token"`
			ExpireAt int64  `json:"expire_at"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("解析个推响应失败: %w", err)
	}
	if result.Code != 0 {
		return "", fmt.Errorf("个推auth失败: code=%d, msg=%s", result.Code, result.Msg)
	}
	return result.Data.Token, nil
}

// pushViaFirebase Firebase Cloud Messaging (HTTP V1)
func (s *NotificationService) pushViaFirebase(ctx context.Context, userID int64, userType int, title, content string) {
	// Firebase FCM V1 API 需要 OAuth2 token，简化实现，仅在配置了 service account 时才可用
	logger.Debug("Firebase 推送暂未实现（需配置服务账号JSON）: user=%d, title=%s", userID, title)
}

// mapUserType 用户类型映射为推送别名前缀
func mapUserType(userType int) string {
	switch userType {
	case 1:
		return "user"
	case 2:
		return "talent"
	case 3:
		return "admin"
	default:
		return "unknown"
	}
}
