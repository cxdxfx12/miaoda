// Package service 抢单池服务
// 当自动派单无合适达人时，订单进入抢单池，供在线达人主动抢单
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/internal/repository"
	"github.com/miaoda/backend/pkg/logger"
)

// ==== 抢单池常量 ====

const (
	// GrabPoolOrderTTL 池中订单存活时间（秒）—— 超时自动下架
	GrabPoolOrderTTL = 30 * 60 // 30 分钟

	// GrabLockTTL 抢单锁持有时间（秒）—— 防止并发抢同一单
	GrabLockTTL = 5

	// MaxGrabConcurrent 达人最大同时抢单数（含已抢到的）
	MaxGrabConcurrent = 3

	// GrabPoolScanInterval 池清理扫描间隔（秒）
	GrabPoolScanInterval = 60

	// MaxPoolSize 池容量上限
	MaxPoolSize = 200
)

// Redis Key 前缀
const (
	prefixGrabPoolOrders = "grab_pool:orders"       // ZSET: score=放入时间戳, member=order_id
	prefixGrabPoolData   = "grab_pool:data:"         // HASH: 订单简要信息缓存
	prefixGrabLock       = "grab_pool:lock:"         // STRING: 抢单分布式锁
	prefixGrabDailyCount = "grab_pool:daily:grab:"   // STRING: 达人当日抢单计数
	prefixGrabResult     = "grab_pool:result:"       // STRING: 抢单结果通知 (TTL 短)
)

// GrabPoolOrder 池中订单摘要（Redis 缓存用）
type GrabPoolOrder struct {
	OrderID          int64   `json:"order_id"`
	OrderNo          string  `json:"order_no"`
	ServiceName      string  `json:"service_name"`
	ServiceImage     string  `json:"service_image"`
	Duration         int     `json:"duration"`          // 服务时长（分钟）
	TotalAmount      float64 `json:"total_amount"`      // 订单金额
	TalentIncome     float64 `json:"talent_income"`     // 达人预估收入
	Address          string  `json:"address"`           // 服务地址描述
	Lat              float64 `json:"lat"`
	Lng              float64 `json:"lng"`
	City             string  `json:"city"`
	District         string  `json:"district"`
	AppointmentTime  string  `json:"appointment_time"`  // 预约时间
	DistanceKm       float64 `json:"distance_km"`       // 距当前达人的距离（动态计算）
	UrgencyLevel     int     `json:"urgency_level"`     // 紧急度 0普通 1较急 2紧急
	CustomerGender   int     `json:"customer_gender"`   // 客户性别
	CustomerNickname string  `json:"customer_nickname"` // 客户昵称（脱敏）
	EnteredAt        int64   `json:"entered_at"`        // 入池时间戳
	ExpireAt         int64   `json:"expire_at"`         // 过期时间戳
	RemainingSec     int64   `json:"remaining_sec"`     // 剩余秒数（动态计算）
	PoolPosition     int     `json:"pool_position"`     // 池中位置
}

// GrabResult 抢单结果
type GrabResult struct {
	Success  bool   `json:"success"`
	OrderNo  string `json:"order_no,omitempty"`
	Message  string `json:"message"`
	Reason   string `json:"reason,omitempty"` // 失败原因
	TalentID int64  `json:"talent_id,omitempty"`
}

// GrabStats 达人抢单统计
type GrabStats struct {
	PoolTotal      int64   `json:"pool_total"`       // 池中总订单数
	NearbyCount    int64   `json:"nearby_count"`      // 附近可抢订单数
	TodayGrab      int64   `json:"today_grab"`        // 今日抢单次数
	TodaySuccess   int64   `json:"today_success"`     // 今日抢单成功
	SuccessRate    float64 `json:"success_rate"`      // 抢单成功率
	TotalIncome    float64 `json:"total_income"`      // 今日抢单预估收入
	MaxGrabCount   int64   `json:"max_grab_count"`    // 最大抢单次数
	RemainingGrab  int64   `json:"remaining_grab"`    // 剩余可抢次数
}

