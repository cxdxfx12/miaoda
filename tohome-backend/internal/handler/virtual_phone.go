// Package handler API 处理层 - 虚拟电话
package handler

import (
	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/response"
)

// VirtualPhoneHandler 虚拟电话处理器
type VirtualPhoneHandler struct {
	svc *service.VirtualPhoneService
}

// NewVirtualPhoneHandler 创建虚拟电话处理器
func NewVirtualPhoneHandler(svc *service.VirtualPhoneService) *VirtualPhoneHandler {
	return &VirtualPhoneHandler{svc: svc}
}

// BindPhone 绑定虚拟号
func (h *VirtualPhoneHandler) BindPhone(c *gin.Context) {
	var req struct {
		OrderID     int64  `json:"order_id" binding:"required"`
		UserPhone   string `json:"user_phone" binding:"required"`
		TalentPhone string `json:"talent_phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}
	vp, err := h.svc.BindVirtualPhone(c.Request.Context(), req.OrderID, req.UserPhone, req.TalentPhone)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{
		"virtual_phone": vp.VirtualX,
		"expire_at":     vp.ExpireAt,
	})
}

// UnbindPhone 解绑
func (h *VirtualPhoneHandler) UnbindPhone(c *gin.Context) {
	var req struct {
		OrderID int64 `json:"order_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.UnbindVirtualPhone(c.Request.Context(), req.OrderID); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "解绑成功"})
}

// RecordingCallback 通话录音回调
func (h *VirtualPhoneHandler) RecordingCallback(c *gin.Context) {
	// 接收第三方通话录音回调
	var data map[string]interface{}
	c.ShouldBindJSON(&data)
	response.Success(c, gin.H{"message": "ok"})
}

// TestConnection 测试虚拟电话服务连接
func (h *VirtualPhoneHandler) TestConnection(c *gin.Context) {
	if err := h.svc.TestVirtualPhoneConnection(c.Request.Context()); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "连接成功"})
}
