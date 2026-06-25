// Package handler HTTP处理器 - 订单处理器
package handler

import (
	"errors"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/internal/repository"
	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/response"
)

// OrderHandler 订单处理器
type OrderHandler struct {
	orderService *service.OrderService
	talentRepo   *repository.TalentRepository
}

// NewOrderHandler 创建订单处理器
func NewOrderHandler(orderService *service.OrderService, talentRepo *repository.TalentRepository) *OrderHandler {
	return &OrderHandler{orderService: orderService, talentRepo: talentRepo}
}

// resolveTalentID 将 JWT user_id 解析为 talent 表主键
func (h *OrderHandler) resolveTalentID(c *gin.Context) (int64, error) {
	uid := getUserID(c)
	if uid == 0 {
		return 0, errors.New("无效的用户ID")
	}
	if h.talentRepo == nil {
		return uid, nil // 无talent仓储时回退到user_id
	}
	talent, err := h.talentRepo.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		return 0, err
	}
	// 检查达人状态
	if talent.Status != model.TalentStatusNormal {
		return 0, errors.New("达人审核未通过或已被禁用")
	}
	return talent.ID, nil
}

// CreateOrder 创建订单
func (h *OrderHandler) CreateOrder(c *gin.Context) {
	uid := getUserID(c)
	var req service.CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	order, err := h.orderService.CreateOrder(c.Request.Context(), uid, &req)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, order)
}

// ListOrders 订单列表
func (h *OrderHandler) ListOrders(c *gin.Context) {
	uid := getUserID(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	statusStr := c.QueryArray("status")

	var status []int
	for _, s := range statusStr {
		if v, err := strconv.Atoi(s); err == nil {
			status = append(status, v)
		}
	}

	orders, total, err := h.orderService.ListUserOrders(c.Request.Context(), uid, status, page, pageSize)
	if err != nil {
		response.ServerError(c, "获取订单列表失败")
		return
	}
	response.Page(c, orders, total, page, pageSize)
}

// GetOrderDetail 订单详情
func (h *OrderHandler) GetOrderDetail(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	order, err := h.orderService.GetOrderDetail(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c)
		return
	}
	response.Success(c, order)
}

// CancelOrder 取消订单
func (h *OrderHandler) CancelOrder(c *gin.Context) {
	uid := getUserID(c)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)

	if err := h.orderService.CancelOrder(c.Request.Context(), id, uid, req.Reason); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}

// PayOrder 支付订单
func (h *OrderHandler) PayOrder(c *gin.Context) {
	uid := getUserID(c)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		PayMethod  int    `json:"pay_method" binding:"required"`
		PayChannel string `json:"pay_channel"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	// 调用服务层标记支付成功（余额支付/模拟支付走此流程）
	if err := h.orderService.PayOrder(c.Request.Context(), id); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}

	paymentNo := "P" + time.Now().Format("20060102150405") + "-" + strconv.FormatInt(id, 10)

	response.Success(c, gin.H{
		"order_id":    id,
		"user_id":     uid,
		"payment_no":  paymentNo,
		"pay_method":  req.PayMethod,
		"pay_channel": req.PayChannel,
		"status":      "paid",
	})
}

// ReviewOrder 评价订单
func (h *OrderHandler) ReviewOrder(c *gin.Context) {
	uid := getUserID(c)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		Rating      int      `json:"rating" binding:"required,min=1,max=5"`
		Content     string   `json:"content"`
		Tags        []string `json:"tags"`
		Images      []string `json:"images"`
		IsAnonymous bool     `json:"is_anonymous"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	if err := h.orderService.ReviewOrder(c.Request.Context(), id, uid,
		req.Rating, req.Content, req.Tags, req.Images, req.IsAnonymous); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}

