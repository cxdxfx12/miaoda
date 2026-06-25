// Package service 业务逻辑层 - 调度服务（智能派单）
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/internal/repository"
	"github.com/miaoda/backend/pkg/database"
	"github.com/miaoda/backend/pkg/logger"
)

// DispatchService 调度服务
type DispatchService struct {
	orderRepo   *repository.OrderRepository
	talentRepo  *repository.TalentRepository
	redis       *redis.Client
	grabPoolSvc *GrabPoolService // 抢单池联动
	mu          sync.Mutex
}

// NewDispatchService 创建调度服务
func NewDispatchService(orderRepo *repository.OrderRepository, talentRepo *repository.TalentRepository, redis *redis.Client) *DispatchService {
	return &DispatchService{
		orderRepo:  orderRepo,
		talentRepo: talentRepo,
		redis:      redis,
	}
}

// SetGrabPoolService 设置抢单池服务引用
func (s *DispatchService) SetGrabPoolService(gps *GrabPoolService) {
	s.grabPoolSvc = gps
}

// --- 配置常量（可通过配置文件覆盖） ---

const (
	defaultMatchRadius       = 3000 // 默认匹配半径(米)
	defaultMaxConcurrent     = 3    // 达人最大同时接单数
	defaultTimeoutRetry      = 60   // 超时重试秒数（旧逻辑，派单后未接单重试）
	defaultScanInterval      = 10   // 扫描间隔秒数
	defaultGrabPoolTimeout   = 300  // 达人5分钟未接单，自动放入抢单池（秒）
	defaultGrabPoolScanSec   = 30   // 超时入池扫描间隔（秒）
)

// 权重配置
type dispatchWeights struct {
	Distance       float64
	Rating         float64
	CompletionRate float64
	ResponseTime   float64
}

var defaultWeights = dispatchWeights{
	Distance:       40,
	Rating:         30,
	CompletionRate: 20,
	ResponseTime:   10,
}

// --- Redis Key 前缀 ---

const (
	redisKeyDispatchLock    = "dispatch:lock:"
	redisKeyDispatchTimeout = "dispatch:timeout:"
	redisKeyTalentQueue     = "dispatch:talent_queue:"
	redisKeyTalentBusy      = "dispatch:talent_busy:"
)

// Start 启动调度器
func (s *DispatchService) Start(ctx context.Context) {
	logger.Info("调度服务启动")

	// 定时任务1: 每5分钟检查超时未支付订单
	go s.startPaymentTimeoutChecker(ctx)

	// 定时任务2: 每 N 秒扫描待派单订单
	go s.startAutoDispatch(ctx)

	// 定时任务3: 每30秒检查派单超时（旧逻辑：重新派单）
	go s.startTimeoutRetry(ctx)

	// 定时任务4: 每30秒检查达人5分钟未接单 → 放入抢单池
	go s.startGrabPoolTimeoutChecker(ctx)
}

// startPaymentTimeoutChecker 检查超时未支付订单
func (s *DispatchService) startPaymentTimeoutChecker(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if database.DB == nil {
				logger.Warn("数据库未初始化，无法检查超时未支付订单")
				continue
			}
			res, err := database.DB.ExecContext(ctx, `
				UPDATE orders SET status = $1, cancelled_at = $2, updated_at = $2
				WHERE status = $3 AND created_at < $4`,
				model.OrderStatusCancelled, time.Now(), model.OrderStatusPendingPayment, time.Now().Add(-30*time.Minute))
			if err != nil {
				logger.Error("取消超时未支付订单失败: %v", err)
				continue
			}
			if n, _ := res.RowsAffected(); n > 0 {
				logger.Info("取消 %d 个超时未支付订单", n)
			}
		}
	}
}

// startAutoDispatch 自动派单扫描器
func (s *DispatchService) startAutoDispatch(ctx context.Context) {
	ticker := time.NewTicker(time.Duration(defaultScanInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.autoDispatchPendingOrders(ctx)
		}
	}
}

// startTimeoutRetry 派单超时重试
func (s *DispatchService) startTimeoutRetry(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.retryTimeoutOrders(ctx)
		}
	}
}

// autoDispatchPendingOrders 扫描待派单订单并自动派单
func (s *DispatchService) autoDispatchPendingOrders(ctx context.Context) {
	orders, err := s.orderRepo.ListPendingOrders(ctx, 100)
	if err != nil {
		logger.Error("查询待派单订单失败: %v", err)
		return
	}

	if len(orders) == 0 {
		return
	}

	logger.Info("发现 %d 个待派单订单", len(orders))
	for i := range orders {
		order := orders[i]
		go func() {
			if err := s.DispatchOrder(ctx, &order); err != nil {
				logger.Error("自动派单失败 order=%s: %v", order.OrderNo, err)
			}
		}()
	}
}

