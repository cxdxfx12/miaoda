package service

import (
	"context"
	"errors"

	"github.com/miaoda/backend/internal/repository"
	"github.com/miaoda/backend/pkg/database"
)

var (
	ErrWithdrawMinAmount = errors.New("最低提现金额为10元")
)

type TalentCenterService struct {
	repo *repository.TalentCenterRepo
}

func NewTalentCenterService() *TalentCenterService {
	return &TalentCenterService{repo: repository.NewTalentCenterRepo()}
}

// ===== 自选服务 =====

func (s *TalentCenterService) ListMyServices(ctx context.Context, talentID int64) ([]repository.TalentServiceItem, error) {
	return s.repo.ListTalentServices(ctx, talentID)
}

func (s *TalentCenterService) AddMyService(ctx context.Context, talentID, serviceID int64, customPrice *float64) error {
	return s.repo.AddTalentService(ctx, talentID, serviceID, customPrice, 0)
}

func (s *TalentCenterService) RemoveMyService(ctx context.Context, talentID, serviceID int64) error {
	return s.repo.RemoveTalentService(ctx, talentID, serviceID)
}

func (s *TalentCenterService) ToggleServiceAvailability(ctx context.Context, talentID, serviceID int64, available bool) error {
	return s.repo.ToggleServiceAvailability(ctx, talentID, serviceID, available)
}

// ===== 服务地址 =====

func (s *TalentCenterService) ListMyAddresses(ctx context.Context, talentID int64) ([]repository.TalentAddress, error) {
	return s.repo.ListTalentAddresses(ctx, talentID)
}

func (s *TalentCenterService) AddAddress(ctx context.Context, talentID int64, addr *repository.TalentAddress) error {
	addr.TalentID = talentID
	return s.repo.AddTalentAddress(ctx, addr)
}

func (s *TalentCenterService) UpdateAddress(ctx context.Context, talentID, addrID int64, addr *repository.TalentAddress) error {
	return s.repo.UpdateTalentAddress(ctx, talentID, addrID, addr)
}

func (s *TalentCenterService) DeleteAddress(ctx context.Context, talentID, addrID int64) error {
	return s.repo.DeleteTalentAddress(ctx, talentID, addrID)
}

func (s *TalentCenterService) SetDefaultAddress(ctx context.Context, talentID, addrID int64) error {
	return s.repo.SetDefaultAddress(ctx, talentID, addrID)
}

// ===== 提现 =====

func (s *TalentCenterService) ListWithdrawRecords(ctx context.Context, talentID int64, page, pageSize int) ([]repository.WithdrawRecord, int64, error) {
	return s.repo.ListWithdrawRecords(ctx, talentID, page, pageSize)
}

func (s *TalentCenterService) RequestWithdraw(ctx context.Context, talentID int64, amount float64) error {
	if amount < 10 {
		return ErrWithdrawMinAmount
	}
	db := database.Database()
	var balance float64
	_ = db.GetContext(ctx, &balance, `SELECT COALESCE(balance, 0) FROM technicians WHERE id = $1`, talentID)
	if balance < amount {
		return errors.New("余额不足")
	}
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(ctx, `UPDATE technicians SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND balance >= $1`, amount, talentID)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO withdraws (talent_id, amount, status, created_at, updated_at) VALUES ($1, $2, 0, NOW(), NOW())`, talentID, amount)
	if err != nil {
		return err
	}
	return tx.Commit()
}

// Admin
func (s *TalentCenterService) AdminListWithdraws(ctx context.Context, page, pageSize, status int) ([]map[string]interface{}, int64, error) {
	return s.repo.AdminListWithdraws(ctx, page, pageSize, status)
}

func (s *TalentCenterService) AdminProcessWithdraw(ctx context.Context, id int64, status int, reason string) error {
	return s.repo.AdminProcessWithdraw(ctx, id, status, reason)
}
