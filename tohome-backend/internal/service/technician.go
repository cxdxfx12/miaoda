// Package service 业务逻辑层 - 达人服务
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/internal/repository"
	"github.com/miaoda/backend/pkg/database"
	"github.com/miaoda/backend/pkg/logger"
)

// 达人服务错误
var (
	ErrTalentNotFound    = errors.New("达人不存在")
	ErrProfileIncomplete = errors.New("达人资料不完善")
)

// TalentService 达人服务
type TalentService struct {
	talentRepo *repository.TalentRepository
	orderRepo  *repository.OrderRepository
}

// NewTalentService 创建达人服务
func NewTalentService(talentRepo *repository.TalentRepository, orderRepo *repository.OrderRepository) *TalentService {
	return &TalentService{
		talentRepo: talentRepo,
		orderRepo:  orderRepo,
	}
}

// FindNearby 附近达人
func (s *TalentService) FindNearby(ctx context.Context, lat, lng, radius float64, limit int) ([]model.Talent, error) {
	if limit <= 0 {
		limit = 100
	}
	if limit > 200 {
		limit = 200
	}
	return s.talentRepo.FindNearby(ctx, lat, lng, radius, limit)
}

// GetDetail 达人详情
func (s *TalentService) GetDetail(ctx context.Context, id int64) (*model.Talent, error) {
	return s.talentRepo.GetByID(ctx, id)
}

// GetByUserID 根据用户ID获取
func (s *TalentService) GetByUserID(ctx context.Context, userID int64) (*model.Talent, error) {
	return s.talentRepo.GetByUserID(ctx, userID)
}

// GetReviews 达人评价
func (s *TalentService) GetReviews(ctx context.Context, talentID int64, page, pageSize int) ([]model.Review, int64, error) {
	var reviews []model.Review
	var total int64

	// TODO: 使用review repository
	// 临时实现
	return reviews, total, nil
}

// UpdateWorkStatus 更新工作状态
func (s *TalentService) UpdateWorkStatus(ctx context.Context, userID int64, status int) error {
	talent, err := s.talentRepo.GetByUserID(ctx, userID)
	if err != nil {
		return ErrTalentNotFound
	}
	return s.talentRepo.UpdateWorkStatus(ctx, talent.ID, status)
}

// UpdateLocation 更新位置
func (s *TalentService) UpdateLocation(ctx context.Context, userID int64, lat, lng float64) error {
	talent, err := s.talentRepo.GetByUserID(ctx, userID)
	if err != nil {
		return ErrTalentNotFound
	}
	return s.talentRepo.UpdateLocation(ctx, talent.ID, lat, lng)
}

// GetIncomeStatistics 收入统计
func (s *TalentService) GetIncomeStatistics(ctx context.Context, userID int64, startTime, endTime time.Time) (map[string]interface{}, error) {
	talent, err := s.talentRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, ErrTalentNotFound
	}
	return s.talentRepo.GetIncomeStatistics(ctx, talent.ID, startTime, endTime)
}

// GetIncomeRecords 收入明细
func (s *TalentService) GetIncomeRecords(ctx context.Context, userID int64, page, pageSize int) ([]model.Order, int64, error) {
	talent, err := s.talentRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, 0, ErrTalentNotFound
	}
	return s.orderRepo.ListByTechnicianID(ctx, talent.ID, []int{model.OrderStatusCompleted}, page, pageSize)
}

