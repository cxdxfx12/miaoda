// Package handler HTTP处理器 - 用户处理器
package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/response"
)

// UserHandler 用户处理器
type UserHandler struct {
	userService *service.UserService
}

// GetInviteInfo 获取我的邀请信息
func (h *UserHandler) GetInviteInfo(c *gin.Context) {
	uid := c.GetInt64("user_id")
	origin := c.GetHeader("Origin")
	if origin == "" {
		scheme := "https"
		if strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "http") {
			scheme = "http"
		}
		origin = scheme + "://" + c.Request.Host
	}
	info, err := service.GetInviteInfo(c.Request.Context(), uid, origin)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}
	response.Success(c, info)
}

// ValidateInviteCode 校验邀请码
func (h *UserHandler) ValidateInviteCode(c *gin.Context) {
	code := strings.TrimSpace(c.Query("code"))
	if code == "" {
		response.ParamError(c, "邀请码不能为空")
		return
	}
	// 当前校验通过获取邀请页时完成，公开接口只做基础格式确认，避免泄露用户信息
	response.Success(c, gin.H{"code": strings.ToUpper(code), "valid": len(code) >= 4})
}

// NewUserHandler 创建用户处理器
func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// SendSmsCode 发送短信验证码
// @Summary 发送短信验证码
// @Tags 用户认证
// @Accept json
// @Produce json
// @Param body body SendSmsRequest true "请求参数"
// @Success 200 {object} response.Response
// @Router /api/v1/auth/sms/send [post]
func (h *UserHandler) SendSmsCode(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required,len=11"`
		Type  string `json:"type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	if err := h.userService.SendSmsCode(c.Request.Context(), req.Phone); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}

	response.SuccessWithMessage(c, "验证码发送成功", nil)
}

// Login 用户登录
// @Summary 用户登录
// @Tags 用户认证
// @Accept json
// @Produce json
// @Param body body service.LoginRequest true "登录请求"
// @Success 200 {object} response.Response{data=service.LoginResponse}
// @Router /api/v1/auth/login [post]
func (h *UserHandler) Login(c *gin.Context) {
	var req service.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	ip := c.ClientIP()
	result, err := h.userService.Login(c.Request.Context(), &req, ip)
	if err != nil {
		switch err {
		case service.ErrInvalidCode:
			response.Fail(c, response.CodeBusinessError, "验证码错误")
		case service.ErrUserDisabled:
			response.Fail(c, response.CodeBusinessError, "账号已被禁用")
		default:
			response.Fail(c, response.CodeBusinessError, err.Error())
		}
		return
	}

	response.Success(c, result)
}

// TalentLogin 达人登录
// @Summary 达人登录
// @Tags 达人认证
// @Accept json
// @Produce json
// @Param body body service.LoginRequest true "登录请求"
// @Success 200 {object} response.Response{data=service.LoginResponse}
// @Router /api/v1/auth/tech/login [post]
func (h *UserHandler) TalentLogin(c *gin.Context) {
	var req service.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	result, err := h.userService.TalentLogin(c.Request.Context(), &req, c.ClientIP())
	if err != nil {
		switch err {
		case service.ErrInvalidCode:
			response.Fail(c, response.CodeBusinessError, "验证码错误")
		case service.ErrUserDisabled:
			response.Fail(c, response.CodeBusinessError, "账号已被禁用")
		case service.ErrTalentNotApproved:
			response.Fail(c, response.CodeBusinessError, "达人不存在或未通过审核")
		default:
			response.Fail(c, response.CodeBusinessError, err.Error())
		}
		return
	}

	response.Success(c, result)
}

// RefreshToken 刷新访问Token
// @Summary 刷新访问Token
// @Tags 用户认证
// @Accept json
// @Produce json
// @Success 200 {object} response.Response{data=service.LoginResponse}
// @Router /api/v1/auth/refresh [post]
func (h *UserHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	result, err := h.userService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		switch err {
		case service.ErrInvalidParams:
			response.Fail(c, response.CodeUnauthorized, "刷新token无效")
		case service.ErrUserDisabled:
			response.Fail(c, response.CodeBusinessError, "账号已被禁用")
		default:
			response.Fail(c, response.CodeBusinessError, err.Error())
		}
		return
	}

	response.Success(c, result)
}

// TechLogout 达人退出登录
func (h *UserHandler) TechLogout(c *gin.Context) {
	response.Success(c, nil)
}

// GetUserInfo 获取用户信息
// @Summary 获取用户信息
// @Tags 用户管理
// @Security BearerAuth
// @Success 200 {object} response.Response{data=model.User}
// @Router /api/v1/user/info [get]
func (h *UserHandler) GetUserInfo(c *gin.Context) {
	userID, _ := c.Get("user_id")
	uid, ok := userID.(int64)
	if !ok {
		// 尝试从float64转（gin context中的int64实际是int64）
		if f, ok := userID.(float64); ok {
			uid = int64(f)
		} else if s, ok := userID.(string); ok {
			uid, _ = strconv.ParseInt(s, 10, 64)
		}
	}

	user, err := h.userService.GetUserInfo(c.Request.Context(), uid)
	if err != nil {
		response.NotFound(c)
		return
	}
	response.Success(c, user)
}

// UpdateUserInfo 更新用户信息
// @Summary 更新用户信息
// @Tags 用户管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param body body model.User true "用户信息"
// @Success 200 {object} response.Response
// @Router /api/v1/user/info [put]
func (h *UserHandler) UpdateUserInfo(c *gin.Context) {
	uid := getUserID(c)
	var user model.User
	if err := c.ShouldBindJSON(&user); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	user.ID = uid

	if err := h.userService.UpdateUserInfo(c.Request.Context(), &user); err != nil {
		response.ServerError(c, "更新失败")
		return
	}

	// 清除缓存
	h.userService.UpdateUserInfo(c.Request.Context(), &user)

	response.Success(c, nil)
}

// UpdatePassword 修改密码
// @Summary 修改密码
// @Tags 用户管理
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param body body UpdatePasswordRequest true "修改密码请求"
// @Success 200 {object} response.Response
// @Router /api/v1/user/password [put]
func (h *UserHandler) UpdatePassword(c *gin.Context) {
	uid := getUserID(c)
	var req struct {
		OldPassword string `json:"old_password" binding:"required,min=6"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}

	if err := h.userService.UpdatePassword(c.Request.Context(), uid, req.OldPassword, req.NewPassword); err != nil {
		switch err {
		case service.ErrInvalidPassword:
			response.Fail(c, response.CodeBusinessError, "原密码错误")
		default:
			response.Fail(c, response.CodeBusinessError, err.Error())
		}
		return
	}

	response.Success(c, nil)
}

