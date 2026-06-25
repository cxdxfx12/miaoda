// Package repository 数据访问层 - 支付仓储
package repository

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/miaoda/backend/internal/model"
)

// PaymentRepository 支付仓储
type PaymentRepository struct {
	db *sqlx.DB
}

// NewPaymentRepository 创建支付仓储
func NewPaymentRepository(db *sqlx.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

// Create 创建支付记录
func (r *PaymentRepository) Create(ctx context.Context, payment *model.Payment) error {
	query := `
		INSERT INTO payments (payment_no, order_id, order_no, user_id, amount, pay_method, pay_channel, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
		RETURNING id, created_at, updated_at`
	now := time.Now()
	err := r.db.QueryRowxContext(ctx, query,
		payment.PaymentNo, payment.OrderID, payment.OrderNo, payment.UserID,
		payment.Amount, payment.PayMethod, payment.PayChannel, model.PaymentStatusPending, now,
	).Scan(&payment.ID, &payment.CreatedAt, &payment.UpdatedAt)
	return err
}

// GetByID 根据ID获取
func (r *PaymentRepository) GetByID(ctx context.Context, id int64) (*model.Payment, error) {
	var payment model.Payment
	err := r.db.GetContext(ctx, &payment, `SELECT * FROM payments WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

// GetByPaymentNo 根据支付单号获取
func (r *PaymentRepository) GetByPaymentNo(ctx context.Context, paymentNo string) (*model.Payment, error) {
	var payment model.Payment
	err := r.db.GetContext(ctx, &payment, `SELECT * FROM payments WHERE payment_no = $1`, paymentNo)
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

// MarkAsPaid 标记已支付
func (r *PaymentRepository) MarkAsPaid(ctx context.Context, id int64, transactionID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE payments
		SET status = $1, transaction_id = $2, paid_at = $3, updated_at = $3
		WHERE id = $4`,
		model.PaymentStatusSuccess, transactionID, time.Now(), id)
	return err
}

// MarkAsRefunded 标记已退款
func (r *PaymentRepository) MarkAsRefunded(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE payments
		SET status = $1, refunded_at = $2, updated_at = $2
		WHERE id = $3`,
		model.PaymentStatusRefunded, time.Now(), id)
	return err
}