// ==================== GrabPoolService ====================

// GrabPoolService 抢单池服务
type GrabPoolService struct {
	orderRepo  *repository.OrderRepository
	talentRepo *repository.TalentRepository
	redis      *redis.Client
	mu         sync.RWMutex
	stopCh     chan struct{}
}

// NewGrabPoolService 创建抢单池服务
func NewGrabPoolService(
	orderRepo *repository.OrderRepository,
	talentRepo *repository.TalentRepository,
	redis *redis.Client,
) *GrabPoolService {
	return &GrabPoolService{
		orderRepo:  orderRepo,
		talentRepo: talentRepo,
		redis:      redis,
		stopCh:     make(chan struct{}),
	}
}

// Start 启动抢单池后台任务
func (s *GrabPoolService) Start(ctx context.Context) {
	logger.Info("抢单池服务启动")
	// 定期清理过期订单
	go s.cleanExpiredOrders(ctx)
}

// Stop 停止后台任务
func (s *GrabPoolService) Stop() {
	close(s.stopCh)
}

// ==================== 入池 / 出池 ====================

// AddToPool 将订单放入抢单池
// 当自动派单未找到合适达人时调用
func (s *GrabPoolService) AddToPool(ctx context.Context, order *model.Order) error {
	if s.redis == nil {
		return fmt.Errorf("redis 未初始化")
	}

	// 检查池容量
	total, _ := s.redis.ZCard(ctx, prefixGrabPoolOrders).Result()
	if total >= MaxPoolSize {
		logger.Warn("抢单池已满 (%d)，新订单暂不入池: %s", MaxPoolSize, order.OrderNo)
		return fmt.Errorf("抢单池已满，请稍后")
	}

	// 检查是否已在池中
	_, err := s.redis.ZScore(ctx, prefixGrabPoolOrders, strconv.FormatInt(order.ID, 10)).Result()
	if err == nil {
		return fmt.Errorf("订单已在抢单池中")
	}

	// 构建订单摘要
	now := time.Now()

	// 解析地址获取城市和坐标
	var addr model.Address
	var city, district, addrStr string
	var lat, lng float64
	if len(order.ServiceAddress) > 0 {
		if err := json.Unmarshal(order.ServiceAddress, &addr); err == nil {
			city = addr.City
			district = addr.District
			lat = addr.Lat
			lng = addr.Lng
			addrStr = addr.Detail
			if addr.District != "" {
				addrStr = addr.District + addr.Detail
			}
		}
	}

	poolOrder := GrabPoolOrder{
		OrderID:          order.ID,
		OrderNo:          order.OrderNo,
		ServiceName:      order.ServiceName,
		Duration:         order.ServiceDuration,
		TotalAmount:      order.FinalAmount,
		TalentIncome:     order.FinalAmount * 0.8, // 达人拿 80%
		Address:          addrStr,
		Lat:              lat,
		Lng:              lng,
		City:             city,
		District:         district,
		AppointmentTime:  order.AppointmentTime.Format(time.RFC3339),
		CustomerNickname: maskNickname(order.UserName),
		EnteredAt:        now.Unix(),
		ExpireAt:         now.Add(time.Duration(GrabPoolOrderTTL) * time.Second).Unix(),
	}

	// 紧急度 判断：临近预约时间 <1h 为紧急，<2h 为较急
	untilAppointment := order.AppointmentTime.Sub(now)
	if untilAppointment < time.Hour {
		poolOrder.UrgencyLevel = 2
	} else if untilAppointment < 2*time.Hour {
		poolOrder.UrgencyLevel = 1
	}

	// 序列化存入 Redis
	data, err := json.Marshal(poolOrder)
	if err != nil {
		return fmt.Errorf("序列化失败: %w", err)
	}

	pipe := s.redis.Pipeline()
	// ZSET: score=入池时间戳（用于排序）
	pipe.ZAdd(ctx, prefixGrabPoolOrders, redis.Z{
		Score:  float64(now.Unix()),
		Member: strconv.FormatInt(order.ID, 10),
	})
	// HASH: 订单详情缓存
	pipe.HSet(ctx, prefixGrabPoolData+strconv.FormatInt(order.ID, 10), "data", string(data))
	pipe.Expire(ctx, prefixGrabPoolData+strconv.FormatInt(order.ID, 10), time.Duration(GrabPoolOrderTTL)*time.Second)

	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("Redis 写入失败: %w", err)
	}

	logger.Info("订单进入抢单池: %s (金额:%.2f 预约:%s)", order.OrderNo, order.FinalAmount, order.AppointmentTime.Format("15:04"))
	return nil
}