// ListAddresses 地址列表
func (h *UserHandler) ListAddresses(c *gin.Context) {
	uid := getUserID(c)
	addresses, err := h.userService.ListAddresses(c.Request.Context(), uid)
	if err != nil {
		response.ServerError(c, "获取地址列表失败")
		return
	}
	response.Success(c, addresses)
}

// CreateAddress 创建地址
func (h *UserHandler) CreateAddress(c *gin.Context) {
	uid := getUserID(c)
	var addr model.UserAddress
	if err := c.ShouldBindJSON(&addr); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	addr.UserID = uid

	if err := h.userService.CreateAddress(c.Request.Context(), &addr); err != nil {
		response.ServerError(c, "创建地址失败")
		return
	}
	response.Success(c, addr)
}

// UpdateAddress 更新地址
func (h *UserHandler) UpdateAddress(c *gin.Context) {
	uid := getUserID(c)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var addr model.UserAddress
	if err := c.ShouldBindJSON(&addr); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	addr.ID = id
	addr.UserID = uid

	if err := h.userService.UpdateAddress(c.Request.Context(), &addr); err != nil {
		response.ServerError(c, "更新地址失败")
		return
	}
	response.Success(c, nil)
}

// DeleteAddress 删除地址
func (h *UserHandler) DeleteAddress(c *gin.Context) {
	uid := getUserID(c)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	if err := h.userService.DeleteAddress(c.Request.Context(), id, uid); err != nil {
		response.ServerError(c, "删除地址失败")
		return
	}
	response.Success(c, nil)
}

// SetDefaultAddress 设置默认地址
func (h *UserHandler) SetDefaultAddress(c *gin.Context) {
	uid := getUserID(c)
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	if err := h.userService.SetDefaultAddress(c.Request.Context(), id, uid); err != nil {
		response.ServerError(c, "设置默认地址失败")
		return
	}
	response.Success(c, nil)
}

// Logout 退出登录
func (h *UserHandler) Logout(c *gin.Context) {
	uid := getUserID(c)
	// 清除用户缓存
	go h.userService.UpdateUserInfo(c.Request.Context(), &model.User{BaseModel: model.BaseModel{ID: uid}})
	response.Success(c, nil)
}

// SendSmsRequest 发送短信请求
type SendSmsRequest struct {
	Phone string `json:"phone" binding:"required,len=11"`
	Type  string `json:"type"`
}

// UpdatePasswordRequest 修改密码请求
type UpdatePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required,min=6"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// getUserID 获取用户ID
func getUserID(c *gin.Context) int64 {
	userID, _ := c.Get("user_id")
	switch v := userID.(type) {
	case int64:
		return v
	case int:
		return int64(v)
	case float64:
		return int64(v)
	case string:
		id, _ := strconv.ParseInt(v, 10, 64)
		return id
	}
	return 0
}

// 响应函数辅助
var _ = http.StatusOK
