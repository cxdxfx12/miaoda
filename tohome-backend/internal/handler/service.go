// Package handler HTTP处理器 - 服务处理器
package handler

import (
	"context"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/response"
)

// ServiceHandler 服务处理器
type ServiceHandler struct {
	svcService *service.ServiceService
}

// NewServiceHandler 创建服务处理器
func NewServiceHandler(svcService *service.ServiceService) *ServiceHandler {
	return &ServiceHandler{svcService: svcService}
}

// ListCategories 分类列表
func (h *ServiceHandler) ListCategories(c *gin.Context) {
	categories, err := h.svcService.ListCategories(c.Request.Context())
	if err != nil {
		response.ServerError(c, "获取分类失败")
		return
	}
	response.Success(c, categories)
}

// ListServices 服务列表
func (h *ServiceHandler) ListServices(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	keyword := c.Query("keyword")

	var categoryID *int64
	if cid := c.Query("category_id"); cid != "" {
		if v, err := strconv.ParseInt(cid, 10, 64); err == nil {
			categoryID = &v
		}
	}

	services, total, err := h.svcService.List(c.Request.Context(), categoryID, keyword, page, pageSize)
	if err != nil {
		response.ServerError(c, "获取服务列表失败")
		return
	}
	response.Page(c, services, total, page, pageSize)
}

// GetServiceDetail 服务详情
func (h *ServiceHandler) GetServiceDetail(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	svc, err := h.svcService.GetDetail(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c)
		return
	}
	// 增加浏览次数
	go h.svcService.IncrementViewCount(context.Background(), id)
	response.Success(c, svc)
}
