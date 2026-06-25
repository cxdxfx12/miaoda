package service

import (
	"math"

	"github.com/miaoda/backend/internal/model"
)

// CalculateDiscount 根据优惠券计算折扣金额
func CalculateDiscount(c *model.Coupon, amount float64) float64 {
	if c == nil || amount <= 0 {
		return 0
	}
	switch c.Type {
	case model.CouponTypeFullReduction:
		// 满减：value 表示减免金额，需满足 min_amount
		if amount >= c.MinAmount {
			if c.Value > amount {
				return amount
			}
			return c.Value
		}
	case model.CouponTypeDiscount:
		// 折扣：value 表示折扣率，例如 0.9 表示 9 折
		if c.Value <= 0 {
			return 0
		}
		d := amount * (1 - c.Value)
		if d < 0 {
			return 0
		}
		if d > amount {
			return amount
		}
		return roundMoney(d)
	case model.CouponTypeCash:
		// 现金券：直接减免 value
		if c.Value > amount {
			return amount
		}
		return c.Value
	default:
		return 0
	}
	return 0
}

func roundMoney(v float64) float64 {
	return math.Round(v*100) / 100
}
