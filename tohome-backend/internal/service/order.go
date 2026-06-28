// Package service 业务逻辑层 - 订单服务
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/internal/repository"
	"github.com/miaoda/backend/pkg/database"
	"github.com/miaoda/backend/pkg/logger"
)

// 订单服务错误
var (
	ErrOrderNotFound    = errors.New("订单不存在")
	ErrOrderStatusError = errors.New("订单状态错误")
	ErrServiceNotFound  = errors.New("服务不存在")
	ErrTechnicianBusy   = errors.New("技师忙碌中")
)

// OrderService 订单服务
type OrderService struct {
	orderRepo  *repository.OrderRepository
	userRepo   *repository.UserRepository
	techRepo   *repository.TalentRepository
	svcRepo    *repository.ServiceRepository
	couponRepo *repository.CouponRepository
}

// NewOrderService 创建订单服务
func NewOrderService(orderRepo *repository.OrderRepository, userRepo *repository.UserRepository, techRepo *repository.TalentRepository, svcRepo *repository.ServiceRepository, couponRepo *repository.CouponRepository) *OrderService {
	return &OrderService{
		orderRepo:  orderRepo,
		userRepo:   userRepo,
		techRepo:   techRepo,
		svcRepo:    svcRepo,
		couponRepo: couponRepo,
	}
}

// CreateOrderRequest 创建订单请求
type CreateOrderRequest struct {
	ServiceID       int64      `json:"service_id" binding:"required"`
	SpecName        string     `json:"spec_name" binding:"required"`
	TechnicianID    *int64     `json:"technician_id"`
	AppointmentTime time.Time  `json:"appointment_time" binding:"required"`
	Address         model.JSON `json:"address" binding:"required"`
	ContactName     string     `json:"contact_name" binding:"required"`
	ContactPhone    string     `json:"contact_phone" binding:"required,len=11"`
	Quantity        int        `json:"quantity"`
	Remark          string     `json:"remark"`
	CouponID        *int64     `json:"coupon_id"`
}

// CreateOrder 创建订单
func (s *OrderService) CreateOrder(ctx context.Context, userID int64, req *CreateOrderRequest) (*model.Order, error) {
	// 获取服务信息
	service, err := s.svcRepo.GetByID(ctx, req.ServiceID)
	if err != nil {
		return nil, ErrServiceNotFound
	}

	// 获取用户信息
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		user = &model.User{
			BaseModel: model.BaseModel{ID: userID},
			Nickname:  req.ContactName,
			Phone:     req.ContactPhone,
			Status:    model.UserStatusNormal,
		}
	}

	// 查找服务规格
	var specPrice float64
	var specDuration int
	// service.Specs is model.JSON ([]byte) — unmarshal directly
	specsBytes := service.Specs
	var specs []model.ServiceSpec
	if len(specsBytes) > 0 {
		if err := json.Unmarshal(specsBytes, &specs); err != nil {
			return nil, fmt.Errorf("解析服务规格失败: %w", err)
		}
	}
	for _, spec := range specs {
		if spec.Name == req.SpecName {
			specPrice = spec.Price
			specDuration = spec.Duration
			break
		}
	}
	if specPrice == 0 {
		// 使用默认价格
		specPrice = service.BasePrice
		specDuration = 60
	}

	quantity := req.Quantity
	if quantity < 1 {
		quantity = 1
	}
	if specPrice > 0 && specPrice < 130 && quantity < 2 {
		quantity = 2
	}

	// 计算订单金额
	originalAmount := specPrice * float64(quantity)
	discountAmount := 0.0
	travelFee := computeTravelFeeForOrder(ctx, req.TechnicianID, []byte(req.Address))
	finalAmount := originalAmount

	// 应用优惠券：校验用户优惠券并计算折扣（不在此处直接消费券，消费在支付回调后执行）
	if req.CouponID != nil && s.couponRepo != nil {
		if uc, err := s.couponRepo.GetUserCoupon(ctx, user.ID, *req.CouponID); err == nil {
			// 状态 0 未使用
			if uc.Status == 0 && uc.ExpireAt.After(time.Now()) {
				if uc.Coupon == nil {
					if c, err := s.couponRepo.GetByID(ctx, uc.CouponID); err == nil {
						uc.Coupon = c
					}
				}
				if uc.Coupon != nil {
					discountAmount = CalculateDiscount(uc.Coupon, originalAmount)
					if discountAmount > originalAmount {
						discountAmount = originalAmount
					}
					finalAmount = originalAmount - discountAmount
				}
			}
		}
	}

	serviceName := service.Name
	if quantity > 1 {
		serviceName = fmt.Sprintf("%s*%d", service.Name, quantity)
	}
	var talentName *string
	var talentPhone *string
	if req.TechnicianID != nil && s.techRepo != nil {
		if talent, err := s.techRepo.GetByID(ctx, *req.TechnicianID); err == nil {
			talentName = &talent.RealName
			talentPhone = &talent.Phone
		}
	}

	// 创建订单
	order := &model.Order{
		OrderNo:         generateOrderNo(),
		UserID:          userID,
		UserName:        user.Nickname,
		UserPhone:       user.Phone,
		TalentID:        req.TechnicianID,
		TalentName:      talentName,
		TalentPhone:     talentPhone,
		ServiceID:       service.ID,
		ServiceName:     serviceName,
		ServiceSpec:     req.SpecName,
		ServiceDuration: specDuration,
		ServiceAddress:  req.Address,
		AppointmentTime: req.AppointmentTime,
		OriginalAmount:  originalAmount,
		DiscountAmount:  discountAmount,
		ExtraAmount:     travelFee,
		FinalAmount:     finalAmount + travelFee,
		CouponID:        req.CouponID,
		Remark:          &req.Remark,
	}

	if err := s.orderRepo.Create(ctx, order); err != nil {
		logger.Error("创建订单失败: %v", err)
		return nil, fmt.Errorf("创建订单失败: %w", err)
	}
	go sendWeComOrderEvent(context.Background(), "order_created", order.ID, nil)

	// 智能分配技师（如果没有指定）
	if req.TechnicianID == nil {
		go s.dispatchOrder(context.Background(), order)
	}

	return order, nil
}

