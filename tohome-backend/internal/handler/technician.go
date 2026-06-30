// Package handler HTTP处理器 - 达人处理器
package handler

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/repository"
	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/logger"
	"github.com/miaoda/backend/pkg/response"
	"github.com/miaoda/backend/pkg/upload"
)

// TalentHandler 达人处理器
type TalentHandler struct {
	talentService *service.TalentService
}

// NewTalentHandler 创建达人处理器
func NewTalentHandler(talentService *service.TalentService) *TalentHandler {
	return &TalentHandler{talentService: talentService}
}

// GetNearbyTalents 附近达人
func (h *TalentHandler) GetNearbyTalents(c *gin.Context) {
	lat, _ := strconv.ParseFloat(c.Query("lat"), 64)
	lng, _ := strconv.ParseFloat(c.Query("lng"), 64)
	radius, _ := strconv.ParseFloat(c.DefaultQuery("radius", "5"), 64)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))

	if lat == 0 || lng == 0 {
		response.ParamError(c, "经纬度参数错误")
		return
	}

	talents, err := h.talentService.FindNearby(c.Request.Context(), lat, lng, radius, limit)
	if err != nil {
		response.ServerError(c, "获取附近达人失败")
		return
	}
	response.Success(c, talents)
}

// GetTalentDetail 达人详情
func (h *TalentHandler) GetTalentDetail(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	talent, err := h.talentService.GetDetail(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c)
		return
	}
	response.Success(c, talent)
}

// GetTalentReviews 达人评价
func (h *TalentHandler) GetTalentReviews(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	reviews, total, err := h.talentService.GetReviews(c.Request.Context(), id, page, pageSize)
	if err != nil {
		response.ServerError(c, "获取评价失败")
		return
	}
	response.Page(c, reviews, total, page, pageSize)
}

// GetProfile 获取达人资料
func (h *TalentHandler) GetProfile(c *gin.Context) {
	uid := getUserID(c)
	talent, err := h.talentService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}
	response.Success(c, talent)
}

// UpdateProfile 更新达人资料
func (h *TalentHandler) UpdateProfile(c *gin.Context) {
	uid := getUserID(c)

	var req service.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	if err := h.talentService.UpdateProfile(c.Request.Context(), uid, &req); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}

// UpdateWorkStatus 更新工作状态
func (h *TalentHandler) UpdateWorkStatus(c *gin.Context) {
	uid := getUserID(c)

	var req struct {
		Status int `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	if req.Status != 0 && req.Status != 1 {
		response.ParamError(c, "状态值必须为0或1")
		return
	}

	if err := h.talentService.UpdateWorkStatus(c.Request.Context(), uid, req.Status); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}

// UpdateLocation 更新位置
func (h *TalentHandler) UpdateLocation(c *gin.Context) {
	uid := getUserID(c)

	var req struct {
		Lat float64 `json:"lat" binding:"required"`
		Lng float64 `json:"lng" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	if err := h.talentService.UpdateLocation(c.Request.Context(), uid, req.Lat, req.Lng); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
}

// GetIncomeStatistics 收入统计
func (h *TalentHandler) GetIncomeStatistics(c *gin.Context) {
	uid := getUserID(c)

	// 今日、本周、本月统计
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := todayStart.AddDate(0, 0, -int(now.Weekday()))
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	stats, err := h.talentService.GetIncomeStatistics(c.Request.Context(), uid, todayStart, now)
	if err != nil {
		response.ServerError(c, "获取收入统计失败")
		return
	}

	weekStats, _ := h.talentService.GetIncomeStatistics(c.Request.Context(), uid, weekStart, now)
	monthStats, _ := h.talentService.GetIncomeStatistics(c.Request.Context(), uid, monthStart, now)

	response.Success(c, gin.H{
		"today":      stats,
		"this_week":  weekStats,
		"this_month": monthStats,
	})
}

// GetIncomeRecords 收入明细
func (h *TalentHandler) GetIncomeRecords(c *gin.Context) {
	uid := getUserID(c)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	records, total, err := h.talentService.GetIncomeRecords(c.Request.Context(), uid, page, pageSize)
	if err != nil {
		response.ServerError(c, "获取收入明细失败")
		return
	}
	response.Page(c, records, total, page, pageSize)
}

// RequestWithdraw 申请提现
func (h *TalentHandler) RequestWithdraw(c *gin.Context) {
	uid := getUserID(c)
	talent, err := h.talentService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}

	var req struct {
		Amount      float64 `json:"amount" binding:"required,gt=0"`
		BankName    string  `json:"bank_name"`
		BankAccount string  `json:"bank_account"`
		AccountName string  `json:"account_name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	svc := service.NewTalentCenterService()
	if err := svc.RequestWithdraw(c.Request.Context(), talent.ID, req.Amount); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "提现申请已提交"})
}

// ApplyTalent 达人入驻申请
func (h *TalentHandler) ApplyTalent(c *gin.Context) {
	uid := getUserID(c)

	var req service.ApplyTalentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误："+err.Error())
		return
	}

	if err := h.talentService.Apply(c.Request.Context(), uid, &req); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "申请已提交，请等待审核"})
}

// UploadTalentFile 达人入驻图片上传
func (h *TalentHandler) UploadTalentFile(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.ParamError(c, "请选择文件")
		return
	}
	defer file.Close()

	result, err := upload.SaveUploadedImage(file, header.Filename, header.Size)
	if err != nil {
		response.ParamError(c, err.Error())
		return
	}

	response.Success(c, gin.H{
		"url":       result.URL,
		"filename":  header.Filename,
		"size":      result.Size,
		"optimized": result.Optimized,
	})
}

// GetDashboard 工作台数据
func (h *TalentHandler) GetDashboard(c *gin.Context) {
	uid := getUserID(c)

	// 今日数据
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	stats, _ := h.talentService.GetIncomeStatistics(c.Request.Context(), uid, todayStart, now)
	pendingCount, _ := h.talentService.GetPendingOrderCount(c.Request.Context(), uid)

	response.Success(c, gin.H{
		"today_stats":    stats,
		"pending_orders": pendingCount,
	})
}

// ===== 达人中心 Handler =====

// ListMyServices 达人自选服务列表
func (h *TalentHandler) ListMyServices(c *gin.Context) {
	uid := getUserID(c)
	talent, err := h.talentService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}
	svc := service.NewTalentCenterService()
	items, err := svc.ListMyServices(c.Request.Context(), talent.ID)
	if err != nil {
		logger.Error("ListMyServices failed: talent_id=%d, err=%v", talent.ID, err)
		response.ServerError(c, "获取服务列表失败")
		return
	}
	response.Success(c, items)
}

// AddMyService 添加自选服务
func (h *TalentHandler) AddMyService(c *gin.Context) {
	var req struct {
		ServiceID   int64   `json:"service_id" binding:"required"`
		CustomPrice *float64 `json:"custom_price"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	uid := getUserID(c)
	talent, err := h.talentService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}
	svc := service.NewTalentCenterService()
	if err := svc.AddMyService(c.Request.Context(), talent.ID, req.ServiceID, req.CustomPrice); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "添加成功"})
}