// RemoveFromPool 从抢单池移除订单
func (s *GrabPoolService) RemoveFromPool(ctx context.Context, orderID int64) error {
	if s.redis == nil {
		return nil
	}
	oid := strconv.FormatInt(orderID, 10)
	pipe := s.redis.Pipeline()
	pipe.ZRem(ctx, prefixGrabPoolOrders, oid)
	pipe.Del(ctx, prefixGrabPoolData+oid)
	pipe.Del(ctx, prefixGrabLock+oid)
	if _, err := pipe.Exec(ctx); err != nil {
		return err
	}
	logger.Info("订单移出抢单池: %d", orderID)
	return nil
}

// cleanExpiredOrders 定期清理过期订单
func (s *GrabPoolService) cleanExpiredOrders(ctx context.Context) {
	ticker := time.NewTicker(time.Duration(GrabPoolScanInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-s.stopCh:
			return
		case <-ticker.C:
			s.doClean(ctx)
		}
	}
}

func (s *GrabPoolService) doClean(ctx context.Context) {
	if s.redis == nil {
		return
	}
	now := time.Now().Unix()
	cutoff := now - GrabPoolOrderTTL

	// 获取过期的订单 ID
	ids, err := s.redis.ZRangeByScore(ctx, prefixGrabPoolOrders, &redis.ZRangeBy{
		Min: "0",
		Max: strconv.FormatInt(cutoff, 10),
	}).Result()
	if err != nil || len(ids) == 0 {
		return
	}

	pipe := s.redis.Pipeline()
	for _, id := range ids {
		pipe.ZRem(ctx, prefixGrabPoolOrders, id)
		pipe.Del(ctx, prefixGrabPoolData+id)
	}
	if _, err := pipe.Exec(ctx); err != nil {
		logger.Error("清理过期抢单失败: %v", err)
		return
	}
	logger.Info("抢单池清理 %d 个过期订单", len(ids))
}

// ==================== 抢单核心 ====================

