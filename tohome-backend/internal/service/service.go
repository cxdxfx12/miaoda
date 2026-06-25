// Package service 业务逻辑层 - 服务服务
package service

import (
	"context"

	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/internal/repository"
)

// ServiceService 服务服务
type ServiceService struct {
	svcRepo *repository.ServiceRepository
}

// NewServiceService 创建服务服务
func NewServiceService(svcRepo *repository.ServiceRepository) *ServiceService {
	return &ServiceService{svcRepo: svcRepo}
}

// ListCategories 分类列表
func (s *ServiceService) ListCategories(ctx context.Context) ([]model.ServiceCategory, error) {
	return s.svcRepo.ListCategories(ctx)
}

// List 服务列表
func (s *ServiceService) List(ctx context.Context, categoryID *int64, keyword string, page, pageSize int) ([]model.Service, int64, error) {
	return s.svcRepo.List(ctx, categoryID, keyword, page, pageSize)
}

// GetDetail 服务详情
func (s *ServiceService) GetDetail(ctx context.Context, id int64) (*model.Service, error) {
	return s.svcRepo.GetByID(ctx, id)
}

// IncrementViewCount 增加浏览次数
func (s *ServiceService) IncrementViewCount(ctx context.Context, id int64) error {
	return s.svcRepo.IncrementViewCount(ctx, id)
}
