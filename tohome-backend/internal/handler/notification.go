// Package handler API 处理层 - 通知消息
package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/response"
)

// NotificationHandler 通知处理器
type NotificationHandler struct {
	svc *service.NotificationService
}

// NewNotificationHandler 创建通知处理器
func NewNotificationHandler(svc *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

// SendNotification 发送通知
func (h *NotificationHandler) SendNotification(c *gin.Context) {
	var req struct {
		UserID   int64                  `json:"user_id" binding:"required"`
		UserType int                    `json:"user_type" binding:"required"`
		Type     string                 `json:"type" binding:"required"`
		Title    string                 `json:"title" binding:"required"`
		Content  string                 `json:"content"`
		Data     map[string]interface{} `json:"data"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.SendNotification(c.Request.Context(), req.UserID, req.UserType, req.Type, req.Title, req.Content, req.Data); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "发送成功"})
}

// ListNotifications 通知列表
func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	userID, _ := strconv.ParseInt(c.GetString("user_id"), 10, 64)
	userType, _ := strconv.Atoi(c.GetString("user_type"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	list, total, err := h.svc.GetNotifications(c.Request.Context(), userID, userType, page, pageSize)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Page(c, list, total, page, pageSize)
}

// MarkAsRead 标记已读
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	userID, _ := strconv.ParseInt(c.GetString("user_id"), 10, 64)
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		response.ParamError(c, "无效的通知ID")
		return
	}
	if err := h.svc.MarkAsRead(c.Request.Context(), id, userID); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "已标记已读"})
}

// MarkAllAsRead 全部已读
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userID, _ := strconv.ParseInt(c.GetString("user_id"), 10, 64)
	userType, _ := strconv.Atoi(c.GetString("user_type"))
	if err := h.svc.MarkAllAsRead(c.Request.Context(), userID, userType); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "全部已读"})
}
