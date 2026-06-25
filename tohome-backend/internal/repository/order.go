// Package repository 数据访问层 - 订单仓储
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/miaoda/backend/internal/model"
)

// OrderRepository 订单仓储
type OrderRepository struct {
	db *sqlx.DB
}

// NewOrderRepository 创建订单仓储
func NewOrderRepository(db *sqlx.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// Create 创建订单
func (r *OrderRepository) Create(ctx context.Context, order *model.Order) error {
	query := `
		INSERT INTO orders (
			order_no, user_id, user_name, user_phone, service_id, service_name, service_spec,
			service_duration, service_address, appointment_time, original_amount, discount_amount,
			final_amount, coupon_id, coupon_name, remark, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
		RETURNING id, created_at, updated_at`

	now := time.Now()
	err := r.db.QueryRowxContext(ctx, query,
		order.OrderNo, order.UserID, order.UserName, order.UserPhone, order.ServiceID,
		order.ServiceName, order.ServiceSpec, order.ServiceDuration, order.ServiceAddress,
		order.AppointmentTime, order.OriginalAmount, order.DiscountAmount, order.FinalAmount,
		order.CouponID, order.CouponName, order.Remark, model.OrderStatusPendingPayment, now, now,
	).Scan(&order.ID, &order.CreatedAt, &order.UpdatedAt)

	return err
}

// GetByID 根据ID获取订单
func (r *OrderRepository) GetByID(ctx context.Context, id int64) (*model.Order, error) {
	var order model.Order
	err := r.db.GetContext(ctx, &order, `SELECT * FROM orders WHERE id = $1`, id)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// GetByOrderNo 根据订单号获取订单
func (r *OrderRepository) GetByOrderNo(ctx context.Context, orderNo string) (*model.Order, error) {
	var order model.Order
	err := r.db.GetContext(ctx, &order, `SELECT * FROM orders WHERE order_no = $1`, orderNo)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// ListByUserID 获取用户订单列表
func (r *OrderRepository) ListByUserID(ctx context.Context, userID int64, status []int, page, pageSize int) ([]model.Order, int64, error) {
	var orders []model.Order
	var total int64

	args := []interface{}{userID}
	where := "user_id = $1"
	if len(status) > 0 {
		where += " AND status = ANY($2)"
		args = append(args, status)
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM orders WHERE %s", where)
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	args = append(args, pageSize, (page-1)*pageSize)
	listQuery := fmt.Sprintf(`
		SELECT * FROM orders WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	err := r.db.SelectContext(ctx, &orders, listQuery, args...)
	return orders, total, err
}

// ListByTechnicianID 获取技师订单列表
func (r *OrderRepository) ListByTechnicianID(ctx context.Context, techID int64, status []int, page, pageSize int) ([]model.Order, int64, error) {
	var orders []model.Order
	var total int64

	args := []interface{}{techID}
	where := "technician_id = $1"
	if len(status) > 0 {
		where += " AND status = ANY($2)"
		args = append(args, status)
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM orders WHERE %s", where)
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	args = append(args, pageSize, (page-1)*pageSize)
	listQuery := fmt.Sprintf(`
		SELECT * FROM orders WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	err := r.db.SelectContext(ctx, &orders, listQuery, args...)
	return orders, total, err
}

// ListPendingOrders 获取待接订单
func (r *OrderRepository) ListPendingOrders(ctx context.Context, limit int) ([]model.Order, error) {
	var orders []model.Order
	err := r.db.SelectContext(ctx, &orders, `
		SELECT * FROM orders
		WHERE status = $1
		AND appointment_time > $2
		AND (technician_id IS NULL OR technician_id = 0)
		ORDER BY created_at ASC
		LIMIT $3`,
		model.OrderStatusPendingAccept, time.Now(), limit)
	return orders, err
}

// GetCurrentByTechnicianID 获取技师当前正在服务的订单
func (r *OrderRepository) GetCurrentByTechnicianID(ctx context.Context, techID int64) (*model.Order, error) {
	var order model.Order
	err := r.db.GetContext(ctx, &order, `
		SELECT * FROM orders
		WHERE technician_id = $1
		AND status IN ($2, $3)
		ORDER BY created_at DESC
		LIMIT 1`,
		techID, model.OrderStatusAccepted, model.OrderStatusInService)
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// ListAll 管理员订单列表（所有状态）
func (r *OrderRepository) ListAll(ctx context.Context, status []int, page, pageSize int) ([]model.Order, int64, error) {
	var orders []model.Order
	var total int64

	args := []interface{}{}
	where := "1=1"
	if len(status) > 0 {
		where = "status = ANY($1)"
		args = append(args, status)
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM orders WHERE %s", where)
	if err := r.db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	args = append(args, pageSize, (page-1)*pageSize)
	listQuery := fmt.Sprintf(`
		SELECT * FROM orders WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	err := r.db.SelectContext(ctx, &orders, listQuery, args...)
	return orders, total, err
}

// UpdateExtraAmount 更新订单加时费用
func (r *OrderRepository) UpdateExtraAmount(ctx context.Context, id int64, extraMinutes int, extraAmount float64, finalAmount float64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE orders
		SET extra_amount = extra_amount + $1, final_amount = $2, service_duration = service_duration + $3, updated_at = $4
		WHERE id = $5`,
		extraAmount, finalAmount, extraMinutes, time.Now(), id)
	return err
}

// UpdateStatus 更新订单状态
func (r *OrderRepository) UpdateStatus(ctx context.Context, id int64, status int) error {
	now := time.Now()
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": now,
	}

	// 根据状态设置相应的时间戳
	switch status {
	case model.OrderStatusPendingAccept:
		// 支付完成，不需要额外时间戳
	case model.OrderStatusAccepted:
		updates["accepted_at"] = now
	case model.OrderStatusDeparted:
		updates["departed_at"] = now
	case model.OrderStatusArrived:
		updates["arrived_at"] = now
	case model.OrderStatusInService:
		updates["start_time"] = now
	case model.OrderStatusCompleted:
		updates["end_time"] = now
		updates["completed_at"] = now
	case model.OrderStatusCancelled:
		updates["cancelled_at"] = now
	}

	setClause := ""
	args := []interface{}{}
	i := 1
	for k, v := range updates {
		if setClause != "" {
			setClause += ", "
		}
		setClause += fmt.Sprintf("%s = $%d", k, i)
		args = append(args, v)
		i++
	}
	args = append(args, id)
	query := fmt.Sprintf("UPDATE orders SET %s WHERE id = $%d", setClause, i)
	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

// AssignTechnician 分配技师
func (r *OrderRepository) AssignTechnician(ctx context.Context, orderID, techID int64, techName, techPhone string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE orders
		SET technician_id = $1, technician_name = $2, technician_phone = $3,
		    status = $4, accepted_at = $5, updated_at = $5
		WHERE id = $6 AND status = $7`,
		techID, techName, techPhone, model.OrderStatusAccepted, time.Now(), orderID, model.OrderStatusPendingAccept)
	return err
}

// UpdateCancel 取消订单
func (r *OrderRepository) UpdateCancel(ctx context.Context, id int64, reason string, cancelBy int) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE orders
		SET status = $1, cancel_reason = $2, cancel_by = $3, cancelled_at = $4, updated_at = $4
		WHERE id = $5`,
		model.OrderStatusCancelled, reason, cancelBy, time.Now(), id)
	return err
}

// MarkAsPaid 标记已支付
func (r *OrderRepository) MarkAsPaid(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE orders
		SET status = $1, paid_at = $2, updated_at = $2
		WHERE id = $3`,
		model.OrderStatusPendingAccept, time.Now(), id)
	return err
}

// Statistics 订单统计
func (r *OrderRepository) Statistics(ctx context.Context, startTime, endTime time.Time) (map[string]interface{}, error) {
	result := make(map[string]interface{})

	// 订单总数
	var totalCount int64
	err := r.db.GetContext(ctx, &totalCount,
		`SELECT COUNT(*) FROM orders WHERE created_at BETWEEN $1 AND $2`, startTime, endTime)
	if err != nil {
		return nil, err
	}
	result["total_count"] = totalCount

	// 订单总金额
	var totalAmount float64
	err = r.db.GetContext(ctx, &totalAmount,
		`SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE created_at BETWEEN $1 AND $2 AND status IN ($3, $4, $5, $6, $7)`,
		startTime, endTime, model.OrderStatusPendingAccept, model.OrderStatusAccepted, model.OrderStatusInService, model.OrderStatusCompleted, model.OrderStatusRefunded)
	if err != nil {
		return nil, err
	}
	result["total_amount"] = totalAmount

	// 完成订单数
	var completedCount int64
	err = r.db.GetContext(ctx, &completedCount,
		`SELECT COUNT(*) FROM orders WHERE created_at BETWEEN $1 AND $2 AND status = $3`,
		startTime, endTime, model.OrderStatusCompleted)
	if err != nil {
		return nil, err
	}
	result["completed_count"] = completedCount

	return result, nil
}