// RequestExtraTime 加时申请
func (h *OrderHandler) RequestExtraTime(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		ExtraMinutes int     `json:"extra_minutes" binding:"required"`
		ExtraAmount  float64 `json:"extra_amount" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	talentID, err := h.resolveTalentID(c)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, "获取达人身份失败: "+err.Error())
		return
	}

	if err := h.orderService.RequestExtraTime(c.Request.Context(), id, talentID, req.ExtraMinutes, req.ExtraAmount); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}

// GetPendingOrders 待接订单
func (h *OrderHandler) GetPendingOrders(c *gin.Context) {
	orders, err := h.orderService.ListPendingOrders(c.Request.Context(), 50)
	if err != nil {
		response.ServerError(c, "获取订单失败")
		return
	}
	response.Success(c, orders)
}

// GetCurrentOrder 当前订单
func (h *OrderHandler) GetCurrentOrder(c *gin.Context) {
	talentID, err := h.resolveTalentID(c)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, "获取达人身份失败: "+err.Error())
		return
	}

	order, err := h.orderService.GetCurrentOrder(c.Request.Context(), talentID)
	if err != nil {
		response.Success(c, nil)
		return
	}
	response.Success(c, order)
}

// AcceptOrder 技师接单
func (h *OrderHandler) AcceptOrder(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	talentID, err := h.resolveTalentID(c)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, "获取达人身份失败: "+err.Error())
		return
	}

	if err := h.orderService.AcceptOrder(c.Request.Context(), id, talentID); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}

// RejectOrder 技师拒单
func (h *OrderHandler) RejectOrder(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	talentID, err := h.resolveTalentID(c)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, "获取达人身份失败: "+err.Error())
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)

	if err := h.orderService.RejectOrder(c.Request.Context(), id, talentID, req.Reason); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}

// UpdateOrderStatus 更新订单状态
func (h *OrderHandler) UpdateOrderStatus(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	talentID, err := h.resolveTalentID(c)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, "获取达人身份失败: "+err.Error())
		return
	}

	var req struct {
		Status string  `json:"status" binding:"required"`
		Lat    float64 `json:"lat"`
		Lng    float64 `json:"lng"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	statusMap := map[string]int{
		"departed":  model.OrderStatusDeparted,
		"arrived":   model.OrderStatusArrived,
		"started":   model.OrderStatusInService,
		"completed": model.OrderStatusCompleted,
	}
	status, ok := statusMap[req.Status]
	if !ok {
		response.ParamError(c, "无效状态")
		return
	}

	if err := h.orderService.UpdateOrderStatus(c.Request.Context(), id, talentID, status); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}

// UpdateLocation 更新位置
func (h *OrderHandler) UpdateLocation(c *gin.Context) {
	var req struct {
		Lat float64 `json:"lat" binding:"required"`
		Lng float64 `json:"lng" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	talentID, err := h.resolveTalentID(c)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, "获取达人身份失败: "+err.Error())
		return
	}

	if err := h.orderService.UpdateTalentLocation(c.Request.Context(), talentID, req.Lat, req.Lng); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}

// AdminListOrders 管理员订单列表
func (h *OrderHandler) AdminListOrders(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	statusStr := c.Query("status")

	var status []int
	if statusStr != "" {
		if v, err := strconv.Atoi(statusStr); err == nil {
			status = append(status, v)
		}
	}

	orders, total, err := h.orderService.AdminListOrders(c.Request.Context(), status, page, pageSize)
	if err != nil {
		response.ServerError(c, "获取订单列表失败")
		return
	}
	response.Page(c, orders, total, page, pageSize)
}

// AdminGetOrderDetail 管理员订单详情
func (h *OrderHandler) AdminGetOrderDetail(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	order, err := h.orderService.GetOrderDetail(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c)
		return
	}
	response.Success(c, order)
}

// AdminAssignOrder 管理员分配订单
func (h *OrderHandler) AdminAssignOrder(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var req struct {
		TechnicianID int64 `json:"technician_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	if err := h.orderService.AdminAssignOrder(c.Request.Context(), id, req.TechnicianID); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}