// dispatchOrder 智能分配订单
func (s *OrderService) dispatchOrder(ctx context.Context, order *model.Order) {
	// 查找附近可用的技师
	technicians, err := s.techRepo.FindAvailable(ctx, order.AppointmentTime)
	if err != nil || len(technicians) == 0 {
		logger.Warn("未找到可用技师，订单: %s", order.OrderNo)
		go sendWeComOrderEvent(context.Background(), "dispatch_exception", order.ID, map[string]string{"异常原因": "未找到可用达人"})
		return
	}

	// 简单的分配策略：选择评分最高的技师
	var selectedTech *model.Talent
	for i := range technicians {
		tech := technicians[i]
		if tech.Status != model.TalentStatusNormal {
			continue
		}
		if selectedTech == nil || tech.Rating > selectedTech.Rating {
			selectedTech = &technicians[i]
		}
	}

	if selectedTech != nil {
		// 分配技师
		if err := s.orderRepo.AssignTechnician(ctx, order.ID, selectedTech.ID,
			selectedTech.RealName, selectedTech.Phone); err != nil {
			logger.Error("分配技师失败: %v", err)
			return
		}

		// 发送通知给技师
		go s.notifyTechnician(ctx, selectedTech.ID, order)

		// 发送通知给用户
		go s.notifyUser(ctx, order.UserID, "订单已被接单", fmt.Sprintf("技师%s已接单", selectedTech.RealName))
		go sendWeComOrderEvent(context.Background(), "talent_accepted", order.ID, map[string]string{"接单达人": selectedTech.RealName})
	} else {
		go sendWeComOrderEvent(context.Background(), "dispatch_exception", order.ID, map[string]string{"异常原因": "没有匹配到合适达人"})
	}
}

// GetOrderDetail 获取订单详情
func (s *OrderService) GetOrderDetail(ctx context.Context, id int64) (*model.Order, error) {
	return s.orderRepo.GetByID(ctx, id)
}

// ListPendingOrders 获取待接订单（暴露给 handler）
func (s *OrderService) ListPendingOrders(ctx context.Context, limit int) ([]model.Order, error) {
	return s.orderRepo.ListPendingOrders(ctx, limit)
}

// ListUserOrders 用户订单列表
func (s *OrderService) ListUserOrders(ctx context.Context, userID int64, status []int, page, pageSize int) ([]model.Order, int64, error) {
	return s.orderRepo.ListByUserID(ctx, userID, status, page, pageSize)
}