// RequestWithdraw 申请提现
func (s *TalentService) RequestWithdraw(ctx context.Context, userID int64, amount float64, bankName, bankAccount, accountName string) error {
	talent, err := s.talentRepo.GetByUserID(ctx, userID)
	if err != nil {
		return ErrTalentNotFound
	}
	if amount <= 0 || amount > talent.Balance {
		return errors.New("提现金额无效")
	}

	// 创建提现记录
	withdraw := &model.Withdraw{
		WithdrawNo:  "W" + time.Now().Format("20060102150405"),
		TalentID:    talent.ID,
		Amount:      amount,
		BankName:    bankName,
		BankAccount: bankAccount,
		AccountName: accountName,
		Status:      model.WithdrawStatusPending,
	}

	// 写入提现记录到数据库（简单实现）
	if database.DB == nil {
		return errors.New("数据库未初始化")
	}
	_, err = database.DB.ExecContext(ctx, `
		INSERT INTO withdraws (withdraw_no, technician_id, amount, bank_name, bank_account, account_name, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
		withdraw.WithdrawNo, withdraw.TalentID, withdraw.Amount, withdraw.BankName, withdraw.BankAccount, withdraw.AccountName, withdraw.Status, time.Now())
	if err != nil {
		logger.Error("创建提现记录失败: %v", err)
		return err
	}
	return nil
}

// GetPendingOrderCount 待处理订单数
func (s *TalentService) GetPendingOrderCount(ctx context.Context, userID int64) (int, error) {
	if database.DB == nil {
		return 0, errors.New("数据库未初始化")
	}
	talent, err := s.talentRepo.GetByUserID(ctx, userID)
	if err != nil {
		return 0, ErrTalentNotFound
	}
	var count int
	if err := database.DB.GetContext(ctx, &count, `SELECT COUNT(*) FROM orders WHERE technician_id = $1 AND status IN ($2, $3)`, talent.ID, model.OrderStatusPendingAccept, model.OrderStatusAccepted); err != nil {
		return 0, err
	}
	return count, nil
}

// UpdateProfile 更新达人资料
func (s *TalentService) UpdateProfile(ctx context.Context, userID int64, req *UpdateProfileRequest) error {
	talent, err := s.talentRepo.GetByUserID(ctx, userID)
	if err != nil {
		return ErrTalentNotFound
	}

	// 只更新允许修改的字段
	if req.Avatar != "" {
		talent.Avatar = req.Avatar
	}
	if req.Introduction != "" {
		talent.Introduction = req.Introduction
	}
	if req.EmergencyContact != "" {
		talent.EmergencyContact = req.EmergencyContact
	}
	if req.EmergencyPhone != "" {
		talent.EmergencyPhone = req.EmergencyPhone
	}
	if len(req.Skills) > 0 {
		skillsJSON, _ := json.Marshal(req.Skills)
		talent.Skills = skillsJSON
	}
	if len(req.ServiceDistricts) > 0 {
		districtsJSON, _ := json.Marshal(req.ServiceDistricts)
		talent.ServiceDistricts = districtsJSON
	}

	return s.talentRepo.Update(ctx, talent)
}

// UpdateProfileRequest 更新资料请求
type UpdateProfileRequest struct {
	Avatar           string   `json:"avatar"`
	Introduction     string   `json:"introduction"`
	EmergencyContact string   `json:"emergency_contact"`
	EmergencyPhone   string   `json:"emergency_phone"`
	Skills           []int64  `json:"skills"`
	ServiceDistricts []string `json:"service_districts"`
}

// ========== 达人入驻申请 ==========

// ApplyTalentRequest 达人入驻申请请求
type ApplyTalentRequest struct {
	RealName         string   `json:"real_name" binding:"required"`
	IDCard           string   `json:"id_card" binding:"required"`
	Gender           int      `json:"gender" binding:"required"`
	Birthday         string   `json:"birthday" binding:"required"`
	Avatar           string   `json:"avatar"`
	Phone            string   `json:"phone" binding:"required"`
	EmergencyContact string   `json:"emergency_contact"`
	EmergencyPhone   string   `json:"emergency_phone"`
	Skills           []int64  `json:"skills" binding:"required"`
	Certificates     []string `json:"certificates"`
	LifePhotos       []string `json:"life_photos"`
	ArtPhotos        []string `json:"art_photos"`
	ServiceCity      string   `json:"service_city" binding:"required"`
	ServiceDistricts []string `json:"service_districts" binding:"required"`
	Introduction     string   `json:"introduction"`
}

// Apply 达人入驻申请
func (s *TalentService) Apply(ctx context.Context, userID int64, req *ApplyTalentRequest) error {
	// 检查是否已申请
	existing, err := s.talentRepo.GetByUserID(ctx, userID)
	if err == nil && existing != nil {
		if existing.Status == model.TalentStatusPending {
			return errors.New("您的申请正在审核中")
		}
		if existing.Status == model.TalentStatusNormal {
			return errors.New("您已经是认证达人了")
		}
	}

	// 非必填字段（生日）
	var birthday *time.Time
	if req.Birthday != "" {
		t, err := time.Parse("2006-01-02", req.Birthday)
		if err == nil {
			birthday = &t
		}
	}

	skillsJSON, _ := json.Marshal(req.Skills)
	certsJSON, _ := json.Marshal(req.Certificates)
	lifePhotosJSON, _ := json.Marshal(req.LifePhotos)
	artPhotosJSON, _ := json.Marshal(req.ArtPhotos)
	districtsJSON, _ := json.Marshal(req.ServiceDistricts)

	talent := &model.Talent{
		UserID:           userID,
		RealName:         req.RealName,
		IDCard:           req.IDCard,
		Gender:           req.Gender,
		Birthday:         birthday,
		Avatar:           req.Avatar,
		Phone:            req.Phone,
		EmergencyContact: req.EmergencyContact,
		EmergencyPhone:   req.EmergencyPhone,
		Skills:           skillsJSON,
		Certificates:     certsJSON,
		LifePhotos:       lifePhotosJSON,
		ArtPhotos:        artPhotosJSON,
		ServiceCity:      req.ServiceCity,
		ServiceDistricts: districtsJSON,
		Introduction:     req.Introduction,
	}

	return s.talentRepo.Create(ctx, talent)
}

// ========== 管理后台方法 ==========

// AdminList 管理员达人列表
func (s *TalentService) AdminList(ctx context.Context, page, pageSize, status int, keyword string) ([]model.Talent, int64, error) {
	var statusFilter *int
	if status >= 0 {
		statusFilter = &status
	}
	return s.talentRepo.List(ctx, statusFilter, keyword, page, pageSize)
}

// AdminGetDetail 管理员获取达人详情
func (s *TalentService) AdminGetDetail(ctx context.Context, id int64) (*model.Talent, error) {
	return s.talentRepo.GetByID(ctx, id)
}

// AdminCreateTalentRequest 管理员创建达人请求
type AdminCreateTalentRequest struct {
	RealName         string   `json:"real_name"`
	Phone            string   `json:"phone"`
	Gender           int      `json:"gender"`
	Birthday         string   `json:"birthday"`
	IDCard           string   `json:"id_card"`
	Avatar           string   `json:"avatar"`
	LifePhotos       []string `json:"life_photos"`
	ArtPhotos        []string `json:"art_photos"`
	Skills           []int64  `json:"skills"`
	Certificates     []string `json:"certificates"`
	ServiceCity      string   `json:"service_city"`
	ServiceDistricts []string `json:"service_districts"`
	EmergencyContact string   `json:"emergency_contact"`
	EmergencyPhone   string   `json:"emergency_phone"`
	Introduction     string   `json:"introduction"`
	AutoApprove      bool     `json:"auto_approve"` // 是否自动通过审核
}

// AdminCreate 管理员创建达人
func (s *TalentService) AdminCreate(ctx context.Context, req *AdminCreateTalentRequest) (*model.Talent, error) {
	// 检查手机号是否重复
	existing, err := s.talentRepo.GetByPhone(ctx, req.Phone)
	if err == nil && existing != nil {
		return nil, errors.New("该手机号已注册为达人")
	}

	var birthday *time.Time
	if req.Birthday != "" {
		t, err := time.Parse("2006-01-02", req.Birthday)
		if err == nil {
			birthday = &t
		}
	}

	skillsJSON, _ := json.Marshal(req.Skills)
	certsJSON, _ := json.Marshal(req.Certificates)
	districtsJSON, _ := json.Marshal(req.ServiceDistricts)
	lifeJSON, _ := json.Marshal(req.LifePhotos)
	artJSON, _ := json.Marshal(req.ArtPhotos)

	talent := &model.Talent{
		UserID:           0, // 管理员创建时暂不关联用户
		RealName:         req.RealName,
		IDCard:           req.IDCard,
		Gender:           req.Gender,
		Birthday:         birthday,
		Avatar:           req.Avatar,
		Phone:            req.Phone,
		EmergencyContact: req.EmergencyContact,
		EmergencyPhone:   req.EmergencyPhone,
		Skills:           skillsJSON,
		Certificates:     certsJSON,
		LifePhotos:       lifeJSON,
		ArtPhotos:        artJSON,
		ServiceCity:      req.ServiceCity,
		ServiceDistricts: districtsJSON,
		Introduction:     req.Introduction,
	}

	if err := s.talentRepo.Create(ctx, talent); err != nil {
		return nil, fmt.Errorf("创建达人失败: %w", err)
	}

	// 如果自动通过审核
	if req.AutoApprove {
		if err := s.talentRepo.Approve(ctx, talent.ID); err != nil {
			logger.Warn("自动审核通过失败: %v", err)
		} else {
			talent.Status = model.TalentStatusNormal
		}
	}

	logger.Info("管理员创建达人成功: id=%d name=%s auto_approve=%v", talent.ID, req.RealName, req.AutoApprove)
	return talent, nil
}

// AdminUpdate 管理员更新达人
func (s *TalentService) AdminUpdate(ctx context.Context, id int64, req *AdminCreateTalentRequest) (*model.Talent, error) {
	talent, err := s.talentRepo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrTalentNotFound
	}

	if req.RealName != "" {
		talent.RealName = req.RealName
	}
	if req.Phone != "" {
		talent.Phone = req.Phone
	}
	if req.Gender != 0 {
		talent.Gender = req.Gender
	}
	if req.Birthday != "" {
		t, err2 := time.Parse("2006-01-02", req.Birthday)
		if err2 == nil {
			talent.Birthday = &t
		}
	}
	if req.IDCard != "" {
		talent.IDCard = req.IDCard
	}
	if req.Avatar != "" {
		talent.Avatar = req.Avatar
	}
	if req.ServiceCity != "" {
		talent.ServiceCity = req.ServiceCity
	}
	if req.EmergencyContact != "" {
		talent.EmergencyContact = req.EmergencyContact
	}
	if req.EmergencyPhone != "" {
		talent.EmergencyPhone = req.EmergencyPhone
	}
	if req.Introduction != "" {
		talent.Introduction = req.Introduction
	}

	// JSON 字段
	if req.Skills != nil {
		skillsJSON, _ := json.Marshal(req.Skills)
		talent.Skills = skillsJSON
	}
	if req.Certificates != nil {
		certsJSON, _ := json.Marshal(req.Certificates)
		talent.Certificates = certsJSON
	}
	if req.ServiceDistricts != nil {
		districtsJSON, _ := json.Marshal(req.ServiceDistricts)
		talent.ServiceDistricts = districtsJSON
	}
	if req.LifePhotos != nil {
		lifeJSON, _ := json.Marshal(req.LifePhotos)
		talent.LifePhotos = lifeJSON
	}
	if req.ArtPhotos != nil {
		artJSON, _ := json.Marshal(req.ArtPhotos)
		talent.ArtPhotos = artJSON
	}

	if err := s.talentRepo.Update(ctx, talent); err != nil {
		return nil, fmt.Errorf("更新达人失败: %w", err)
	}

	logger.Info("管理员更新达人成功: id=%d name=%s", talent.ID, talent.RealName)
	return talent, nil
}

// AdminDelete 管理员删除达人
func (s *TalentService) AdminDelete(ctx context.Context, id int64) error {
	if id <= 0 {
		return errors.New("无效的达人ID")
	}
	if _, err := s.talentRepo.GetByID(ctx, id); err != nil {
		return ErrTalentNotFound
	}
	if err := s.talentRepo.Delete(ctx, id); err != nil {
		return err
	}
	logger.Info("管理员删除达人成功: id=%d", id)
	return nil
}

// Review 审核达人
func (s *TalentService) Review(ctx context.Context, id int64, status int, reason string) error {
	talent, err := s.talentRepo.GetByID(ctx, id)
	if err != nil {
		return ErrTalentNotFound
	}

	switch status {
	case model.TalentStatusNormal:
		if err := s.talentRepo.Approve(ctx, id); err != nil {
			return err
		}
	case model.TalentStatusRejected:
		if err := s.talentRepo.Reject(ctx, id); err != nil {
			return err
		}
	default:
		return errors.New("无效的审核状态")
	}

	// 审核通过/驳回通知
	_ = talent
	_ = reason
	logger.Info("达人审核完成: id=%d status=%d reason=%s", id, status, reason)
	return nil
}

// ========== 工具函数 ==========
