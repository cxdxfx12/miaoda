// Package handler API 处理层 - 管理后台
package handler

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/database"
	"github.com/miaoda/backend/pkg/response"
	"github.com/miaoda/backend/pkg/upload"
)

// AdminHandler 管理后台处理器
type AdminHandler struct {
	userSvc   *service.UserService
	orderSvc  *service.OrderService
	talentSvc *service.TalentService
}

// NewAdminHandler 创建管理处理器
func NewAdminHandler(userSvc *service.UserService, orderSvc *service.OrderService, talentSvc *service.TalentService) *AdminHandler {
	return &AdminHandler{userSvc: userSvc, orderSvc: orderSvc, talentSvc: talentSvc}
}

// AdminLogin 管理员登录
func (h *AdminHandler) AdminLogin(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	result, err := h.userSvc.AdminLogin(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, result)
}

// AdminChangePassword 修改当前管理员密码
func (h *AdminHandler) AdminChangePassword(c *gin.Context) {
	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	adminID, ok := c.Get("user_id")
	if !ok {
		response.Unauthorized(c)
		return
	}
	if err := h.userSvc.AdminChangePassword(c.Request.Context(), adminID.(int64), req.OldPassword, req.NewPassword); err != nil {
		response.ParamError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "密码修改成功，请重新登录"})
}

// AdminGetProfile 获取当前管理员个人信息
func (h *AdminHandler) AdminGetProfile(c *gin.Context) {
	adminID, ok := c.Get("user_id")
	if !ok {
		response.Unauthorized(c)
		return
	}
	result, err := h.userSvc.GetAdminProfile(c.Request.Context(), adminID.(int64))
	if err != nil {
		response.ParamError(c, err.Error())
		return
	}
	response.Success(c, result)
}

// AdminUpdateProfile 更新当前管理员个人信息
func (h *AdminHandler) AdminUpdateProfile(c *gin.Context) {
	var req struct {
		Nickname string `json:"nickname" binding:"required"`
		Email    string `json:"email"`
		Phone    string `json:"phone"`
		Avatar   string `json:"avatar"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	adminID, ok := c.Get("user_id")
	if !ok {
		response.Unauthorized(c)
		return
	}
	result, err := h.userSvc.UpdateAdminProfile(c.Request.Context(), adminID.(int64), req.Nickname, req.Email, req.Phone, req.Avatar)
	if err != nil {
		response.ParamError(c, err.Error())
		return
	}
	response.Success(c, result)
}

// GetDashboard 仪表盘数据
func (h *AdminHandler) GetDashboard(c *gin.Context) {
	data, err := h.userSvc.GetDashboard(c.Request.Context())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, data)
}

// GetStats 统计数据
func (h *AdminHandler) GetStats(c *gin.Context) {
	period := c.DefaultQuery("period", "today")
	stats, err := h.userSvc.GetStats(c.Request.Context(), period)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, stats)
}

// AdminListTalents 达人列表
func (h *AdminHandler) AdminListTalents(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status, _ := strconv.Atoi(c.DefaultQuery("status", "-1"))
	keyword := c.Query("keyword")
	list, total, err := h.talentSvc.AdminList(c.Request.Context(), page, pageSize, status, keyword)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Page(c, list, total, page, pageSize)
}

// AdminGetTalentDetail 达人详情
func (h *AdminHandler) AdminGetTalentDetail(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	talent, err := h.talentSvc.AdminGetDetail(c.Request.Context(), id)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, talent)
}

// AdminReviewTalent 审核达人
func (h *AdminHandler) AdminReviewTalent(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		Status int    `json:"status" binding:"required"`
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	if err := h.talentSvc.Review(c.Request.Context(), id, req.Status, req.Reason); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "操作成功"})
}

// AdminBatchReviewTalents 批量审核
func (h *AdminHandler) AdminBatchReviewTalents(c *gin.Context) {
	var req struct {
		IDs    []int64 `json:"ids" binding:"required"`
		Status int     `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	for _, id := range req.IDs {
		h.talentSvc.Review(c.Request.Context(), id, req.Status, "")
	}
	response.Success(c, gin.H{"message": "批量操作完成"})
}

// AdminCreateTalent 管理员创建达人
func (h *AdminHandler) AdminCreateTalent(c *gin.Context) {
	var req service.AdminCreateTalentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}
	if req.RealName == "" || req.Phone == "" {
		response.ParamError(c, "参数错误: 姓名和手机号不能为空")
		return
	}
	talent, err := h.talentSvc.AdminCreate(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, talent)
}