// retryTimeoutOrders 重试超时的派单（旧逻辑：60s 超时重新派单）
func (s *DispatchService) retryTimeoutOrders(ctx context.Context) {
	if database.DB == nil {
		return
	}

	var orders []model.Order
	err := database.DB.SelectContext(ctx, &orders, `
		SELECT * FROM orders
		WHERE status = $1
		AND technician_id IS NOT NULL
		AND accepted_at IS NULL
		AND updated_at < $2
		LIMIT 50`,
		model.OrderStatusPendingAccept, time.Now().Add(-time.Duration(defaultTimeoutRetry)*time.Second))
	if err != nil {
		logger.Error("查询超时未接单订单失败: %v", err)
		return
	}

	for i := range orders {
		order := orders[i]
		go func() {
			// 清除原有分配
			_, _ = database.DB.ExecContext(ctx,
				`UPDATE orders SET technician_id = NULL, technician_name = NULL, technician_phone = NULL, updated_at = $1 WHERE id = $2`,
				time.Now(), order.ID)
			logger.Info("订单超时重新派单: %s", order.OrderNo)
			if err := s.DispatchOrder(ctx, &order); err != nil {
				logger.Error("重新派单失败 order=%s: %v", order.OrderNo, err)
			}
		}()
	}
}

// ==================== 5分钟超时未接单 → 入抢单池 ====================

// startGrabPoolTimeoutChecker 定时检查：达人被派单后 5 分钟内未接单，自动放入抢单池
func (s *DispatchService) startGrabPoolTimeoutChecker(ctx context.Context) {
	ticker := time.NewTicker(time.Duration(defaultGrabPoolScanSec) * time.Second)
	defer ticker.Stop()

	logger.Info("抢单池超时检查器启动 (5分钟未接单入池, 扫描间隔=%ds)", defaultGrabPoolScanSec)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.checkUnacceptedOrders(ctx)
		}
	}
}

// checkUnacceptedOrders 查询已派单但超过 5 分钟未接单的订单，放入抢单池
func (s *DispatchService) checkUnacceptedOrders(ctx context.Context) {
	if database.DB == nil {
		return
	}

	// 查询：已分配技师 但 技师未确认接单 且 分配时间超过 5 分钟
	var orders []model.Order
	cutoffTime := time.Now().Add(-time.Duration(defaultGrabPoolTimeout) * time.Second)
	err := database.DB.SelectContext(ctx, &orders, `
		SELECT * FROM orders
		WHERE status = $1
		AND technician_id IS NOT NULL
		AND technician_id > 0
		AND accepted_at IS NULL
		AND updated_at < $2
		ORDER BY updated_at ASC
		LIMIT 50`,
		model.OrderStatusPendingAccept, cutoffTime)
	if err != nil {
		logger.Error("查询5分钟超时未接单订单失败: %v", err)
		return
	}

	if len(orders) == 0 {
		return
	}

	logger.Info("发现 %d 个5分钟超时未接单的订单，准备放入抢单池", len(orders))

	for i := range orders {
		order := orders[i]
		go func(o model.Order) {
			logger.Info("订单 %s 已派单超5分钟达人未接单，清除分配并放入抢单池", o.OrderNo)

			// 1. 清除原有达人分配
			if _, err := database.DB.ExecContext(ctx,
				`UPDATE orders SET technician_id = NULL, technician_name = NULL, technician_phone = NULL, updated_at = $1 WHERE id = $2 AND accepted_at IS NULL`,
				time.Now(), o.ID); err != nil {
				logger.Error("清除订单 %s 达人分配失败: %v", o.OrderNo, err)
				return
			}

			// 2. 减少原达人的忙碌计数（如果此前已增加）
			if o.TalentID != nil && *o.TalentID > 0 {
				s.decrTalentBusyCount(ctx, *o.TalentID)
			}

			// 3. 放入抢单池
			if s.grabPoolSvc != nil {
				if err := s.grabPoolSvc.AddToPool(ctx, &o); err != nil {
					logger.Error("订单 %s 放入抢单池失败: %v", o.OrderNo, err)
					// 入池失败，尝试重新派单
					if err := s.DispatchOrder(ctx, &o); err != nil {
						logger.Error("订单 %s 重新派单也失败: %v", o.OrderNo, err)
					}
					return
				}
				logger.Info("订单 %s 已放入抢单池（达人5分钟未接单）", o.OrderNo)
			} else {
				// 抢单池服务未启用，走传统重新派单
				logger.Info("抢单池服务未启用，订单 %s 走传统重新派单", o.OrderNo)
				if err := s.DispatchOrder(ctx, &o); err != nil {
					logger.Error("重新派单失败 order=%s: %v", o.OrderNo, err)
				}
			}
		}(order)
	}
}

