// Package repository 数据访问层 - 服务仓储
package repository

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"

	"github.com/miaoda/backend/internal/model"
)

// ServiceRepository 服务仓储
type ServiceRepository struct {
	db *sqlx.DB
}

// NewServiceRepository 创建服务仓储
func NewServiceRepository(db *sqlx.DB) *ServiceRepository {
	return &ServiceRepository{db: db}
}

// GetByID 根据ID获取服务
func (r *ServiceRepository) GetByID(ctx context.Context, id int64) (*model.Service, error) {
	var svc model.Service
	err := r.db.GetContext(ctx, &svc, `SELECT * FROM services WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return nil, err
	}
	return &svc, nil
}

// ListCategories 获取服务分类列表
func (r *ServiceRepository) ListCategories(ctx context.Context) ([]model.ServiceCategory, error) {
	var categories []model.ServiceCategory
	err := r.db.SelectContext(ctx, &categories, `
		SELECT * FROM service_categories
		WHERE status = 1
		ORDER BY sort_order ASC`)
	return categories, err
}

// List 获取服务列表
func (r *ServiceRepository) List(ctx context.Context, categoryID *int64, keyword string, page, pageSize int) ([]model.Service, int64, error) {
	var services []model.Service
	var total int64

	args := []interface{}{}
	where := "deleted_at IS NULL AND status = 1"
	if categoryID != nil {
		where += " AND category_id = $1"
		args = append(args, *categoryID)
	}
	if keyword != "" {
		idx := len(args) + 1
		where += fmt.Sprintf(" AND name ILIKE $%d", idx)
		args = append(args, "%"+keyword+"%")
	}

	if err := r.db.GetContext(ctx, &total,
		fmt.Sprintf("SELECT COUNT(*) FROM services WHERE %s", where), args...); err != nil {
		return nil, 0, err
	}

	args = append(args, pageSize, (page-1)*pageSize)
	listQuery := fmt.Sprintf(`
		SELECT * FROM services WHERE %s
		ORDER BY sort_order ASC, created_at DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	err := r.db.SelectContext(ctx, &services, listQuery, args...)

	// 加载分类信息
	if err == nil {
		for i := range services {
			var category model.ServiceCategory
			if err := r.db.GetContext(ctx, &category,
				`SELECT * FROM service_categories WHERE id = $1`, services[i].CategoryID); err == nil {
				services[i].Category = &category
			}
		}
	}

	return services, total, err
}

// IncrementViewCount 增加浏览次数
func (r *ServiceRepository) IncrementViewCount(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE services SET view_count = view_count + 1 WHERE id = $1`, id)
	return err
}

// IncrementOrderCount 增加订单次数
func (r *ServiceRepository) IncrementOrderCount(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE services SET order_count = order_count + 1 WHERE id = $1`, id)
	return err
}