// CancelOrder 取消订单
func (s *OrderService) CancelOrder(ctx context.Context, id int64, userID int64, reason string) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return ErrOrderNotFound
	}

	if order.UserID != userID {
		return errors.New("无权操作此订单")
	}

	// 只能取消待支付或待接单状态
	if order.Status != model.OrderStatusPendingPayment && order.Status != model.OrderStatusPendingAccept {
		return ErrOrderStatusError
	}

	if err := s.orderRepo.UpdateCancel(ctx, id, reason, 1); err != nil {
		return err
	}
	go sendWeComOrderEvent(context.Background(), "order_cancelled", id, map[string]string{"取消原因": reason})
	return nil
}

// PayOrder 支付订单（由支付服务回调成功后调用）
func (s *OrderService) PayOrder(ctx context.Context, id int64) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return ErrOrderNotFound
	}

	if order.Status != model.OrderStatusPendingPayment {
		return ErrOrderStatusError
	}

	return s.orderRepo.MarkAsPaid(ctx, id)
}

// AcceptOrder 技师接单
func (s *OrderService) AcceptOrder(ctx context.Context, id int64, techID int64) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return ErrOrderNotFound
	}

	if order.Status != model.OrderStatusPendingAccept {
		return ErrOrderStatusError
	}

	tech, err := s.techRepo.GetByID(ctx, techID)
	if err != nil {
		return errors.New("技师不存在")
	}

	if err := s.orderRepo.AssignTechnician(ctx, id, techID, tech.RealName, tech.Phone); err != nil {
		return err
	}

	// 通知用户
	go s.notifyUser(ctx, order.UserID, "技师已接单", fmt.Sprintf("技师%s已接单，请耐心等待", tech.RealName))
	go sendWeComOrderEvent(context.Background(), "talent_accepted", id, map[string]string{"接单达人": tech.RealName})

	return nil
}

// UpdateOrderStatus 更新订单状态
func (s *OrderService) UpdateOrderStatus(ctx context.Context, id int64, techID int64, status int) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return ErrOrderNotFound
	}

	if order.TalentID == nil || *order.TalentID != techID {
		return errors.New("无权操作此订单")
	}

	if err := s.orderRepo.UpdateStatus(ctx, id, status); err != nil {
		return err
	}

	// 通知用户
	statusText := model.OrderStatusText[status]
	if statusText == "" {
		statusText = "状态更新"
	}
	go s.notifyUser(ctx, order.UserID, "订单状态更新", fmt.Sprintf("订单状态：%s", statusText))
	eventMap := map[int]string{
		model.OrderStatusDeparted:  "talent_departed",
		model.OrderStatusArrived:   "talent_arrived",
		model.OrderStatusInService: "service_started",
		model.OrderStatusCompleted: "service_completed",
		model.OrderStatusCancelled: "order_cancelled",
	}
	if event := eventMap[status]; event != "" {
		go sendWeComOrderEvent(context.Background(), event, id, nil)
	}
	if status == model.OrderStatusCompleted {
		go func(userID, orderID int64) {
			if err := ProcessInviteReward(context.Background(), userID, orderID); err != nil {
				logger.Error("处理邀请奖励失败: user_id=%d order_id=%d err=%v", userID, orderID, err)
			}
		}(order.UserID, id)
	}

	return nil
}

// RejectOrder 技师拒单
func (s *OrderService) RejectOrder(ctx context.Context, id int64, talentID int64, reason string) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return ErrOrderNotFound
	}

	if order.Status != model.OrderStatusPendingAccept {
		return ErrOrderStatusError
	}

	// 验证该订单已分配给此技师
	if order.TalentID == nil || *order.TalentID != talentID {
		return errors.New("无权操作此订单")
	}

	if err := s.orderRepo.UpdateCancel(ctx, id, reason, 2); err != nil {
		return err
	}

	// 通知用户
	go s.notifyUser(ctx, order.UserID, "技师拒绝接单", fmt.Sprintf("技师%s拒绝了订单%s", *order.TalentName, order.OrderNo))
	go sendWeComOrderEvent(context.Background(), "dispatch_exception", id, map[string]string{"异常原因": "达人拒单：" + reason})

	return nil
}

// GetCurrentOrder 获取技师当前订单
func (s *OrderService) GetCurrentOrder(ctx context.Context, talentID int64) (*model.Order, error) {
	return s.orderRepo.GetCurrentByTechnicianID(ctx, talentID)
}

// AdminListOrders 管理员订单列表
func (s *OrderService) AdminListOrders(ctx context.Context, status []int, page, pageSize int) ([]model.Order, int64, error) {
	return s.orderRepo.ListAll(ctx, status, page, pageSize)
}

