// Package handler HTTP处理器 - 达人处理器
package handler

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/response"
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
		Status int `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
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

	var req struct {
		Amount      float64 `json:"amount" binding:"required,gt=0"`
		BankName    string  `json:"bank_name" binding:"required"`
		BankAccount string  `json:"bank_account" binding:"required"`
		AccountName string  `json:"account_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	if err := h.talentService.RequestWithdraw(c.Request.Context(), uid,
		req.Amount, req.BankName, req.BankAccount, req.AccountName); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, nil)
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

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowExts[ext] {
		response.ParamError(c, "不支持的文件类型，仅允许 jpg/png/gif/webp")
		return
	}
	if header.Size > 10*1024*1024 {
		response.ParamError(c, "文件大小不能超过 10MB")
		return
	}

	newName := uuid.New().String() + ext
	dateDir := time.Now().Format("2006/01")
	uploadDir := filepath.Join("public", "uploads", dateDir)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		response.ServerError(c, "创建上传目录失败")
		return
	}

	savePath := filepath.Join(uploadDir, newName)
	dst, err := os.Create(savePath)
	if err != nil {
		response.ServerError(c, "创建文件失败")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		response.ServerError(c, "保存文件失败")
		return
	}

	url := fmt.Sprintf("/uploads/%s/%s", dateDir, newName)
	response.Success(c, gin.H{
		"url":      url,
		"filename": header.Filename,
		"size":     header.Size,
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