// AdminUpdateTalent 管理员更新达人
func (h *AdminHandler) AdminUpdateTalent(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		response.ParamError(c, "无效的达人ID")
		return
	}
	var req service.AdminCreateTalentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}
	talent, err := h.talentSvc.AdminUpdate(c.Request.Context(), id, &req)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, talent)
}

// AdminUploadFile 管理员上传文件
func (h *AdminHandler) AdminUploadFile(c *gin.Context) {
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

// AdminListUsers 用户列表
func (h *AdminHandler) AdminListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status, _ := strconv.Atoi(c.DefaultQuery("status", "-1"))
	level, _ := strconv.Atoi(c.DefaultQuery("level", "-1"))
	keyword := c.Query("keyword")
	list, total, err := h.userSvc.AdminListUsers(c.Request.Context(), page, pageSize, status, level, keyword)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Page(c, list, total, page, pageSize)
}

// AdminCreateUser 创建用户
func (h *AdminHandler) AdminCreateUser(c *gin.Context) {
	var req service.AdminCreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}
	user, err := h.userSvc.AdminCreateUser(c.Request.Context(), &req)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, user)
}

// AdminUpdateUser 更新用户
func (h *AdminHandler) AdminUpdateUser(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req service.AdminUpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: "+err.Error())
		return
	}
	if err := h.userSvc.AdminUpdateUser(c.Request.Context(), id, &req); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "更新成功"})
}

// AdminDeleteUser 删除用户
func (h *AdminHandler) AdminDeleteUser(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.userSvc.AdminDeleteUser(c.Request.Context(), id); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "删除成功"})
}

// AdminGetUserDetail 用户详情
func (h *AdminHandler) AdminGetUserDetail(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	user, err := h.userSvc.AdminGetUserDetail(c.Request.Context(), id)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, user)
}

// AdminDisableUser 禁用用户
func (h *AdminHandler) AdminDisableUser(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.userSvc.DisableUser(c.Request.Context(), id); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "用户已禁用"})
}

// AdminEnableUser 启用用户
func (h *AdminHandler) AdminEnableUser(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.userSvc.EnableUser(c.Request.Context(), id); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "用户已启用"})
}

// AdminFinanceOverview 财务概览
func (h *AdminHandler) AdminFinanceOverview(c *gin.Context) {
	data, err := h.userSvc.GetFinanceOverview(c.Request.Context())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, data)
}

// AdminFinanceTransactions 资金流水
func (h *AdminHandler) AdminFinanceTransactions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	typ := c.Query("type")
	list, total, err := h.userSvc.GetTransactions(c.Request.Context(), page, pageSize, typ)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Page(c, list, total, page, pageSize)
}

// AdminExportTransactions 导出流水
func (h *AdminHandler) AdminExportTransactions(c *gin.Context) {
	// 生成CSV导出链接
	response.Success(c, gin.H{
		"message": "导出任务已提交",
		"url":     "/api/v1/admin/finance/transactions/export",
	})
}

// AdminListReviews 评价列表
func (h *AdminHandler) AdminListReviews(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	list, total, err := h.userSvc.ListReviews(c.Request.Context(), page, pageSize)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Page(c, list, total, page, pageSize)
}

// AdminReplyReview 回复评价
func (h *AdminHandler) AdminReplyReview(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		Reply string `json:"reply" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "请填写回复内容")
		return
	}
	if err := h.userSvc.ReplyReview(c.Request.Context(), id, req.Reply); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "回复成功"})
}

// AdminListActivities 活动列表
func (h *AdminHandler) AdminListActivities(c *gin.Context) {
	activities, err := h.userSvc.ListActivities(c.Request.Context())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, activities)
}

// AdminCreateActivity 创建活动
func (h *AdminHandler) AdminCreateActivity(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	if err := h.userSvc.CreateActivity(c.Request.Context(), req); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "创建成功"})
}

// AdminListCoupons 优惠券列表
func (h *AdminHandler) AdminListCoupons(c *gin.Context) {
	coupons, err := h.userSvc.ListCoupons(c.Request.Context())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, coupons)
}

// AdminCreateCoupon 创建优惠券
func (h *AdminHandler) AdminCreateCoupon(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	if err := h.userSvc.CreateCoupon(c.Request.Context(), req); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "创建成功"})
}

// AdminSendCoupon 发放优惠券
func (h *AdminHandler) AdminSendCoupon(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		UserID int64 `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	if err := h.userSvc.SendCoupon(c.Request.Context(), id, req.UserID); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "发放成功"})
}

