package service

import (
	"testing"

	"github.com/miaoda/backend/internal/model"
)

func TestCalculateDiscount_FullReduction(t *testing.T) {
	c := &model.Coupon{Type: model.CouponTypeFullReduction, Value: 20, MinAmount: 100}
	d := CalculateDiscount(c, 120)
	if d != 20 {
		t.Fatalf("expected 20, got %v", d)
	}
	// below min amount
	d = CalculateDiscount(c, 80)
	if d != 0 {
		t.Fatalf("expected 0, got %v", d)
	}
}

func TestCalculateDiscount_Discount(t *testing.T) {
	c := &model.Coupon{Type: model.CouponTypeDiscount, Value: 0.8}
	d := CalculateDiscount(c, 100)
	if d != 20 {
		t.Fatalf("expected 20, got %v", d)
	}
}

func TestCalculateDiscount_Cash(t *testing.T) {
	c := &model.Coupon{Type: model.CouponTypeCash, Value: 30}
	d := CalculateDiscount(c, 50)
	if d != 30 {
		t.Fatalf("expected 30, got %v", d)
	}
	// more than amount
	d = CalculateDiscount(c, 20)
	if d != 20 {
		t.Fatalf("expected 20, got %v", d)
	}
}
