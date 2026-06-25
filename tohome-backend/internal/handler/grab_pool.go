// Package handler 抢单池处理器
package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/response"
)

// GrabPoolHandler 抢单池处理器
type GrabPoolHandler struct {
	svc      *service.GrabPoolService
	talentSvc *service.TalentService
}

// NewGrabPoolHandler 创建抢单池处理器
func NewGrabPoolHandler(svc *service.GrabPoolService, talentSvc *service.TalentService) *GrabPoolHandler {
	return &GrabPoolHandler{svc: svc, talentSvc: talentSvc}
}

// resolveTalentID 从 context 获取 user_id 并解析为 talent 表 ID
func (h *GrabPoolHandler) resolveTalentID(c *gin.Context) (int64, error) {
	userID, _ := c.Get("user_id")
	uid, ok := userID.(int64)
	if !ok || uid == 0 {
		return 0, strconv.ErrSyntax
	}
	talent, err := h.talentSvc.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		return 0, err
	}
	return talent.ID, nil
}

// ListPoolOrders 获取抢单池订单列表（达人端）
// GET /api/v1/talent/grab-pool/list?filter=latest&page=1&page_size=20&lat=30.25&lng=120.16
func (h *GrabPoolHandler) ListPoolOrders(c *gin.Context) {
	talentID, err := h.resolveTalentID(c)
	if err != nil {
		response.Fail(c, 401, "达人身份获取失败")
		return
	}

	lat, _ := strconv.ParseFloat(c.DefaultQuery("lat", "0"), 64)
	lng, _ := strconv.ParseFloat(c.DefaultQuery("lng", "0"), 64)
	filter := c.DefaultQuery("filter", "latest") // latest / nearest / highest / urgent
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}

	orders, total, stats, err := h.svc.ListPoolOrders(c.Request.Context(), talentID, lat, lng, filter, page, pageSize)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"list":     orders,
		"total":    total,
		"page":     page,
		"page_size": pageSize,
		"stats":    stats,
	})
}

// GrabOrder 抢单
// POST /api/v1/talent/grab-pool/:order_id/grab
func (h *GrabPoolHandler) GrabOrder(c *gin.Context) {
	talentID, err := h.resolveTalentID(c)
	if err != nil {
		response.Fail(c, 401, "达人身份获取失败")
		return
	}

	orderIDStr := c.Param("order_id")
	orderID, err := strconv.ParseInt(orderIDStr, 10, 64)
	if err != nil {
		response.ParamError(c, "无效的订单ID")
		return
	}

	result, err := h.svc.GrabOrder(c.Request.Context(), talentID, orderID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	if result.Success {
		response.Success(c, result)
	} else {
		response.Fail(c, 400, result.Reason)
	}
}

// GetGrabStats 获取达人抢单统计
// GET /api/v1/talent/grab-pool/stats
func (h *GrabPoolHandler) GetGrabStats(c *gin.Context) {
	talentID, err := h.resolveTalentID(c)
	if err != nil {
		response.Fail(c, 401, "达人身份获取失败")
		return
	}

	stats, err := h.svc.GetGrabStats(c.Request.Context(), talentID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}

	response.Success(c, stats)
}

// AdminPoolOverview 管理后台抢单池概览
// GET /api/v1/admin/grab-pool/overview
func (h *GrabPoolHandler) AdminPoolOverview(c *gin.Context) {
	overview, err := h.svc.AdminGetPoolOverview(c.Request.Context())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, overview)
}

// AdminRemoveFromPool 管理后台强制移除
// POST /api/v1/admin/grab-pool/remove
func (h *GrabPoolHandler) AdminRemoveFromPool(c *gin.Context) {
	var req struct {
		OrderID int64  `json:"order_id" binding:"required"`
		Reason  string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}

	if err := h.svc.AdminForceRemove(c.Request.Context(), req.OrderID, req.Reason); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "已从抢单池移除"})
}