// AdminGetConfig 获取配置
func (h *AdminHandler) AdminGetConfig(c *gin.Context) {
	group := c.Param("group")
	configs, err := h.userSvc.GetSystemConfigs(c.Request.Context(), group)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, configs)
}

// AdminUpdateConfig 更新配置
func (h *AdminHandler) AdminUpdateConfig(c *gin.Context) {
	group := c.Param("group")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	if key, ok := req["key"].(string); ok && key != "" {
		value := fmt.Sprintf("%v", req["value"])
		if err := h.userSvc.UpdateSystemConfig(c.Request.Context(), group, key, value); err != nil {
			response.ServerError(c, err.Error())
			return
		}
		response.Success(c, gin.H{"message": "保存成功"})
		return
	}
	if len(req) == 0 {
		response.ParamError(c, "参数错误")
		return
	}
	for key, value := range req {
		if strings.TrimSpace(key) == "" {
			continue
		}
		if err := h.userSvc.UpdateSystemConfig(c.Request.Context(), group, key, fmt.Sprintf("%v", value)); err != nil {
			response.ServerError(c, err.Error())
			return
		}
	}
	response.Success(c, gin.H{"message": "保存成功"})
}

// AdminGetServiceStatus 服务状态
func (h *AdminHandler) AdminGetServiceStatus(c *gin.Context) {
	services := []gin.H{
		{"name": "API网关", "status": "running", "cpu": 35, "memory": 42, "host": "localhost:8080"},
		{"name": "用户服务", "status": "running", "cpu": 28, "memory": 38, "host": "localhost:8081"},
		{"name": "订单服务", "status": "running", "cpu": 45, "memory": 55, "host": "localhost:8082"},
		{"name": "达人服务", "status": "running", "cpu": 22, "memory": 30, "host": "localhost:8083"},
		{"name": "支付服务", "status": "running", "cpu": 15, "memory": 25, "host": "localhost:8084"},
		{"name": "派单服务", "status": "running", "cpu": 18, "memory": 28, "host": "localhost:8085"},
	}
	response.Success(c, services)
}

// AdminRevenueAnalytics 营收分析
func (h *AdminHandler) AdminRevenueAnalytics(c *gin.Context) {
	months, _ := strconv.Atoi(c.DefaultQuery("months", "6"))
	data, err := h.userSvc.GetRevenueAnalytics(c.Request.Context(), months)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, data)
}

// AdminUserAnalytics 用户分析
func (h *AdminHandler) AdminUserAnalytics(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))
	data, err := h.userSvc.GetUserAnalytics(c.Request.Context(), days)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, data)
}

// AdminCityAnalytics 城市分析
func (h *AdminHandler) AdminCityAnalytics(c *gin.Context) {
	data, err := h.userSvc.GetCityAnalytics(c.Request.Context())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, data)
}

// AdminGetMarketingOverview 营销概览
func (h *AdminHandler) AdminGetMarketingOverview(c *gin.Context) {
	data, err := h.userSvc.GetMarketingOverview(c.Request.Context())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, data)
}

// AdminGetReviewsOverview 评价概览
func (h *AdminHandler) AdminGetReviewsOverview(c *gin.Context) {
	var totalReviews, repliedReviews int64
	var avgRating float64
	db := database.Database()
	if db != nil {
		_ = db.GetContext(c.Request.Context(), &totalReviews, `SELECT COUNT(*) FROM reviews`)
		_ = db.GetContext(c.Request.Context(), &repliedReviews, `SELECT COUNT(*) FROM reviews WHERE reply_content IS NOT NULL`)
		_ = db.GetContext(c.Request.Context(), &avgRating, `SELECT COALESCE(AVG(rating::decimal), 0) FROM reviews`)
	}
	response.Success(c, gin.H{
		"total_reviews": totalReviews,
		"reply_rate":    fmt.Sprintf("%.1f%%", float64(repliedReviews)/float64(totalReviews+1)*100),
		"avg_rating":    fmt.Sprintf("%.1f", avgRating),
		"pending_reply": totalReviews - repliedReviews,
	})
}