// DispatchOrder 智能派单 - 核心算法
func (s *DispatchService) DispatchOrder(ctx context.Context, order *model.Order) error {
	// 1. 获取分布式锁防止并发派单
	lockKey := redisKeyDispatchLock + order.OrderNo
	locked, err := s.redis.SetNX(ctx, lockKey, "1", 30*time.Second).Result()
	if err != nil || !locked {
		return nil // 其他实例正在处理
	}
	defer s.redis.Del(ctx, lockKey)

	// 2. 解析订单服务地址获取经纬度
	var addr model.Address
	if len(order.ServiceAddress) > 0 {
		if err := json.Unmarshal(order.ServiceAddress, &addr); err != nil {
			logger.Error("解析订单地址失败 order=%s: %v", order.OrderNo, err)
			return err
		}
	}
	if addr.Lat == 0 && addr.Lng == 0 {
		logger.Warn("订单无有效地址坐标 order=%s", order.OrderNo)
		return nil
	}

	// 3. 查找附近可用达人
	nearbyTalents, err := s.talentRepo.FindNearby(ctx, addr.Lat, addr.Lng, float64(defaultMatchRadius)/1000.0, 50)
	if err != nil {
		logger.Error("查找附近达人失败 order=%s: %v", order.OrderNo, err)
		return err
	}

	if len(nearbyTalents) == 0 {
		logger.Warn("未找到附近可用达人 order=%s，放入抢单池", order.OrderNo)
		// 放入抢单池
		if s.grabPoolSvc != nil {
			_ = s.grabPoolSvc.AddToPool(ctx, order)
		}
		return nil
	}

	// 4. 智能评分匹配
	type scoredTalent struct {
		talent *model.Talent
		score  float64
	}

	var candidates []scoredTalent
	for i := range nearbyTalents {
		t := nearbyTalents[i]

		// 检查并发接单数
		busyCount := s.getTalentBusyCount(ctx, t.ID)
		if busyCount >= defaultMaxConcurrent {
			continue
		}

		// 计算距离
		distance := haversineDistance(addr.Lat, addr.Lng, *t.CurrentLat, *t.CurrentLng)

		// 计算匹配分数
		score := s.calculateMatchScore(t, distance, order)
		candidates = append(candidates, scoredTalent{talent: &t, score: score})
	}

	if len(candidates) == 0 {
		logger.Warn("无符合条件的达人（忙碌或超出并发数） order=%s，放入抢单池", order.OrderNo)
		// 放入抢单池供其他达人主动抢
		if s.grabPoolSvc != nil {
			_ = s.grabPoolSvc.AddToPool(ctx, order)
		}
		return nil
	}

	// 5. 按分数降序排序，选最高分
	best := candidates[0]
	for _, c := range candidates[1:] {
		if c.score > best.score {
			best = c
		}
	}

	logger.Info("智能派单 order=%s talent=%d(%s) score=%.2f distance=%.0fm",
		order.OrderNo, best.talent.ID, best.talent.RealName, best.score,
		haversineDistance(addr.Lat, addr.Lng, *best.talent.CurrentLat, *best.talent.CurrentLng))

	// 6. 分配订单
	if err := s.orderRepo.AssignTechnician(ctx, order.ID, best.talent.ID, best.talent.RealName, best.talent.Phone); err != nil {
		logger.Error("分配技师失败 order=%s: %v", order.OrderNo, err)
		return err
	}

	// 7. 记录超时时间
	timeoutKey := redisKeyDispatchTimeout + order.OrderNo
	s.redis.Set(ctx, timeoutKey, best.talent.ID, time.Duration(defaultTimeoutRetry)*time.Second)

	// 8. 增加达人忙碌计数
	s.incrTalentBusyCount(ctx, best.talent.ID)

	// 9. 发送通知
	s.notifyTalentNewOrder(ctx, best.talent.ID, order)

	return nil
}