// RemoveMyService 移除自选服务
func (h *TalentHandler) RemoveMyService(c *gin.Context) {
	serviceID, _ := strconv.ParseInt(c.Param("service_id"), 10, 64)
	if serviceID <= 0 {
		response.ParamError(c, "无效的服务ID")
		return
	}
	uid := getUserID(c)
	talent, err := h.talentService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}
	svc := service.NewTalentCenterService()
	if err := svc.RemoveMyService(c.Request.Context(), talent.ID, serviceID); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "移除成功"})
}

// ListMyAddresses 达人服务地址列表
func (h *TalentHandler) ListMyAddresses(c *gin.Context) {
	uid := getUserID(c)
	talent, err := h.talentService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}
	svc := service.NewTalentCenterService()
	items, err := svc.ListMyAddresses(c.Request.Context(), talent.ID)
	if err != nil {
		response.ServerError(c, "获取地址列表失败")
		return
	}
	response.Success(c, items)
}

// AddMyAddress 添加服务地址
func (h *TalentHandler) AddMyAddress(c *gin.Context) {
	var req struct {
		Name      string   `json:"name"`
		City      string   `json:"city" binding:"required"`
		District  string   `json:"district" binding:"required"`
		Detail    string   `json:"detail" binding:"required"`
		Lat       *float64 `json:"lat"`
		Lng       *float64 `json:"lng"`
		IsDefault bool     `json:"is_default"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	uid := getUserID(c)
	talent, err := h.talentService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}
	svc := service.NewTalentCenterService()
	addr := &repository.TalentAddress{
		Name: req.Name, City: req.City, District: req.District,
		Detail: req.Detail, Lat: req.Lat, Lng: req.Lng, IsDefault: req.IsDefault,
	}
	if err := svc.AddAddress(c.Request.Context(), talent.ID, addr); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, addr)
}

// UpdateMyAddress 更新服务地址
func (h *TalentHandler) UpdateMyAddress(c *gin.Context) {
	addrID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if addrID <= 0 {
		response.ParamError(c, "无效的地址ID")
		return
	}
	var req struct {
		Name      string   `json:"name"`
		City      string   `json:"city" binding:"required"`
		District  string   `json:"district" binding:"required"`
		Detail    string   `json:"detail" binding:"required"`
		Lat       *float64 `json:"lat"`
		Lng       *float64 `json:"lng"`
		IsDefault bool     `json:"is_default"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	uid := getUserID(c)
	talent, err := h.talentService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}
	svc := service.NewTalentCenterService()
	addr := &repository.TalentAddress{
		Name: req.Name, City: req.City, District: req.District,
		Detail: req.Detail, Lat: req.Lat, Lng: req.Lng, IsDefault: req.IsDefault,
	}
	if err := svc.UpdateAddress(c.Request.Context(), talent.ID, addrID, addr); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "更新成功"})
}

// DeleteMyAddress 删除服务地址
func (h *TalentHandler) DeleteMyAddress(c *gin.Context) {
	addrID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if addrID <= 0 {
		response.ParamError(c, "无效的地址ID")
		return
	}
	uid := getUserID(c)
	talent, err := h.talentService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}
	svc := service.NewTalentCenterService()
	if err := svc.DeleteAddress(c.Request.Context(), talent.ID, addrID); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "删除成功"})
}

// SetDefaultMyAddress 设置默认地址
func (h *TalentHandler) SetDefaultMyAddress(c *gin.Context) {
	addrID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if addrID <= 0 {
		response.ParamError(c, "无效的地址ID")
		return
	}
	uid := getUserID(c)
	talent, err := h.talentService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}
	svc := service.NewTalentCenterService()
	if err := svc.SetDefaultAddress(c.Request.Context(), talent.ID, addrID); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "设置成功"})
}

// ListMyWithdraws 提现记录
func (h *TalentHandler) ListMyWithdraws(c *gin.Context) {
	uid := getUserID(c)
	talent, err := h.talentService.GetByUserID(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	svc := service.NewTalentCenterService()
	records, total, err := svc.ListWithdrawRecords(c.Request.Context(), talent.ID, page, pageSize)
	if err != nil {
		response.ServerError(c, "获取提现记录失败")
		return
	}
	response.Page(c, records, total, page, pageSize)
}
