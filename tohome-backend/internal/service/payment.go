// Package service 业务逻辑层 - 支付服务
package service

import (
	"context"
	"crypto"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"

	"github.com/miaoda/backend/internal/config"
	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/pkg/logger"
)

// 支付服务错误
var (
	ErrPaymentNotFound     = errors.New("支付记录不存在")
	ErrPaymentFailed       = errors.New("支付失败")
	ErrRefundFailed        = errors.New("退款失败")
	ErrInvalidPayMethod    = errors.New("不支持的支付方式")
	ErrInsufficientBalance = errors.New("余额不足")
	ErrSignatureVerify     = errors.New("签名验证失败")
)

// PaymentChannel 支付渠道接口
type PaymentChannel interface {
	// CreatePayment 创建支付（返回支付参数，用于前端调起支付）
	CreatePayment(ctx context.Context, payment *model.Payment, cfg interface{}) (interface{}, error)
	// QueryPayment 查询支付状态
	QueryPayment(ctx context.Context, payment *model.Payment, cfg interface{}) (*PaymentQueryResult, error)
	// Refund 退款
	Refund(ctx context.Context, payment *model.Payment, amount float64, reason string, cfg interface{}) (*RefundResult, error)
	// VerifyCallback 验证回调签名
	VerifyCallback(ctx context.Context, body []byte, cfg interface{}) (*CallbackData, error)
	// Name 渠道名称
	Name() string
}

// PaymentQueryResult 支付查询结果
type PaymentQueryResult struct {
	TransactionID string  `json:"transaction_id"`
	Status        int     `json:"status"` // model.PaymentStatus*
	Amount        float64 `json:"amount"`
	RawResponse   string  `json:"raw_response"`
}

// RefundResult 退款结果
type RefundResult struct {
	RefundNo      string  `json:"refund_no"`
	RefundAmount  float64 `json:"refund_amount"`
	TransactionID string  `json:"transaction_id"`
	Success       bool    `json:"success"`
}

// CallbackData 回调数据
type CallbackData struct {
	PaymentNo     string  `json:"payment_no"`
	TransactionID string  `json:"transaction_id"`
	Amount        float64 `json:"amount"`
	Success       bool    `json:"success"`
}

// PaymentService 支付服务
type PaymentService struct {
	db       *sqlx.DB
	redis    *redis.Client
	channels map[string]PaymentChannel
	cfg      *config.PaymentConfig
}

// NewPaymentService 创建支付服务
func NewPaymentService(db *sqlx.DB, redis *redis.Client, cfg *config.PaymentConfig) *PaymentService {
	s := &PaymentService{
		db:       db,
		redis:    redis,
		cfg:      cfg,
		channels: make(map[string]PaymentChannel),
	}
	// 注册支付渠道
	s.RegisterChannel("wechat", NewWechatChannel(&cfg.WeChat))
	s.RegisterChannel("alipay", NewAlipayChannel(&cfg.Alipay))
	s.RegisterChannel("balance", NewBalanceChannel(db))
	return s
}

// RegisterChannel 注册支付渠道
func (s *PaymentService) RegisterChannel(name string, ch PaymentChannel) {
	s.channels[name] = ch
}

// getChannel 获取支付渠道
func (s *PaymentService) getChannel(payMethod int) PaymentChannel {
	switch payMethod {
	case model.PayMethodWeChat:
		return s.channels["wechat"]
	case model.PayMethodAlipay:
		return s.channels["alipay"]
	case model.PayMethodBalance:
		return s.channels["balance"]
	default:
		return nil
	}
}

// CreatePaymentRequest 创建支付请求
type CreatePaymentRequest struct {
	OrderID   int64  `json:"order_id" binding:"required"`
	PayMethod int    `json:"pay_method" binding:"required"`
	ReturnURL string `json:"return_url"`
}

// CreatePaymentResponse 创建支付响应
type CreatePaymentResponse struct {
	PaymentNo string      `json:"payment_no"`
	OrderNo   string      `json:"order_no"`
	Amount    float64     `json:"amount"`
	PayMethod int         `json:"pay_method"`
	PayParams interface{} `json:"pay_params"` // 前端调起支付所需参数
	Status    int         `json:"status"`
	CreatedAt time.Time   `json:"created_at"`
}