// GrabOrder 达人对订单发起抢单
// 返回抢单结果：成功则直接分配，失败则返回原因
func (s *GrabPoolService) GrabOrder(ctx context.Context, talentID int64, orderID int64) (*GrabResult, error) {
	result := &GrabResult{
		TalentID: talentID,
	}

	// 1. 检查抢单池中订单是否存在
	oid := strconv.FormatInt(orderID, 10)
	_, err := s.redis.ZScore(ctx, prefixGrabPoolOrders, oid).Result()
	if err != nil {
		result.Reason = "订单已不在抢单池中，可能已被抢走或过期"
		return result, nil
	}

	// 2. 获取分布式锁（原子操作，先到先得）
	lockKey := prefixGrabLock + oid
	locked, err := s.redis.SetNX(ctx, lockKey, strconv.FormatInt(talentID, 10), time.Duration(GrabLockTTL)*time.Second).Result()
	if err != nil {
		return nil, fmt.Errorf("抢单锁获取失败: %w", err)
	}
	if !locked {
		// 检查是谁抢到的
		winner, _ := s.redis.Get(ctx, lockKey).Result()
		result.Reason = "手慢了一步，该订单已被其他达人抢走"
		if winnerID, _ := strconv.ParseInt(winner, 10, 64); winnerID == talentID {
			result.Success = true
			result.Message = "你已经抢到该订单"
			result.Reason = ""
			return result, nil
		}
		return result, nil
	}

	// 3. 获取锁成功后，验证达人资格
	talent, err := s.talentRepo.GetByID(ctx, talentID)
	if err != nil {
		s.releaseLock(ctx, oid)
		result.Reason = "达人信息获取失败"
		return result, nil
	}

	if talent.Status != model.TalentStatusNormal {
		s.releaseLock(ctx, oid)
		result.Reason = "账户状态异常，无法抢单"
		return result, nil
	}

	if talent.WorkStatus != 1 {
		s.releaseLock(ctx, oid)
		result.Reason = "当前未开启接单，请先切换为接单中"
		return result, nil
	}

	// 4. 检查并发接单数
	busyCount := s.getTalentBusyCount(ctx, talentID)
	if busyCount >= MaxGrabConcurrent {
		s.releaseLock(ctx, oid)
		result.Reason = fmt.Sprintf("当前已有 %d 个进行中的订单，无法再接新单", busyCount)
		return result, nil
	}

	// 5. 获取订单真实数据
	order, err := s.orderRepo.GetByID(ctx, orderID)
	if err != nil {
		s.releaseLock(ctx, oid)
		result.Reason = "订单信息获取失败"
		return result, nil
	}

	if order.Status != model.OrderStatusPendingAccept {
		s.releaseLock(ctx, oid)
		result.Reason = "订单状态已变更，无法抢单"
		return result, nil
	}

	// 6. 分配订单给达人
	orderNo := order.OrderNo
	if err := s.orderRepo.AssignTechnician(ctx, orderID, talentID, talent.RealName, talent.Phone); err != nil {
		s.releaseLock(ctx, oid)
		result.Reason = "订单分配失败"
		return result, nil
	}

	// 7. 从抢单池移除
	s.RemoveFromPool(ctx, orderID)

	// 8. 更新达人抢单计数
	s.incrTalentBusyCount(ctx, talentID)
	s.incrDailyGrabCount(ctx, talentID)

	// 9. 通知达人
	s.notifyTalentNewOrder(ctx, talentID, order)

	result.Success = true
	result.OrderNo = orderNo
	result.Message = "抢单成功！"

	logger.Info("抢单成功 talent=%d order=%s 金额=%.2f", talentID, orderNo, order.FinalAmount)
	return result, nil
}

// releaseLock 释放抢单锁
func (s *GrabPoolService) releaseLock(ctx context.Context, orderID string) {
	s.redis.Del(ctx, prefixGrabLock+orderID)
}

// ==================== 池列表查询 ====================

