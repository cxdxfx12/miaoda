// Package handler 微信OAuth处理器
package handler

import (
	"encoding/json"

	"github.com/gin-gonic/gin"

	"github.com/miaoda/backend/internal/service"
	"github.com/miaoda/backend/pkg/response"
)

// WechatHandler 微信处理器
type WechatHandler struct {
	wechatSvc *service.WechatService
}

// NewWechatHandler 创建微信处理器
func NewWechatHandler(wechatSvc *service.WechatService) *WechatHandler {
	return &WechatHandler{wechatSvc: wechatSvc}
}

// GetWechatConfig 获取微信服务号公开配置
func (h *WechatHandler) GetWechatConfig(c *gin.Context) {
	cfg := h.wechatSvc.GetPublicConfig()
	response.Success(c, cfg)
}

// WechatLogin 微信OAuth登录（用code换取JWT）
func (h *WechatHandler) WechatLogin(c *gin.Context) {
	var req struct {
		Code       string `json:"code" binding:"required"`
		State      string `json:"state"`
		InviteCode string `json:"invite_code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误: code不能为空")
		return
	}

	result, err := h.wechatSvc.LoginByCode(c.Request.Context(), req.Code, c.ClientIP(), req.InviteCode)
	if err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}

	response.Success(c, result)
}

// WechatCallback 微信OAuth回调页面（Web端使用）
func (h *WechatHandler) WechatCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")

	if code == "" {
		response.ParamError(c, "授权失败，缺少code参数")
		return
	}

	result, err := h.wechatSvc.LoginByCode(c.Request.Context(), code, c.ClientIP())
	if err != nil {
		c.Data(200, "text/html; charset=utf-8", []byte(`
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>登录失败</title></head>
<body style="text-align:center;padding-top:60px;font-family:sans-serif;">
<h2>登录失败</h2><p>`+err.Error()+`</p></body></html>`))
		return
	}

	// JSON序列化登录数据
	userJSON, _ := json.Marshal(result.User)
	dataJSON, _ := json.Marshal(map[string]interface{}{
		"token":         result.Token,
		"refresh_token": result.RefreshToken,
		"expire_in":     result.ExpireIn,
		"user":          json.RawMessage(userJSON),
	})
	_ = state

	c.Data(200, "text/html; charset=utf-8", []byte(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>登录成功</title></head>
<body style="text-align:center;padding-top:60px;font-family:sans-serif;">
<h2 style="color:#07C160;">✅ 授权成功</h2><p>正在跳转...</p>
<script>
var loginData = `+string(dataJSON)+`;
try {
	if (window.ReactNativeWebView) {
		window.ReactNativeWebView.postMessage(JSON.stringify({type:"wechat_login",data:loginData}));
	} else {
		window.location.href = "miaoda://login?token=" + encodeURIComponent(loginData.token);
	}
} catch(e) { setTimeout(function(){ window.location.href = "miaoda://login?token=" + encodeURIComponent(loginData.token); }, 1000); }
</script></body></html>`))
}

// WechatBindPhone 微信登录后绑定手机号（需要已登录）
func (h *WechatHandler) WechatBindPhone(c *gin.Context) {
	userID := c.GetInt64("user_id")
	var req struct {
		Phone string `json:"phone" binding:"required,len=11"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "请输入正确的手机号")
		return
	}

	if err := h.wechatSvc.BindPhone(c.Request.Context(), userID, req.Phone); err != nil {
		response.Fail(c, response.CodeBusinessError, err.Error())
		return
	}

	response.Success(c, gin.H{"message": "手机号绑定成功"})
}