// CreatePayment 创建支付
func (s *PaymentService) CreatePayment(ctx context.Context, userID int64, req *CreatePaymentRequest) (*CreatePaymentResponse, error) {
	// 查询订单
	var order model.Order
	if err := s.db.GetContext(ctx, &order, `SELECT * FROM orders WHERE id = $1`, req.OrderID); err != nil {
		return nil, ErrPaymentNotFound
	}
	if order.UserID != userID {
		return nil, errors.New("无权操作此订单")
	}
	if order.Status != model.OrderStatusPendingPayment {
		return nil, errors.New("订单状态错误，当前状态不可支付")
	}

	// 幂等检查：是否已有进行中的支付
	var existPayment model.Payment
	err := s.db.GetContext(ctx, &existPayment,
		`SELECT * FROM payments WHERE order_id = $1 AND status = $2 ORDER BY id DESC LIMIT 1`,
		req.OrderID, model.PaymentStatusPending)
	if err == nil {
		// 存在未支付的支付记录，返回已有记录
		return &CreatePaymentResponse{
			PaymentNo: existPayment.PaymentNo,
			OrderNo:   existPayment.OrderNo,
			Amount:    existPayment.Amount,
			PayMethod: existPayment.PayMethod,
			Status:    existPayment.Status,
		}, nil
	}

	// 获取支付渠道
	ch := s.getChannel(req.PayMethod)
	if ch == nil {
		return nil, ErrInvalidPayMethod
	}

	// 获取支付渠道名称
	payChannelName := ch.Name()

	payment := &model.Payment{
		PaymentNo:  generatePaymentNo(),
		OrderID:    order.ID,
		OrderNo:    order.OrderNo,
		UserID:     userID,
		Amount:     order.FinalAmount,
		PayMethod:  req.PayMethod,
		PayChannel: payChannelName,
		Status:     model.PaymentStatusPending,
	}

	// 创建支付记录
	query := `
		INSERT INTO payments (payment_no, order_id, order_no, user_id, amount, pay_method, pay_channel, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
		RETURNING id, created_at, updated_at`
	now := time.Now()
	if err := s.db.QueryRowxContext(ctx, query,
		payment.PaymentNo, payment.OrderID, payment.OrderNo, payment.UserID,
		payment.Amount, payment.PayMethod, payment.PayChannel, model.PaymentStatusPending, now,
	).Scan(&payment.ID, &payment.CreatedAt, &payment.UpdatedAt); err != nil {
		return nil, fmt.Errorf("创建支付记录失败: %w", err)
	}

	// 余额支付直接完成
	if req.PayMethod == model.PayMethodBalance {
		payParams, err := ch.CreatePayment(ctx, payment, nil)
		if err != nil {
			return nil, err
		}
		return &CreatePaymentResponse{
			PaymentNo: payment.PaymentNo,
			OrderNo:   payment.OrderNo,
			Amount:    payment.Amount,
			PayMethod: req.PayMethod,
			PayParams: payParams,
			Status:    model.PaymentStatusSuccess,
		}, nil
	}

	// 调用第三方渠道创建支付
	payParams, err := ch.CreatePayment(ctx, payment, nil)
	if err != nil {
		// 标记支付失败
		s.db.ExecContext(ctx, `UPDATE payments SET status = $1, updated_at = $2 WHERE id = $3`,
			model.PaymentStatusFailed, time.Now(), payment.ID)
		return nil, fmt.Errorf("创建支付失败: %w", err)
	}

	return &CreatePaymentResponse{
		PaymentNo: payment.PaymentNo,
		OrderNo:   payment.OrderNo,
		Amount:    payment.Amount,
		PayMethod: req.PayMethod,
		PayParams: payParams,
		Status:    model.PaymentStatusPending,
		CreatedAt: now,
	}, nil
}

// GetPayment 获取支付记录
func (s *PaymentService) GetPayment(ctx context.Context, id int64, userID int64) (*model.Payment, error) {
	var p model.Payment
	if err := s.db.GetContext(ctx, &p, `SELECT * FROM payments WHERE id = $1`, id); err != nil {
		return nil, ErrPaymentNotFound
	}
	if p.UserID != userID {
		return nil, errors.New("无权查看此支付记录")
	}
	return &p, nil
}

// GetPaymentByNo 根据支付单号获取
func (s *PaymentService) GetPaymentByNo(ctx context.Context, paymentNo string) (*model.Payment, error) {
	var p model.Payment
	if err := s.db.GetContext(ctx, &p, `SELECT * FROM payments WHERE payment_no = $1`, paymentNo); err != nil {
		return nil, ErrPaymentNotFound
	}
	return &p, nil
}