// calculateMatchScore 计算匹配分数
func (s *DispatchService) calculateMatchScore(talent model.Talent, distanceKm float64, order *model.Order) float64 {
	w := defaultWeights
	score := 0.0

	// 1. 距离评分 (0-5km:40, 5-10km:25, 10-15km:10, >15km:0)
	distanceScore := 0.0
	if distanceKm <= 5 {
		distanceScore = w.Distance
	} else if distanceKm <= 10 {
		distanceScore = w.Distance * 0.625 // 25/40
	} else if distanceKm <= 15 {
		distanceScore = w.Distance * 0.25 // 10/40
	}
	score += distanceScore

	// 2. 评分 (5星:30, 4星:20, 3星:10)
	ratingScore := 0.0
	if talent.Rating >= 4.5 {
		ratingScore = w.Rating
	} else if talent.Rating >= 3.5 {
		ratingScore = w.Rating * 0.667 // 20/30
	} else if talent.Rating >= 2.5 {
		ratingScore = w.Rating * 0.333 // 10/30
	}
	score += ratingScore

	// 3. 完成率 (>90%:20, 70-90%:10)
	completionScore := 0.0
	if talent.PositiveRate >= 0.9 {
		completionScore = w.CompletionRate
	} else if talent.PositiveRate >= 0.7 {
		completionScore = w.CompletionRate * 0.5 // 10/20
	}
	score += completionScore

	// 4. 响应速度（基于服务数量粗略估算，越多越有经验）
	responseScore := 0.0
	if talent.ServiceCount > 100 {
		responseScore = w.ResponseTime
	} else if talent.ServiceCount > 50 {
		responseScore = w.ResponseTime * 0.7
	} else if talent.ServiceCount > 20 {
		responseScore = w.ResponseTime * 0.4
	} else {
		responseScore = w.ResponseTime * 0.2
	}
	score += responseScore

	// 5. 服务类型匹配加分（+10）
	if s.isServiceTypeMatch(talent, order.ServiceID) {
		score += 10
	}

	return score
}

// isServiceTypeMatch 检查达人技能是否匹配订单服务
func (s *DispatchService) isServiceTypeMatch(talent model.Talent, serviceID int64) bool {
	if len(talent.Skills) == 0 {
		return false
	}
	var skills []int64
	if err := json.Unmarshal(talent.Skills, &skills); err != nil {
		return false
	}
	for _, skillID := range skills {
		if skillID == serviceID {
			return true
		}
	}
	return false
}

// getTalentBusyCount 获取达人当前并发接单数
func (s *DispatchService) getTalentBusyCount(ctx context.Context, talentID int64) int {
	key := redisKeyTalentBusy + fmt.Sprintf("%d", talentID)
	val, err := s.redis.Get(ctx, key).Int()
	if err != nil {
		return 0
	}
	return val
}

// incrTalentBusyCount 增加达人忙碌计数
func (s *DispatchService) incrTalentBusyCount(ctx context.Context, talentID int64) {
	key := redisKeyTalentBusy + fmt.Sprintf("%d", talentID)
	s.redis.Incr(ctx, key)
	s.redis.Expire(ctx, key, 24*time.Hour)
}

// decrTalentBusyCount 减少达人忙碌计数
func (s *DispatchService) decrTalentBusyCount(ctx context.Context, talentID int64) {
	key := redisKeyTalentBusy + fmt.Sprintf("%d", talentID)
	s.redis.Decr(ctx, key)
}

// ManualAssign 手动指定达人
func (s *DispatchService) ManualAssign(ctx context.Context, orderID, talentID int64) error {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return fmt.Errorf("订单不存在: %w", err)
	}

	if order.Status != model.OrderStatusPendingAccept {
		return fmt.Errorf("订单状态不允许派单")
	}

	talent, err := s.talentRepo.GetByID(ctx, talentID)
	if err != nil {
		return fmt.Errorf("达人不存在: %w", err)
	}

	if talent.Status != model.TalentStatusNormal {
		return fmt.Errorf("达人状态异常")
	}

	if err := s.orderRepo.AssignTechnician(ctx, orderID, talentID, talent.RealName, talent.Phone); err != nil {
		return err
	}

	// 通知达人
	s.notifyTalentNewOrder(ctx, talentID, order)

	logger.Info("手动派单成功 order=%s talent=%d(%s)", order.OrderNo, talentID, talent.RealName)
	return nil
}

