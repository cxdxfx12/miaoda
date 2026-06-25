// Package handler API 处理层 - 派单调度
package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/response"
)

// DispatchHandler 派单调度处理器
type DispatchHandler struct {
	svc *service.DispatchService
}

// NewDispatchHandler 创建派单处理器
func NewDispatchHandler(svc *service.DispatchService) *DispatchHandler {
	return &DispatchHandler{svc: svc}
}

// GetPendingOrders 待派订单列表
func (h *DispatchHandler) GetPendingOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	orders, total, err := h.svc.GetPendingOrders(c.Request.Context(), page, pageSize)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"list": orders, "total": total})
}

// GetAvailableTalents 可派达人列表（附匹配分）
func (h *DispatchHandler) GetAvailableTalents(c *gin.Context) {
	orderIDStr := c.Param("order_id")
	orderID, err := strconv.ParseInt(orderIDStr, 10, 64)
	if err != nil {
		response.ParamError(c, "无效的订单ID")
		return
	}
	talents, err := h.svc.GetAvailableTalents(c.Request.Context(), orderID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, talents)
}

// ManualAssign 手动派单
func (h *DispatchHandler) ManualAssign(c *gin.Context) {
	var req struct {
		OrderID  int64 `json:"order_id" binding:"required"`
		TalentID int64 `json:"talent_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}
	if err := h.svc.ManualAssign(c.Request.Context(), req.OrderID, req.TalentID); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "派单成功"})
}

// AutoDispatch 自动派单
func (h *DispatchHandler) AutoDispatch(c *gin.Context) {
	go h.svc.Start(c.Request.Context())
	response.Success(c, gin.H{"message": "自动派单已触发"})
}

// GetDispatchStats 派单统计
func (h *DispatchHandler) GetDispatchStats(c *gin.Context) {
	stats, err := h.svc.GetDispatchStats(c.Request.Context())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, stats)
}