// ListPoolOrders 获取达人可见的抢单池订单
// 按距离排序，返回最近的 N 条
func (s *GrabPoolService) ListPoolOrders(ctx context.Context, talentID int64, lat, lng float64, filter string, page, pageSize int) ([]GrabPoolOrder, int64, *GrabStats, error) {
	if s.redis == nil {
		return nil, 0, nil, fmt.Errorf("redis 未初始化")
	}

	talent, err := s.talentRepo.GetByID(ctx, talentID)
	if err != nil {
		return nil, 0, nil, fmt.Errorf("达人信息获取失败: %w", err)
	}

	// 获取池中所有订单 ID（按入池时间倒序）
	ids, err := s.redis.ZRevRange(ctx, prefixGrabPoolOrders, 0, -1).Result()
	if err != nil {
		return nil, 0, nil, fmt.Errorf("获取池订单列表失败: %w", err)
	}

	now := time.Now().Unix()
	var allOrders []GrabPoolOrder

	// 解析每个订单数据
	for _, idStr := range ids {
		data, err := s.redis.HGet(ctx, prefixGrabPoolData+idStr, "data").Result()
		if err != nil {
			continue
		}

		var po GrabPoolOrder
		if err := json.Unmarshal([]byte(data), &po); err != nil {
			continue
		}

		// 检查是否过期
		if now > po.ExpireAt {
			continue
		}

		// 计算距离
		if po.Lat != 0 && po.Lng != 0 && lat != 0 && lng != 0 {
			po.DistanceKm = math.Round(haversineDistanceKm(lat, lng, po.Lat, po.Lng)*100) / 100
		}

		// 计算剩余时间
		po.RemainingSec = po.ExpireAt - now
		if po.RemainingSec < 0 {
			po.RemainingSec = 0
		}

		allOrders = append(allOrders, po)
	}

	// 按过滤器排序
	switch filter {
	case "nearest":
		sort.Slice(allOrders, func(i, j int) bool {
			return allOrders[i].DistanceKm < allOrders[j].DistanceKm
		})
	case "highest":
		sort.Slice(allOrders, func(i, j int) bool {
			return allOrders[i].TotalAmount > allOrders[j].TotalAmount
		})
	case "urgent":
		sort.Slice(allOrders, func(i, j int) bool {
			if allOrders[i].UrgencyLevel != allOrders[j].UrgencyLevel {
				return allOrders[i].UrgencyLevel > allOrders[j].UrgencyLevel
			}
			return allOrders[i].RemainingSec < allOrders[j].RemainingSec
		})
	default: // latest
		// ZRevRange 已经是时间倒序
	}

	total := int64(len(allOrders))

	// 分页
	start := (page - 1) * pageSize
	if start >= len(allOrders) {
		allOrders = nil
	} else {
		end := start + pageSize
		if end > len(allOrders) {
			end = len(allOrders)
		}
		allOrders = allOrders[start:end]
	}

	// 标注池中位置
	for i := range allOrders {
		allOrders[i].PoolPosition = start + i + 1
	}

	// 构建统计
	stats := s.buildGrabStats(ctx, talentID, talent)

	return allOrders, total, stats, nil
}

// ==================== 统计 ====================

// GetGrabStats 获取达人抢单统计
func (s *GrabPoolService) GetGrabStats(ctx context.Context, talentID int64) (*GrabStats, error) {
	talent, err := s.talentRepo.GetByID(ctx, talentID)
	if err != nil {
		return nil, fmt.Errorf("获取达人信息失败: %w", err)
	}
	return s.buildGrabStats(ctx, talentID, talent), nil
}

func (s *GrabPoolService) buildGrabStats(ctx context.Context, talentID int64, talent *model.Talent) *GrabStats {
	todayKey := prefixGrabDailyCount + time.Now().Format("2006-01-02")

	poolTotal, _ := s.redis.ZCard(ctx, prefixGrabPoolOrders).Result()
	dailyCount, _ := s.redis.HGet(ctx, todayKey, strconv.FormatInt(talentID, 10)).Int64()

	stats := &GrabStats{
		PoolTotal:     poolTotal,
		TodayGrab:     dailyCount,
		MaxGrabCount:  MaxGrabConcurrent,
		RemainingGrab: MaxGrabConcurrent - int64(s.getTalentBusyCount(ctx, talentID)),
		NearbyCount:   poolTotal,
	}

	return stats
}

// incrDailyGrabCount 增加达人每日抢单计数
func (s *GrabPoolService) incrDailyGrabCount(ctx context.Context, talentID int64) {
	todayKey := prefixGrabDailyCount + time.Now().Format("2006-01-02")
	s.redis.HIncrBy(ctx, todayKey, strconv.FormatInt(talentID, 10), 1)
	s.redis.Expire(ctx, todayKey, 48*time.Hour)
}

// ==================== 管理后台接口 ====================

