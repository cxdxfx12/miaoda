// Package handler 支付处理器
package handler

import (
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/logger"
	"github.com/miaoda/backend/pkg/response"
)

// PaymentHandler 支付处理器
type PaymentHandler struct {
	paymentService *service.PaymentService
}

// NewPaymentHandler 创建支付处理器
func NewPaymentHandler(paymentService *service.PaymentService) *PaymentHandler {
	return &PaymentHandler{paymentService: paymentService}
}

// CreatePayment 创建支付
// @Summary 创建支付
// @Tags 支付
// @Accept json
// @Produce json
// @Param body body service.CreatePaymentRequest true "创建支付请求"
// @Success 200 {object} response.Response
// @Router /api/v1/payments/create [post]
func (h *PaymentHandler) CreatePayment(c *gin.Context) {
	uid := getUserID(c)
	if uid == 0 {
		response.Unauthorized(c)
		return
	}

	var req service.CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	result, err := h.paymentService.CreatePayment(c.Request.Context(), uid, &req)
	if err != nil {
		logger.Error("创建支付失败: user_id=%d, err=%v", uid, err)
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}

	response.Success(c, result)
}

// GetPayment 获取支付记录
// @Summary 获取支付记录
// @Tags 支付
// @Param id path int true "支付ID"
// @Success 200 {object} response.Response
// @Router /api/v1/payments/:id [get]
func (h *PaymentHandler) GetPayment(c *gin.Context) {
	uid := getUserID(c)
	if uid == 0 {
		response.Unauthorized(c)
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	payment, err := h.paymentService.GetPayment(c.Request.Context(), id, uid)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}

	response.Success(c, payment)
}

// WechatCallback 微信支付回调
// @Summary 微信支付回调
// @Tags 支付回调
// @Router /api/v1/payments/callback/wechat [post]
func (h *PaymentHandler) WechatCallback(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.Error("读取微信回调body失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"code": "FAIL", "message": "读取请求失败"})
		return
	}

	logger.Info("收到微信支付回调: %s", string(body))

	if err := h.paymentService.HandleWechatCallback(c.Request.Context(), body); err != nil {
		logger.Error("处理微信回调失败: %v", err)
		// 返回失败让微信重试
		c.JSON(http.StatusInternalServerError, gin.H{"code": "FAIL", "message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": "SUCCESS", "message": "OK"})
}

// AlipayCallback 支付宝回调
// @Summary 支付宝回调
// @Tags 支付回调
// @Router /api/v1/payments/callback/alipay [post]
func (h *PaymentHandler) AlipayCallback(c *gin.Context) {
	// 支付宝回调是application/x-www-form-urlencoded格式
	if err := c.Request.ParseForm(); err != nil {
		logger.Error("解析支付宝回调表单失败: %v", err)
		c.String(http.StatusOK, "fail")
		return
	}

	params := make(map[string]string)
	for k, v := range c.Request.PostForm {
		if len(v) > 0 {
			params[k] = v[0]
		}
	}

	logger.Info("收到支付宝支付回调: trade_no=%s, out_trade_no=%s",
		params["trade_no"], params["out_trade_no"])

	if err := h.paymentService.HandleAlipayCallback(c.Request.Context(), params); err != nil {
		logger.Error("处理支付宝回调失败: %v", err)
		c.String(http.StatusOK, "fail")
		return
	}

	c.String(http.StatusOK, "success")
}

// Refund 退款
// @Summary 退款
// @Tags 支付
// @Accept json
// @Produce json
// @Param id path int true "支付ID"
// @Param body body RefundRequest true "退款请求"
// @Success 200 {object} response.Response
// @Router /api/v1/payments/:id/refund [post]
func (h *PaymentHandler) Refund(c *gin.Context) {
	uid := getUserID(c)
	if uid == 0 {
		response.Unauthorized(c)
		return
	}

	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	var req struct {
		Amount float64 `json:"amount" binding:"required,gt=0"`
		Reason string  `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	result, err := h.paymentService.Refund(c.Request.Context(), id, req.Amount, req.Reason, uid)
	if err != nil {
		logger.Error("退款失败: payment_id=%d, err=%v", id, err)
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}

	response.Success(c, result)
}

// RefundRequest 退款请求
type RefundRequest struct {
	Amount float64 `json:"amount" binding:"required,gt=0"`
	Reason string  `json:"reason"`
}