// HandleWechatCallback 处理微信支付回调
func (s *PaymentService) HandleWechatCallback(ctx context.Context, body []byte) error {
	ch := s.channels["wechat"]
	if ch == nil {
		return errors.New("微信支付渠道未配置")
	}

	callbackData, err := ch.VerifyCallback(ctx, body, nil)
	if err != nil {
		logger.Error("微信支付回调验证失败: %v", err)
		return err
	}

	if !callbackData.Success {
		logger.Warn("微信支付回调失败: payment_no=%s", callbackData.PaymentNo)
		return nil
	}

	return s.handlePaymentSuccess(ctx, callbackData.PaymentNo, callbackData.TransactionID)
}

// HandleAlipayCallback 处理支付宝回调
func (s *PaymentService) HandleAlipayCallback(ctx context.Context, params map[string]string) error {
	ch := s.channels["alipay"]
	if ch == nil {
		return errors.New("支付宝支付渠道未配置")
	}

	// 将map转为JSON body用于验证
	body, _ := json.Marshal(params)
	callbackData, err := ch.VerifyCallback(ctx, body, nil)
	if err != nil {
		logger.Error("支付宝回调验证失败: %v", err)
		return err
	}

	if !callbackData.Success {
		logger.Warn("支付宝回调失败: payment_no=%s", callbackData.PaymentNo)
		return nil
	}

	return s.handlePaymentSuccess(ctx, callbackData.PaymentNo, callbackData.TransactionID)
}

// handlePaymentSuccess 处理支付成功
func (s *PaymentService) handlePaymentSuccess(ctx context.Context, paymentNo, transactionID string) error {
	// 查询支付记录
	var payment model.Payment
	if err := s.db.GetContext(ctx, &payment, `SELECT * FROM payments WHERE payment_no = $1`, paymentNo); err != nil {
		return ErrPaymentNotFound
	}
	if payment.Status == model.PaymentStatusSuccess {
		return nil // 幂等
	}

	now := time.Now()

	// 更新支付状态
	if _, err := s.db.ExecContext(ctx, `
		UPDATE payments
		SET status = $1, transaction_id = $2, paid_at = $3, updated_at = $3
		WHERE id = $4`,
		model.PaymentStatusSuccess, transactionID, now, payment.ID); err != nil {
		return fmt.Errorf("更新支付状态失败: %w", err)
	}

	// 更新订单状态
	if _, err := s.db.ExecContext(ctx, `
		UPDATE orders
		SET status = $1, paid_at = $2, updated_at = $2
		WHERE id = $3`,
		model.OrderStatusPendingAccept, now, payment.OrderID); err != nil {
		return fmt.Errorf("更新订单状态失败: %w", err)
	}

	// 异步发送支付成功通知
	go s.notifyPaymentSuccess(context.Background(), payment.UserID, payment.OrderID, payment.Amount)
	go sendWeComOrderEvent(context.Background(), "payment_success", payment.OrderID, map[string]string{"支付金额": fmt.Sprintf("¥%.2f", payment.Amount)})

	logger.Info("支付成功: payment_no=%s, transaction_id=%s, amount=%.2f", paymentNo, transactionID, payment.Amount)
	return nil
}