// AdminGetPoolOverview 管理后台抢单池概览
func (s *GrabPoolService) AdminGetPoolOverview(ctx context.Context) (map[string]interface{}, error) {
	if s.redis == nil {
		return nil, fmt.Errorf("redis 未初始化")
	}

	total, _ := s.redis.ZCard(ctx, prefixGrabPoolOrders).Result()

	// 获取紧急订单数
	var urgentCount int64
	ids, _ := s.redis.ZRevRange(ctx, prefixGrabPoolOrders, 0, -1).Result()
	for _, idStr := range ids {
		data, err := s.redis.HGet(ctx, prefixGrabPoolData+idStr, "data").Result()
		if err != nil {
			continue
		}
		var po GrabPoolOrder
		if json.Unmarshal([]byte(data), &po) == nil && po.UrgencyLevel == 2 {
			urgentCount++
		}
	}

	// 今日抢单次数（汇总所有达人 Redis 计数）
	now := time.Now()
	todayKey := prefixGrabDailyCount + now.Format("2006-01-02")
	allCounts, _ := s.redis.HGetAll(ctx, todayKey).Result()
	var todayGrab int64
	for _, v := range allCounts {
		if c, err := strconv.ParseInt(v, 10, 64); err == nil {
			todayGrab += c
		}
	}

	return map[string]interface{}{
		"pool_total":     total,
		"urgent_count":   urgentCount,
		"today_grab":     todayGrab,
		"max_pool_size":  MaxPoolSize,
		"order_ttl_min":  GrabPoolOrderTTL / 60,
	}, nil
}

// AdminForceRemove 管理后台强制移除池中订单
func (s *GrabPoolService) AdminForceRemove(ctx context.Context, orderID int64, reason string) error {
	if err := s.RemoveFromPool(ctx, orderID); err != nil {
		return err
	}
	logger.Info("管理员强制移除抢单池订单 %d: %s", orderID, reason)
	return nil
}

// notifyTalentNewOrder 通过 Redis Pub/Sub 通知达人有新订单
func (s *GrabPoolService) notifyTalentNewOrder(ctx context.Context, talentID int64, order *model.Order) {
	if s.redis == nil {
		return
	}
	payload := fmt.Sprintf(`{"type":"order_grabbed","order_no":"%s","order_id":%d,"service":"%s","amount":%.2f}`,
		order.OrderNo, order.ID, order.ServiceName, order.FinalAmount)
	channel := fmt.Sprintf("notifications:technician:%d", talentID)
	if err := s.redis.Publish(ctx, channel, payload).Err(); err != nil {
		logger.Error("抢单通知发布失败 talent=%d: %v", talentID, err)
		return
	}
	logger.Info("抢单通知已发送 talent=%d order=%s", talentID, order.OrderNo)
}

// ==================== 达人忙碌计数 ====================

// getTalentBusyCount 获取达人当前并发接单数（复用 dispatch 的 Redis key）
func (s *GrabPoolService) getTalentBusyCount(ctx context.Context, talentID int64) int {
	if s.redis == nil {
		return 0
	}
	key := "dispatch:talent_busy:" + strconv.FormatInt(talentID, 10)
	val, err := s.redis.Get(ctx, key).Int()
	if err != nil {
		return 0
	}
	return val
}

// incrTalentBusyCount 增加达人忙碌计数
func (s *GrabPoolService) incrTalentBusyCount(ctx context.Context, talentID int64) {
	if s.redis == nil {
		return
	}
	key := "dispatch:talent_busy:" + strconv.FormatInt(talentID, 10)
	s.redis.Incr(ctx, key)
	s.redis.Expire(ctx, key, 24*time.Hour)
}

// ==================== 工具函数 ====================

// maskNickname 昵称脱敏
func maskNickname(name string) string {
	if name == "" {
		return "***"
	}
	runes := []rune(name)
	if len(runes) <= 1 {
		return string(runes[0]) + "**"
	}
	return string(runes[0]) + "**" + string(runes[len(runes)-1])
}

// haversineDistanceKm 计算两点间距离（公里）
func haversineDistanceKm(lat1, lng1, lat2, lng2 float64) float64 {
	return haversineDistance(lat1, lng1, lat2, lng2) / 1000.0
}