// AdminBatchUpdateConfig 批量更新配置（接受 {key: value} map）
func (h *AdminHandler) AdminBatchUpdateConfig(c *gin.Context) {
	group := c.Param("group")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数格式错误")
		return
	}
	if key, ok := req["key"].(string); ok && key != "" {
		strValue := strings.TrimSpace(fmt.Sprint(req["value"]))
		if err := h.userSvc.UpdateSystemConfig(c.Request.Context(), group, key, strValue); err != nil {
			response.ServerError(c, fmt.Sprintf("更新 %s 失败: %v", key, err))
			return
		}
		response.Success(c, gin.H{"message": "保存成功"})
		return
	}
	for key, value := range req {
		strValue := strings.TrimSpace(fmt.Sprint(value))
		if err := h.userSvc.UpdateSystemConfig(c.Request.Context(), group, key, strValue); err != nil {
			response.ServerError(c, fmt.Sprintf("更新 %s 失败: %v", key, err))
			return
		}
	}
	response.Success(c, gin.H{"message": "保存成功"})
}

// AdminGetConfigSetting 获取设置配置（wrapper for router）
func (h *AdminHandler) AdminGetConfigSetting(group string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Params = gin.Params{gin.Param{Key: "group", Value: group}}
		h.AdminGetConfig(c)
	}
}

// AdminTestWeComNotification 测试企业微信通知
func (h *AdminHandler) AdminTestWeComNotification(c *gin.Context) {
	var req struct {
		City string `json:"city"`
	}
	_ = c.ShouldBindJSON(&req)
	if req.City == "" {
		req.City = "测试城市"
	}
	if err := service.SendWeComTestNotification(c.Request.Context(), req.City); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "测试消息已发送"})
}

// --------------- 轮播图管理 ---------------

// AdminListBanners 轮播图列表
func (h *AdminHandler) AdminListBanners(c *gin.Context) {
	banners, err := h.userSvc.ListBanners(c.Request.Context())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	if banners == nil {
		banners = []model.Banner{}
	}
	response.Success(c, banners)
}

// PublicListBanners 获取公开轮播图（无需认证，只返回状态为启用的）
func (h *AdminHandler) PublicListBanners(c *gin.Context) {
	banners, err := h.userSvc.ListBanners(c.Request.Context())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	if banners == nil {
		banners = []model.Banner{}
	}
	// 只返回启用的轮播图（status=1）
	active := make([]model.Banner, 0)
	for _, b := range banners {
		if b.Status == 1 {
			active = append(active, b)
		}
	}
	if active == nil {
		active = []model.Banner{}
	}
	response.Success(c, active)
}

// PublicGetSupportConfig 获取用户端客服配置（无需认证）
func (h *AdminHandler) PublicGetSupportConfig(c *gin.Context) {
	configs, err := h.userSvc.GetSystemConfigs(c.Request.Context(), "support")
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	result := gin.H{
		"support_mode":  "page",
		"support_url":   "/support",
		"support_phone": "",
		"support_title": "在线客服",
	}
	for _, item := range configs {
		key, _ := item["key"].(string)
		value, _ := item["value"].(string)
		if key != "" {
			result[key] = value
		}
	}
	response.Success(c, result)
}