// AdminAssignOrder 管理员分配订单给技师
func (s *OrderService) AdminAssignOrder(ctx context.Context, id int64, techID int64) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return ErrOrderNotFound
	}

	if order.Status != model.OrderStatusPendingAccept {
		return ErrOrderStatusError
	}

	tech, err := s.techRepo.GetByID(ctx, techID)
	if err != nil {
		return errors.New("技师不存在")
	}

	if tech.Status != model.TalentStatusNormal {
		return errors.New("技师状态异常")
	}

	if err := s.orderRepo.AssignTechnician(ctx, id, techID, tech.RealName, tech.Phone); err != nil {
		return err
	}

	// 通知技师
	go s.notifyTechnician(ctx, techID, order)

	// 通知用户
	go s.notifyUser(ctx, order.UserID, "订单已分配", fmt.Sprintf("技师%s已接单", tech.RealName))
	go sendWeComOrderEvent(context.Background(), "talent_accepted", id, map[string]string{"后台分配达人": tech.RealName})

	return nil
}

// RequestExtraTime 加时申请
func (s *OrderService) RequestExtraTime(ctx context.Context, id int64, talentID int64, extraMinutes int, extraAmount float64) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return ErrOrderNotFound
	}

	if order.TalentID == nil || *order.TalentID != talentID {
		return errors.New("无权操作此订单")
	}

	if order.Status != model.OrderStatusInService {
		return errors.New("当前状态不允许加时")
	}

	newFinalAmount := order.FinalAmount + extraAmount
	if err := s.orderRepo.UpdateExtraAmount(ctx, id, extraMinutes, extraAmount, newFinalAmount); err != nil {
		return err
	}

	// 通知用户加时费用
	go s.notifyUser(ctx, order.UserID, "加时费用提醒", fmt.Sprintf("您的订单%s已加时%d分钟，新增费用%.2f元", order.OrderNo, extraMinutes, extraAmount))

	return nil
}

// UpdateOrderFlowStatus 订单流程状态推进（带状态机校验和时间戳更新）
func (s *OrderService) UpdateOrderFlowStatus(ctx context.Context, orderID, talentID int64, targetStatus int) error {
	db := database.Database()

	// 读取当前订单
	var order model.Order
	if err := db.GetContext(ctx, &order, `SELECT * FROM orders WHERE id = $1`, orderID); err != nil {
		return fmt.Errorf("订单不存在")
	}

	// 确认是此达人的订单
	if order.TalentID == nil || *order.TalentID != talentID {
		return fmt.Errorf("无权操作此订单")
	}

	// 状态转换校验
	allowedMap := map[int][]int{
		2: {7}, // 已接单 -> 已出发
		7: {8}, // 已出发 -> 已到达
		8: {3}, // 已到达 -> 服务中
		3: {4}, // 服务中 -> 已完成
	}
	validTargets, ok := allowedMap[order.Status]
	if !ok {
		return fmt.Errorf("当前状态不可变更")
	}
	canTransition := false
	for _, t := range validTargets {
		if t == targetStatus {
			canTransition = true
			break
		}
	}
	if !canTransition {
		return fmt.Errorf("不允许从 %s 变更为 %s", model.OrderStatusText[order.Status], model.OrderStatusText[targetStatus])
	}

	// 更新状态和时间戳
	now := time.Now()
	var timeCol string
	switch targetStatus {
	case 7:
		timeCol = "departed_at"
	case 8:
		timeCol = "arrived_at"
	case 3:
		timeCol = "start_time"
	case 4:
		timeCol = "completed_at"
	}

	_, err := db.ExecContext(ctx, fmt.Sprintf(`UPDATE orders SET status = $1, %s = $2 WHERE id = $3`, timeCol), targetStatus, now, orderID)
	return err
}

// UpdateTalentLocation 更新技师位置（从订单上下文）
func (s *OrderService) UpdateTalentLocation(ctx context.Context, talentID int64, lat, lng float64) error {
	return s.techRepo.UpdateLocation(ctx, talentID, lat, lng)
}