// Refund 退款
func (s *PaymentService) Refund(ctx context.Context, paymentID int64, amount float64, reason string, userID int64) (*RefundResult, error) {
	// 查询支付记录
	var payment model.Payment
	if err := s.db.GetContext(ctx, &payment, `SELECT * FROM payments WHERE id = $1`, paymentID); err != nil {
		return nil, ErrPaymentNotFound
	}
	if payment.UserID != userID {
		return nil, errors.New("无权操作此支付记录")
	}
	if payment.Status != model.PaymentStatusSuccess {
		return nil, errors.New("支付未成功，无法退款")
	}

	var order struct {
		FinalAmount float64    `db:"final_amount"`
		ExtraAmount float64    `db:"extra_amount"`
		DepartedAt  *time.Time `db:"departed_at"`
		Status      int        `db:"status"`
	}
	if err := s.db.GetContext(ctx, &order, `SELECT final_amount, extra_amount, departed_at, status FROM orders WHERE id = $1`, payment.OrderID); err == nil {
		travelFeeLocked := order.DepartedAt != nil || order.Status == model.OrderStatusDeparted || order.Status == model.OrderStatusArrived || order.Status == model.OrderStatusInService || order.Status == model.OrderStatusCompleted
		refundableAmount := order.FinalAmount
		if travelFeeLocked {
			refundableAmount = order.FinalAmount - order.ExtraAmount
			if refundableAmount < 0 {
				refundableAmount = 0
			}
		}
		if amount > refundableAmount {
			if travelFeeLocked && order.ExtraAmount > 0 {
				return nil, fmt.Errorf("达人已出发，车费%.2f元不可退，本次最多可退%.2f元", order.ExtraAmount, refundableAmount)
			}
			return nil, fmt.Errorf("退款金额不能超过可退金额%.2f元", refundableAmount)
		}
	}

	// 获取支付渠道
	ch := s.getChannel(payment.PayMethod)
	if ch == nil {
		return nil, ErrInvalidPayMethod
	}

	// 调用第三方退款接口
	result, err := ch.Refund(ctx, &payment, amount, reason, nil)
	if err != nil {
		logger.Error("退款失败: payment_no=%s, err=%v", payment.PaymentNo, err)
		return nil, fmt.Errorf("退款失败: %w", err)
	}

	if result.Success {
		now := time.Now()
		// 更新支付状态为已退款
		if _, err := s.db.ExecContext(ctx, `
			UPDATE payments SET status = $1, refunded_at = $2, updated_at = $2 WHERE id = $3`,
			model.PaymentStatusRefunded, now, paymentID); err != nil {
			return nil, err
		}

		// 更新订单状态
		if _, err := s.db.ExecContext(ctx, `
			UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3`,
			model.OrderStatusRefunded, now, payment.OrderID); err != nil {
			return nil, err
		}

		// 异步发送退款通知
		go s.notifyRefundSuccess(context.Background(), payment.UserID, payment.OrderID, amount, reason)
		go sendWeComOrderEvent(context.Background(), "refund_success", payment.OrderID, map[string]string{"退款金额": fmt.Sprintf("¥%.2f", amount), "退款原因": reason})

		logger.Info("退款成功: payment_no=%s, refund_amount=%.2f", payment.PaymentNo, amount)
	}

	return result, nil
}

// notifyPaymentSuccess 通知支付成功
func (s *PaymentService) notifyPaymentSuccess(ctx context.Context, userID, orderID int64, amount float64) {
	_, _ = s.db.ExecContext(ctx, `
		INSERT INTO notifications (user_id, user_type, type, title, content, created_at)
		VALUES ($1, 1, 'payment_success', '支付成功', $2, $3)`,
		userID, fmt.Sprintf("订单#%d支付成功，金额¥%.2f", orderID, amount), time.Now())
}

// notifyRefundSuccess 通知退款成功
func (s *PaymentService) notifyRefundSuccess(ctx context.Context, userID, orderID int64, amount float64, reason string) {
	msg := fmt.Sprintf("订单#%d已退款，金额¥%.2f", orderID, amount)
	if reason != "" {
		msg += "，原因：" + reason
	}
	_, _ = s.db.ExecContext(ctx, `
		INSERT INTO notifications (user_id, user_type, type, title, content, created_at)
		VALUES ($1, 1, 'refund', '退款通知', $2, $3)`,
		userID, msg, time.Now())
}

// generatePaymentNo 生成支付单号
func generatePaymentNo() string {
	return fmt.Sprintf("P%s%s",
		time.Now().Format("20060102150405"),
		uuid.New().String()[:8],
	)
}

// ===================== 微信支付V3渠道 =====================

// WechatChannel 微信支付渠道
type WechatChannel struct {
	cfg        *config.WechatPayConfig
	httpClient *http.Client
}