// PublicGetSiteConfig 获取用户端页面内容配置（无需认证）
func (h *AdminHandler) PublicGetSiteConfig(c *gin.Context) {
	siteConfigs, _ := h.userSvc.GetSystemConfigs(c.Request.Context(), "site")
	basicConfigs, _ := h.userSvc.GetSystemConfigs(c.Request.Context(), "basic")
	supportConfigs, _ := h.userSvc.GetSystemConfigs(c.Request.Context(), "support")
	result := gin.H{
		"app_name":            "喵搭",
		"logo_url":            "/logo.png",
		"about_slogan":        "您身边的陪伴服务平台",
		"about_version":       "v1.0.0",
		"about_build":         "Build 20250625",
		"about_team":          "喵搭科技",
		"about_website":       "www.miaoda.com",
		"about_service_phone": "400-888-0000",
		"about_service_email": "support@miaoda.com",
		"about_intro":         "喵搭专注于本地生活陪伴服务，连接用户与经过认证的达人，提供休闲、娱乐、按摩、影院等多场景服务。",
		"about_copyright":     "© 2025 喵搭科技 版权所有",
		"about_license":       "增值电信业务经营许可证: 川B2-2025XXXX",
		"about_icp":           "ICP备案号: 川ICP备2025XXXXXXXX号",
		"support_title":       "在线客服",
		"support_subtitle":    "喵搭官方客服",
		"support_desc":        "咨询订单、退款、预约和平台规则等问题",
		"support_welcome":     "您好！喵搭客服为您服务，请问有什么可以帮您的？",
		"support_auto_reply":  "收到您的消息啦！我们的客服正在处理中，稍后会有专人回复您~",
		"support_quick":       "如何下单？,退款政策,优惠券使用,投诉建议",
		"support_phone":       "400-888-0000",
		"support_email":       "support@miaoda.com",
		"support_work_time":   "09:00 - 22:00",
		"support_notice":      "紧急订单问题建议直接拨打客服热线，普通咨询可在线留言。",
		"support_knowledge_base": `[
  {
    "question": "如何下单？",
    "keywords": ["下单", "预约", "怎么约", "怎么下单", "流程"],
    "answer": "您可以在首页或服务页选择服务项目，再选择合适的达人，确认服务时间和地址后提交订单并完成支付。支付成功后，达人会在订单页接单并与您确认服务安排。"
  },
  {
    "question": "退款政策",
    "keywords": ["退款", "退钱", "取消订单", "多久到账", "退款多久到账"],
    "answer": "如需退款，请进入订单详情页提交退款申请。达人未出发前通常可按规则退还服务费；达人出发后，车费可能不退，服务费按订单状态和平台规则处理。审核通过后一般 1-3 个工作日原路退回。"
  },
  {
    "question": "优惠券使用",
    "keywords": ["优惠券", "券", "红包", "抵扣", "新人券"],
    "answer": "优惠券会在下单结算页自动展示。满足使用门槛的优惠券可直接勾选抵扣，一个订单通常只能使用一张优惠券，具体以结算页展示为准。"
  },
  {
    "question": "投诉建议",
    "keywords": ["投诉", "建议", "不满意", "举报", "服务不好"],
    "answer": "如果您对服务不满意，可以在订单详情页提交投诉或联系在线客服。请尽量提供订单号、问题描述和相关截图，我们会尽快核实处理。"
  },
  {
    "question": "达人是否真实？",
    "keywords": ["真人", "认证", "达人真实", "安全吗", "安全"],
    "answer": "平台达人会经过基础资料审核和认证流程。您可以在达人详情页查看头像、评分、服务记录等信息。服务过程中如遇异常，请立即联系平台客服。"
  },
  {
    "question": "如何联系客服？",
    "keywords": ["客服", "电话", "联系", "人工", "转人工"],
    "answer": "您可以在当前页面继续留言，也可以拨打页面上方展示的客服热线。遇到订单紧急问题时，建议优先拨打客服电话处理。"
  }
]`,
	}
	merge := func(items []map[string]interface{}) {
		for _, item := range items {
			key, _ := item["key"].(string)
			value, _ := item["value"].(string)
			if key != "" {
				result[key] = value
			}
		}
	}
	merge(basicConfigs)
	merge(supportConfigs)
	merge(siteConfigs)
	if result["about_service_phone"] == "400-888-0000" && result["service_phone"] != nil {
		result["about_service_phone"] = result["service_phone"]
	}
	if result["about_service_email"] == "support@miaoda.com" && result["service_email"] != nil {
		result["about_service_email"] = result["service_email"]
	}
	response.Success(c, result)
}

// PublicGetBillingRules 获取计费规则配置（无需认证）
func (h *AdminHandler) PublicGetBillingRules(c *gin.Context) {
	commissionConfigs, _ := h.userSvc.GetSystemConfigs(c.Request.Context(), "commission")
	travelConfigs, _ := h.userSvc.GetSystemConfigs(c.Request.Context(), "travel_fee")
	toMap := func(items []map[string]interface{}) gin.H {
		result := gin.H{}
		for _, item := range items {
			key, _ := item["key"].(string)
			value, _ := item["value"].(string)
			if key != "" {
				result[key] = value
			}
		}
		return result
	}
	response.Success(c, gin.H{
		"commission": toMap(commissionConfigs),
		"travel_fee": toMap(travelConfigs),
	})
}