// ReviewOrder 评价订单
func (s *OrderService) ReviewOrder(ctx context.Context, id int64, userID int64, rating int, content string, tags []string, images []string, isAnonymous bool) error {
	order, err := s.orderRepo.GetByID(ctx, id)
	if err != nil {
		return ErrOrderNotFound
	}

	if order.UserID != userID {
		return errors.New("无权操作此订单")
	}

	if order.Status != model.OrderStatusCompleted {
		return errors.New("订单未完成")
	}

	// 创建评价
	tagsJSON, _ := json.Marshal(tags)
	imagesJSON, _ := json.Marshal(images)

	review := &model.Review{
		OrderID:     order.ID,
		UserID:      order.UserID,
		UserName:    order.UserName,
		TalentID:    *order.TalentID,
		TalentName:  *order.TalentName,
		ServiceID:   order.ServiceID,
		ServiceName: order.ServiceName,
		Rating:      rating,
		Content:     content,
		Tags:        tagsJSON,
		Images:      imagesJSON,
		Status:      1,
	}
	if isAnonymous {
		review.IsAnonymous = 1
	}

	if _, err := database.DB.ExecContext(ctx, `
		INSERT INTO reviews (order_id, user_id, user_name, technician_id, technician_name, service_id, service_name, rating, content, tags, images, is_anonymous, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)`,
		review.OrderID, review.UserID, review.UserName, review.TalentID, review.TalentName,
		review.ServiceID, review.ServiceName, review.Rating, review.Content, review.Tags, review.Images,
		review.IsAnonymous, review.Status, time.Now()); err != nil {
		return err
	}

	// 更新技师评分
	go s.updateTechnicianRating(context.Background(), *order.TalentID)

	return nil
}

// updateTechnicianRating 更新技师评分
func (s *OrderService) updateTechnicianRating(ctx context.Context, techID int64) {
	var avgRating float64
	err := database.DB.GetContext(ctx, &avgRating,
		`SELECT COALESCE(AVG(rating::DECIMAL), 5.0) FROM reviews WHERE technician_id = $1`, techID)
	if err != nil {
		logger.Error("计算技师评分失败: %v", err)
		return
	}
	if _, err := database.DB.ExecContext(ctx,
		`UPDATE technicians SET rating = $1 WHERE id = $2`, avgRating, techID); err != nil {
		logger.Error("更新技师评分失败: %v", err)
	}
}

// notifyTechnician 通知技师
func (s *OrderService) notifyTechnician(ctx context.Context, techID int64, order *model.Order) {
	// 持久化通知
	notification := &model.Notification{
		UserID:   techID,
		UserType: 2,
		Type:     "order_assigned",
		Title:    "新订单提醒",
		Content:  stringPtr(fmt.Sprintf("您有新的订单：%s，%s", order.ServiceName, order.AppointmentTime.Format("2006-01-02 15:04"))),
	}
	if _, err := database.DB.ExecContext(ctx, `
		INSERT INTO notifications (user_id, user_type, type, title, content, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		notification.UserID, notification.UserType, notification.Type,
		notification.Title, notification.Content, time.Now()); err != nil {
		logger.Error("保存通知失败: %v", err)
	}

	// 通过 Redis 发布（若配置了 Redis）
	if database.RedisClient != nil {
		payload := fmt.Sprintf("{\"type\":\"%s\",\"order_no\":\"%s\"}", notification.Type, order.OrderNo)
		channel := fmt.Sprintf("notifications:technician:%d", techID)
		if err := database.RedisClient.Publish(ctx, channel, payload).Err(); err != nil {
			logger.Error("发布技师通知失败: %v", err)
		}
	} else {
		logger.Info("Redis 未配置，跳过发布技师通知: %s", order.OrderNo)
	}
}

// notifyUser 通知用户
func (s *OrderService) notifyUser(ctx context.Context, userID int64, title, content string) {
	if _, err := database.DB.ExecContext(ctx, `
		INSERT INTO notifications (user_id, user_type, type, title, content, created_at)
		VALUES ($1, 1, 'order_update', $2, $3, $4)`,
		userID, title, content, time.Now()); err != nil {
		logger.Error("保存通知失败: %v", err)
	}

	// 通过 Redis 发布（若配置了 Redis）
	if database.RedisClient != nil {
		payload := fmt.Sprintf("{\"type\":\"order_update\",\"title\":\"%s\"}", title)
		channel := fmt.Sprintf("notifications:user:%d", userID)
		if err := database.RedisClient.Publish(ctx, channel, payload).Err(); err != nil {
			logger.Error("发布用户通知失败: %v", err)
		}
	} else {
		logger.Info("Redis 未配置，跳过发布用户通知: %d", userID)
	}

}

func stringPtr(s string) *string {
	return &s
}

// generateOrderNo 生成订单号
func generateOrderNo() string {
	now := time.Now()
	return fmt.Sprintf("%s%s%s",
		now.Format("20060102150405"),
		uuid.New().String()[:8],
		"01",
	)
}