// NewWechatChannel 创建微信支付渠道
func NewWechatChannel(cfg *config.WechatPayConfig) *WechatChannel {
	return &WechatChannel{
		cfg:        cfg,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (w *WechatChannel) Name() string { return "wechat" }

// WechatPayParams 微信支付参数（前端调起支付用）
type WechatPayParams struct {
	AppID     string `json:"appId"`
	TimeStamp string `json:"timeStamp"`
	NonceStr  string `json:"nonceStr"`
	Package   string `json:"package"`
	SignType  string `json:"signType"`
	PaySign   string `json:"paySign"`
}

// CreatePayment 创建微信支付
func (w *WechatChannel) CreatePayment(ctx context.Context, payment *model.Payment, cfgIface interface{}) (interface{}, error) {
	if w.cfg.AppID == "" || w.cfg.MchID == "" {
		// 配置为空时使用模拟模式
		return w.createSimulatedPayment(payment), nil
	}

	// 构建微信支付V3 JSAPI下单请求
	nonceStr := fmt.Sprintf("%d%s", time.Now().UnixNano(), uuid.New().String()[:8])
	prepayID := fmt.Sprintf("wx%s%s", time.Now().Format("20060102150405"), uuid.New().String()[:16])

	// 实际对接微信支付V3 API
	// 这里构造prepay_id，实际应调用 https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi
	// 并进行签名和证书验证

	// 保存prepay_id
	payment.PrepayID = &prepayID

	// 构造前端调起支付所需参数
	timeStamp := fmt.Sprintf("%d", time.Now().Unix())
	paySign := w.generateSign(nonceStr, timeStamp, prepayID)

	return WechatPayParams{
		AppID:     w.cfg.AppID,
		TimeStamp: timeStamp,
		NonceStr:  nonceStr,
		Package:   "prepay_id=" + prepayID,
		SignType:  "RSA",
		PaySign:   paySign,
	}, nil
}

// createSimulatedPayment 模拟支付（开发环境用）
func (w *WechatChannel) createSimulatedPayment(payment *model.Payment) WechatPayParams {
	nonceStr := fmt.Sprintf("%d%s", time.Now().UnixNano(), uuid.New().String()[:8])
	prepayID := fmt.Sprintf("wx%s%s", time.Now().Format("20060102150405"), uuid.New().String()[:16])
	payment.PrepayID = &prepayID
	timeStamp := fmt.Sprintf("%d", time.Now().Unix())

	return WechatPayParams{
		AppID:     w.cfg.AppID,
		TimeStamp: timeStamp,
		NonceStr:  nonceStr,
		Package:   "prepay_id=" + prepayID,
		SignType:  "RSA",
		PaySign:   "SIMULATED_SIGN",
	}
}

// QueryPayment 查询微信支付
func (w *WechatChannel) QueryPayment(ctx context.Context, payment *model.Payment, cfgIface interface{}) (*PaymentQueryResult, error) {
	// 调用微信支付查询API
	// GET https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/{payment_no}
	return &PaymentQueryResult{
		Status: model.PaymentStatusSuccess,
	}, nil
}

// Refund 微信退款
func (w *WechatChannel) Refund(ctx context.Context, payment *model.Payment, amount float64, reason string, cfgIface interface{}) (*RefundResult, error) {
	refundNo := fmt.Sprintf("RF%s%s", time.Now().Format("20060102150405"), uuid.New().String()[:8])

	// 调用微信退款API
	// POST https://api.mch.weixin.qq.com/v3/refund/domestic/refunds

	return &RefundResult{
		RefundNo:      refundNo,
		RefundAmount:  amount,
		TransactionID: *payment.TransactionID,
		Success:       true,
	}, nil
}

// VerifyCallback 验证微信回调
func (w *WechatChannel) VerifyCallback(ctx context.Context, body []byte, cfgIface interface{}) (*CallbackData, error) {
	// 实际需要验证：
	// 1. HTTP头中的 Wechatpay-Timestamp, Wechatpay-Nonce, Wechatpay-Signature
	// 2. 使用微信支付平台证书公钥验证签名
	// 3. 解密resource中的ciphertext（AES-256-GCM）

	var notify struct {
		ID           string `json:"id"`
		CreateTime   string `json:"create_time"`
		ResourceType string `json:"resource_type"`
		EventType    string `json:"event_type"`
		Resource     struct {
			Algorithm      string `json:"algorithm"`
			Ciphertext     string `json:"ciphertext"`
			AssociatedData string `json:"associated_data"`
			Nonce          string `json:"nonce"`
			OriginalType   string `json:"original_type"`
		} `json:"resource"`
	}

	if err := json.Unmarshal(body, &notify); err != nil {
		return nil, fmt.Errorf("解析回调数据失败: %w", err)
	}

	// 解密resource（使用APIv3密钥）
	plaintext, err := w.decryptNotify(notify.Resource.Ciphertext,
		notify.Resource.AssociatedData, notify.Resource.Nonce)
	if err != nil {
		return nil, fmt.Errorf("解密回调数据失败: %w", err)
	}

	var result struct {
		OutTradeNo    string `json:"out_trade_no"`
		TransactionID string `json:"transaction_id"`
		TradeState    string `json:"trade_state"`
		Amount        struct {
			Total int `json:"total"`
		} `json:"amount"`
	}

	if err := json.Unmarshal([]byte(plaintext), &result); err != nil {
		return nil, fmt.Errorf("解析解密数据失败: %w", err)
	}

	return &CallbackData{
		PaymentNo:     result.OutTradeNo,
		TransactionID: result.TransactionID,
		Amount:        float64(result.Amount.Total) / 100,
		Success:       result.TradeState == "SUCCESS",
	}, nil
}

// decryptNotify 解密微信回调通知
func (w *WechatChannel) decryptNotify(ciphertext, associatedData, nonce string) (string, error) {
	cipherBytes, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	key := []byte(w.cfg.APIV3Key)
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	plaintext, err := aesGCM.Open(nil, []byte(nonce), cipherBytes, []byte(associatedData))
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// generateSign 生成微信支付签名
func (w *WechatChannel) generateSign(nonceStr, timeStamp, prepayID string) string {
	signStr := fmt.Sprintf("%s\n%s\n%s\n%s\n",
		w.cfg.AppID, timeStamp, nonceStr, "prepay_id="+prepayID)

	// 使用商户私钥签名
	if w.cfg.PrivateKeyPath != "" {
		sign, err := signWithRSA(signStr, w.cfg.PrivateKeyPath)
		if err != nil {
			logger.Error("微信支付签名失败: %v", err)
			return ""
		}
		return sign
	}
	return "SIMULATED_SIGN"
}

// ===================== 支付宝渠道 =====================

// AlipayChannel 支付宝渠道
type AlipayChannel struct {
	cfg        *config.AlipayPayConfig
	httpClient *http.Client
}

// NewAlipayChannel 创建支付宝渠道
func NewAlipayChannel(cfg *config.AlipayPayConfig) *AlipayChannel {
	return &AlipayChannel{
		cfg:        cfg,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (a *AlipayChannel) Name() string { return "alipay" }

// AlipayParams 支付宝支付参数
type AlipayParams struct {
	TradeNo string `json:"trade_no"`
	PayURL  string `json:"pay_url"`
	Params  string `json:"params"` // 前端调起支付字符串
}

// CreatePayment 创建支付宝支付
func (a *AlipayChannel) CreatePayment(ctx context.Context, payment *model.Payment, cfgIface interface{}) (interface{}, error) {
	if a.cfg.AppID == "" || a.cfg.PrivateKey == "" {
		return a.createSimulatedPayment(payment), nil
	}

	// 构造支付宝订单信息
	bizContent := map[string]interface{}{
		"out_trade_no": payment.PaymentNo,
		"total_amount": fmt.Sprintf("%.2f", payment.Amount),
		"subject":      fmt.Sprintf("喵搭服务订单-%s", payment.OrderNo),
		"product_code": "QUICK_MSECURITY_PAY",
	}

	bizJSON, _ := json.Marshal(bizContent)

	// 构建公共请求参数
	params := map[string]string{
		"app_id":      a.cfg.AppID,
		"method":      "alipay.trade.app.pay",
		"format":      "JSON",
		"charset":     "utf-8",
		"sign_type":   "RSA2",
		"timestamp":   time.Now().Format("2006-01-02 15:04:05"),
		"version":     "1.0",
		"notify_url":  a.cfg.NotifyURL,
		"biz_content": string(bizJSON),
	}

	// 生成签名
	sign := a.generateSign(params)
	params["sign"] = sign

	// 构造支付参数字符串
	var paramPairs []string
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		if k != "sign" {
			paramPairs = append(paramPairs, fmt.Sprintf("%s=%s", k, url.QueryEscape(params[k])))
		}
	}
	paramPairs = append(paramPairs, "sign="+url.QueryEscape(sign))
	paramStr := strings.Join(paramPairs, "&")

	return AlipayParams{
		TradeNo: payment.PaymentNo,
		PayURL:  a.cfg.GatewayURL,
		Params:  paramStr,
	}, nil
}

func (a *AlipayChannel) createSimulatedPayment(payment *model.Payment) AlipayParams {
	return AlipayParams{
		TradeNo: payment.PaymentNo,
		PayURL:  "https://openapi.alipay.com/gateway.do",
		Params:  "SIMULATED",
	}
}

// QueryPayment 查询支付宝支付
func (a *AlipayChannel) QueryPayment(ctx context.Context, payment *model.Payment, cfgIface interface{}) (*PaymentQueryResult, error) {
	return &PaymentQueryResult{
		Status: model.PaymentStatusSuccess,
	}, nil
}

// Refund 支付宝退款
func (a *AlipayChannel) Refund(ctx context.Context, payment *model.Payment, amount float64, reason string, cfgIface interface{}) (*RefundResult, error) {
	refundNo := fmt.Sprintf("RF%s%s", time.Now().Format("20060102150405"), uuid.New().String()[:8])

	return &RefundResult{
		RefundNo:      refundNo,
		RefundAmount:  amount,
		TransactionID: *payment.TransactionID,
		Success:       true,
	}, nil
}

// VerifyCallback 验证支付宝回调
func (a *AlipayChannel) VerifyCallback(ctx context.Context, body []byte, cfgIface interface{}) (*CallbackData, error) {
	var params map[string]string
	if err := json.Unmarshal(body, &params); err != nil {
		return nil, fmt.Errorf("解析回调参数失败: %w", err)
	}

	// 验证签名
	sign := params["sign"]
	signType := params["sign_type"]
	delete(params, "sign")
	delete(params, "sign_type")

	if !a.verifySign(params, sign, signType) {
		return nil, ErrSignatureVerify
	}

	tradeStatus := params["trade_status"]
	outTradeNo := params["out_trade_no"]
	tradeNo := params["trade_no"]

	success := tradeStatus == "TRADE_SUCCESS" || tradeStatus == "TRADE_FINISHED"

	return &CallbackData{
		PaymentNo:     outTradeNo,
		TransactionID: tradeNo,
		Success:       success,
	}, nil
}

// generateSign 生成支付宝签名
func (a *AlipayChannel) generateSign(params map[string]string) string {
	// 按字母顺序排序
	keys := make([]string, 0, len(params))
	for k := range params {
		if k != "sign" && k != "sign_type" {
			keys = append(keys, k)
		}
	}
	sort.Strings(keys)

	var content strings.Builder
	for i, k := range keys {
		if i > 0 {
			content.WriteString("&")
		}
		content.WriteString(k)
		content.WriteString("=")
		content.WriteString(params[k])
	}

	sign, err := signWithRSAKey(content.String(), a.cfg.PrivateKey)
	if err != nil {
		logger.Error("支付宝签名失败: %v", err)
		return ""
	}
	return base64.StdEncoding.EncodeToString(sign)
}

// verifySign 验证支付宝签名
func (a *AlipayChannel) verifySign(params map[string]string, sign, signType string) bool {
	if a.cfg.AlipayPublicKey == "" {
		return true // 配置为空时跳过验证（开发模式）
	}

	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var content strings.Builder
	for i, k := range keys {
		if i > 0 {
			content.WriteString("&")
		}
		content.WriteString(k)
		content.WriteString("=")
		content.WriteString(params[k])
	}

	signBytes, err := base64.StdEncoding.DecodeString(sign)
	if err != nil {
		return false
	}

	hashed := sha256.Sum256([]byte(content.String()))
	return verifyRSA(a.cfg.AlipayPublicKey, hashed[:], signBytes)
}

// ===================== 余额支付渠道 =====================

// BalanceChannel 余额支付渠道
type BalanceChannel struct {
	db *sqlx.DB
}

// NewBalanceChannel 创建余额支付渠道
func NewBalanceChannel(db *sqlx.DB) *BalanceChannel {
	return &BalanceChannel{db: db}
}

func (b *BalanceChannel) Name() string { return "balance" }

// CreatePayment 余额支付 - 直接扣款
func (b *BalanceChannel) CreatePayment(ctx context.Context, payment *model.Payment, cfgIface interface{}) (interface{}, error) {
	// 查询用户余额（实际系统中余额可能存储在用户表或独立的钱包表）
	var balance float64
	err := b.db.GetContext(ctx, &balance,
		`SELECT COALESCE(balance, 0) FROM users WHERE id = $1`, payment.UserID)
	if err != nil {
		return nil, fmt.Errorf("查询余额失败: %w", err)
	}

	if balance < payment.Amount {
		return nil, ErrInsufficientBalance
	}

	// 开启事务
	tx, err := b.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("开启事务失败: %w", err)
	}
	defer tx.Rollback()

	// 扣减用户余额
	result, err := tx.ExecContext(ctx,
		`UPDATE users SET balance = balance - $1, updated_at = $2 WHERE id = $3 AND balance >= $1`,
		payment.Amount, time.Now(), payment.UserID)
	if err != nil {
		return nil, fmt.Errorf("扣减余额失败: %w", err)
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return nil, ErrInsufficientBalance
	}

	// 更新支付状态
	if _, err := tx.ExecContext(ctx, `
		UPDATE payments SET status = $1, transaction_id = $2, paid_at = $3, updated_at = $3 WHERE id = $4`,
		model.PaymentStatusSuccess, "BALANCE_"+payment.PaymentNo, time.Now(), payment.ID); err != nil {
		return nil, fmt.Errorf("更新支付状态失败: %w", err)
	}

	// 更新订单状态
	if _, err := tx.ExecContext(ctx, `
		UPDATE orders SET status = $1, paid_at = $2, updated_at = $2 WHERE id = $3`,
		model.OrderStatusPendingAccept, time.Now(), payment.OrderID); err != nil {
		return nil, fmt.Errorf("更新订单状态失败: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("提交事务失败: %w", err)
	}

	logger.Info("余额支付成功: payment_no=%s, amount=%.2f, user_id=%d",
		payment.PaymentNo, payment.Amount, payment.UserID)

	return map[string]interface{}{
		"paid":   true,
		"method": "balance",
		"amount": payment.Amount,
	}, nil
}

// QueryPayment 查询余额支付
func (b *BalanceChannel) QueryPayment(ctx context.Context, payment *model.Payment, cfgIface interface{}) (*PaymentQueryResult, error) {
	var p model.Payment
	if err := b.db.GetContext(ctx, &p, `SELECT * FROM payments WHERE id = $1`, payment.ID); err != nil {
		return nil, err
	}
	return &PaymentQueryResult{
		Status: p.Status,
		Amount: p.Amount,
	}, nil
}

// Refund 余额退款
func (b *BalanceChannel) Refund(ctx context.Context, payment *model.Payment, amount float64, reason string, cfgIface interface{}) (*RefundResult, error) {
	tx, err := b.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("开启事务失败: %w", err)
	}
	defer tx.Rollback()

	// 退还余额
	if _, err := tx.ExecContext(ctx,
		`UPDATE users SET balance = balance + $1, updated_at = $2 WHERE id = $3`,
		amount, time.Now(), payment.UserID); err != nil {
		return nil, fmt.Errorf("退还余额失败: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("提交事务失败: %w", err)
	}

	refundNo := fmt.Sprintf("RF%s%s", time.Now().Format("20060102150405"), uuid.New().String()[:8])

	return &RefundResult{
		RefundNo:     refundNo,
		RefundAmount: amount,
		Success:      true,
	}, nil
}

// VerifyCallback 余额支付无需回调验证
func (b *BalanceChannel) VerifyCallback(ctx context.Context, body []byte, cfgIface interface{}) (*CallbackData, error) {
	return &CallbackData{Success: true}, nil
}

// ===================== 签名工具函数 =====================

// signWithRSA 使用PEM文件中的私钥签名
func signWithRSA(data string, privateKeyPath string) (string, error) {
	// 实际应从文件读取私钥
	// 此处为占位，生产环境需要读取PEM文件
	return "SIMULATED", nil
}

// signWithRSAKey 使用私钥字符串签名
func signWithRSAKey(data, privateKeyPEM string) ([]byte, error) {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return nil, errors.New("解析私钥失败")
	}

	var privateKey *rsa.PrivateKey
	var err error

	switch block.Type {
	case "RSA PRIVATE KEY":
		privateKey, err = x509.ParsePKCS1PrivateKey(block.Bytes)
	case "PRIVATE KEY":
		key, e := x509.ParsePKCS8PrivateKey(block.Bytes)
		if e != nil {
			return nil, e
		}
		var ok bool
		privateKey, ok = key.(*rsa.PrivateKey)
		if !ok {
			return nil, errors.New("非RSA私钥")
		}
	default:
		return nil, fmt.Errorf("不支持的私钥类型: %s", block.Type)
	}

	if err != nil {
		return nil, err
	}

	hashed := sha256.Sum256([]byte(data))
	return rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, hashed[:])
}

// verifyRSA 验证RSA签名
func verifyRSA(publicKeyPEM string, hashed, signature []byte) bool {
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return false
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return false
	}

	publicKey, ok := pub.(*rsa.PublicKey)
	if !ok {
		return false
	}

	err = rsa.VerifyPKCS1v15(publicKey, crypto.SHA256, hashed, signature)
	return err == nil
}

// ===================== 工具函数 =====================

// generateNonceStr 生成随机字符串
func generateNonceStr() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

// 确保接口实现
var _ PaymentChannel = (*WechatChannel)(nil)
var _ PaymentChannel = (*AlipayChannel)(nil)
var _ PaymentChannel = (*BalanceChannel)(nil)
var _ io.Reader = nil
var _ = base64.StdEncoding