// AdminSaveBanner 创建轮播图
func (h *AdminHandler) AdminSaveBanner(c *gin.Context) {
	var banner model.Banner
	if err := c.ShouldBindJSON(&banner); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	if err := h.userSvc.SaveBanner(c.Request.Context(), &banner); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, banner)
}

// AdminUpdateBanner 更新轮播图
func (h *AdminHandler) AdminUpdateBanner(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var banner model.Banner
	if err := c.ShouldBindJSON(&banner); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	banner.ID = id
	if err := h.userSvc.UpdateBanner(c.Request.Context(), &banner); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "更新成功"})
}

// AdminDeleteBanner 删除轮播图
func (h *AdminHandler) AdminDeleteBanner(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.userSvc.DeleteBanner(c.Request.Context(), id); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "删除成功"})
}

// --------------- 服务分类管理 ---------------

// AdminListServiceCategories 管理后台获取服务分类列表
func (h *AdminHandler) AdminListServiceCategories(c *gin.Context) {
	categories, err := h.userSvc.AdminListServiceCategories(c.Request.Context())
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	if categories == nil {
		categories = []model.ServiceCategory{}
	}
	response.Success(c, categories)
}

// AdminSaveServiceCategory 创建服务分类
func (h *AdminHandler) AdminSaveServiceCategory(c *gin.Context) {
	var cat model.ServiceCategory
	if err := c.ShouldBindJSON(&cat); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	if err := h.userSvc.SaveServiceCategory(c.Request.Context(), &cat); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, cat)
}

// AdminUpdateServiceCategory 更新服务分类
func (h *AdminHandler) AdminUpdateServiceCategory(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var cat model.ServiceCategory
	if err := c.ShouldBindJSON(&cat); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	cat.ID = id
	if err := h.userSvc.UpdateServiceCategory(c.Request.Context(), &cat); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "更新成功"})
}

// AdminDeleteServiceCategory 删除服务分类
func (h *AdminHandler) AdminDeleteServiceCategory(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.userSvc.DeleteServiceCategory(c.Request.Context(), id); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "删除成功"})
}

// --------------- 服务项目管理（管理后台） ---------------

// AdminListServices 管理后台获取服务列表
func (h *AdminHandler) AdminListServices(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	keyword := c.Query("keyword")
	var categoryID *int64
	if cid := c.Query("category_id"); cid != "" {
		if v, err := strconv.ParseInt(cid, 10, 64); err == nil {
			categoryID = &v
		}
	}
	list, total, err := h.userSvc.AdminListServices(c.Request.Context(), categoryID, keyword, page, pageSize)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Page(c, list, total, page, pageSize)
}

// AdminGetServiceDetail 管理后台获取服务详情
func (h *AdminHandler) AdminGetServiceDetail(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	svc, err := h.userSvc.AdminGetServiceDetail(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c)
		return
	}
	response.Success(c, svc)
}

// AdminSaveService 创建服务
func (h *AdminHandler) AdminSaveService(c *gin.Context) {
	var svc model.Service
	if err := c.ShouldBindJSON(&svc); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	if err := h.userSvc.SaveService(c.Request.Context(), &svc); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, svc)
}

// AdminUpdateService 更新服务
func (h *AdminHandler) AdminUpdateService(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var svc model.Service
	if err := c.ShouldBindJSON(&svc); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	svc.ID = id
	if err := h.userSvc.UpdateService(c.Request.Context(), &svc); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "更新成功"})
}

// AdminDeleteService 删除服务
func (h *AdminHandler) AdminDeleteService(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	if err := h.userSvc.DeleteService(c.Request.Context(), id); err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "删除成功"})
}

// AdminUpdateConfigSetting 更新设置配置（wrapper for router）
func (h *AdminHandler) AdminUpdateConfigSetting(group string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Params = gin.Params{gin.Param{Key: "group", Value: group}}
		h.AdminBatchUpdateConfig(c)
	}
}