// GetPendingOrders 获取待派单订单列表
func (s *DispatchService) GetPendingOrders(ctx context.Context, page, pageSize int) ([]model.Order, int64, error) {
	return s.orderRepo.ListByUserID(ctx, 0, []int{model.OrderStatusPendingAccept}, page, pageSize)
}

// GetAvailableTalents 获取可派达人列表（附带匹配分数）
func (s *DispatchService) GetAvailableTalents(ctx context.Context, orderID int64) ([]map[string]interface{}, error) {
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		return nil, fmt.Errorf("订单不存在: %w", err)
	}

	var addr model.Address
	if len(order.ServiceAddress) > 0 {
		if err := json.Unmarshal(order.ServiceAddress, &addr); err != nil {
			return nil, fmt.Errorf("解析订单地址失败: %w", err)
		}
	}

	nearbyTalents, err := s.talentRepo.FindNearby(ctx, addr.Lat, addr.Lng, float64(defaultMatchRadius)/1000.0, 50)
	if err != nil {
		return nil, err
	}

	var result []map[string]interface{}
	for _, t := range nearbyTalents {
		distance := 0.0
		if t.CurrentLat != nil && t.CurrentLng != nil {
			distance = haversineDistance(addr.Lat, addr.Lng, *t.CurrentLat, *t.CurrentLng)
		}
		score := s.calculateMatchScore(t, distance, order)
		busyCount := s.getTalentBusyCount(ctx, t.ID)

		result = append(result, map[string]interface{}{
			"id":          t.ID,
			"real_name":   t.RealName,
			"phone":       t.Phone,
			"rating":      t.Rating,
			"service_count": t.ServiceCount,
			"distance_km":  math.Round(distance*100) / 100,
			"match_score":  math.Round(score*100) / 100,
			"busy_count":   busyCount,
			"max_concurrent": defaultMaxConcurrent,
		})
	}

	return result, nil
}

// GetDispatchStats 获取派单统计
func (s *DispatchService) GetDispatchStats(ctx context.Context) (map[string]interface{}, error) {
	if database.DB == nil {
		return nil, fmt.Errorf("数据库未初始化")
	}

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// 今日派单总数
	var todayAssigned int64
	database.DB.GetContext(ctx, &todayAssigned,
		`SELECT COUNT(*) FROM orders WHERE technician_id IS NOT NULL AND updated_at >= $1`, todayStart)

	// 待派单数量
	var pendingCount int64
	database.DB.GetContext(ctx, &pendingCount,
		`SELECT COUNT(*) FROM orders WHERE status = $1`, model.OrderStatusPendingAccept)

	// 今日完成订单
	var completedToday int64
	database.DB.GetContext(ctx, &completedToday,
		`SELECT COUNT(*) FROM orders WHERE status = $1 AND completed_at >= $2`,
		model.OrderStatusCompleted, todayStart)

	// 今日取消订单
	var cancelledToday int64
	database.DB.GetContext(ctx, &cancelledToday,
		`SELECT COUNT(*) FROM orders WHERE status = $1 AND cancelled_at >= $2`,
		model.OrderStatusCancelled, todayStart)

	return map[string]interface{}{
		"today_assigned":   todayAssigned,
		"pending_count":    pendingCount,
		"completed_today":  completedToday,
		"cancelled_today":  cancelledToday,
	}, nil
}

// notifyTalentNewOrder 通知达人有新订单
func (s *DispatchService) notifyTalentNewOrder(ctx context.Context, talentID int64, order *model.Order) {
	title := "新订单提醒"
	content := fmt.Sprintf("您有新的订单：%s，预约时间：%s", order.ServiceName, order.AppointmentTime.Format("2006-01-02 15:04"))

	if database.DB == nil {
		return
	}

	if _, err := database.DB.ExecContext(ctx, `
		INSERT INTO notifications (user_id, user_type, type, title, content, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		talentID, 2, "order_assigned", title, content, time.Now()); err != nil {
		logger.Error("保存达人通知失败: %v", err)
	}

	if database.RedisClient != nil {
		payload := fmt.Sprintf(`{"type":"order_assigned","order_no":"%s"}`, order.OrderNo)
		channel := fmt.Sprintf("notifications:technician:%d", talentID)
		database.RedisClient.Publish(ctx, channel, payload)
	}
}

// haversineDistance 计算两点间的距离（米）
func haversineDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371000 // 地球半径（米）

	dLat := (lat2 - lat1) * math.Pi / 180
	dLng := (lng2 - lng1) * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLng/2)*math.Sin(dLng/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}
