package repository

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/miaoda/backend/internal/model"
)

// CouponRepository 优惠券仓储
type CouponRepository struct {
	db *sqlx.DB
}

// NewCouponRepository 创建仓储
func NewCouponRepository(db *sqlx.DB) *CouponRepository {
	return &CouponRepository{db: db}
}

// GetByID 获取优惠券定义
func (r *CouponRepository) GetByID(ctx context.Context, id int64) (*model.Coupon, error) {
	var c model.Coupon
	if err := r.db.GetContext(ctx, &c, `SELECT * FROM coupons WHERE id = $1`, id); err != nil {
		return nil, err
	}
	return &c, nil
}

// GetUserCoupon 获取用户优惠券记录
func (r *CouponRepository) GetUserCoupon(ctx context.Context, userID, couponID int64) (*model.UserCoupon, error) {
	var uc model.UserCoupon
	if err := r.db.GetContext(ctx, &uc, `SELECT * FROM user_coupons WHERE user_id = $1 AND coupon_id = $2`, userID, couponID); err != nil {
		return nil, err
	}
	// 补充 coupon 信息
	if coupon, err := r.GetByID(ctx, uc.CouponID); err == nil {
		uc.Coupon = coupon
	}
	return &uc, nil
}

// UseUserCoupon 标记用户券为已使用（原子操作应在事务中执行）
func (r *CouponRepository) UseUserCoupon(ctx context.Context, userID, couponID int64, orderID int64) error {
	now := time.Now()
	_, err := r.db.ExecContext(ctx, `UPDATE user_coupons SET status = 1, order_id = $1, used_at = $2, updated_at = $2 WHERE user_id = $3 AND coupon_id = $4 AND status = 0`, orderID, now, userID, couponID)
	return err
}

// ExpireUserCoupons 过期处理（可定时调用）
func (r *CouponRepository) ExpireUserCoupons(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, `UPDATE user_coupons SET status = 2 WHERE expire_at < $1 AND status = 0`, time.Now())
	return err
}
