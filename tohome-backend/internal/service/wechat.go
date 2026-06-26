// Package service 微信服务号OAuth服务
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/miaoda/backend/internal/config"
	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/internal/repository"
	"github.com/miaoda/backend/pkg/jwt"
	"github.com/miaoda/backend/pkg/logger"
)

// WechatService 微信服务号服务
type WechatService struct {
	cfg      *config.WechatMPConfig
	userRepo *repository.UserRepository
	jwtCfg   *config.JWTConfig
	isDev    bool
}

func (s *WechatService) refreshConfig(ctx context.Context) {
	if s == nil || s.cfg == nil {
		return
	}
	s.cfg.AppID = firstNonEmpty(getConfigValue(ctx, "wechat", "app_id", ""), getConfigValue(ctx, "wechat", "appId", ""), s.cfg.AppID)
	s.cfg.AppSecret = firstNonEmpty(getConfigValue(ctx, "wechat", "app_secret", ""), getConfigValue(ctx, "wechat", "appSecret", ""), s.cfg.AppSecret)
	s.cfg.Token = firstNonEmpty(getConfigValue(ctx, "wechat", "token", ""), s.cfg.Token)
	s.cfg.EncodingAESKey = firstNonEmpty(getConfigValue(ctx, "wechat", "encoding_aes_key", ""), getConfigValue(ctx, "wechat", "encodingAesKey", ""), s.cfg.EncodingAESKey)
	s.cfg.RedirectURI = firstNonEmpty(getConfigValue(ctx, "wechat", "redirect_uri", ""), getConfigValue(ctx, "wechat", "redirectUri", ""), s.cfg.RedirectURI)
	if enabled := firstNonEmpty(getConfigValue(ctx, "wechat", "enabled", ""), ""); enabled != "" {
		if parsed, err := strconv.ParseBool(enabled); err == nil {
			s.cfg.Enabled = parsed
		}
	}
}

// NewWechatService 创建微信服务
func NewWechatService(cfg *config.Config, userRepo *repository.UserRepository) *WechatService {
	return &WechatService{
		cfg:      &cfg.ThirdParty.WechatMP,
		userRepo: userRepo,
		jwtCfg:   &cfg.JWT,
		isDev:    cfg.App.Debug,
	}
}

// WechatAccessTokenResp 微信获取access_token响应
type WechatAccessTokenResp struct {
	AccessToken  string `json:"access_token"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	OpenID       string `json:"openid"`
	Scope        string `json:"scope"`
	UnionID      string `json:"unionid"`
	ErrCode      int    `json:"errcode"`
	ErrMsg       string `json:"errmsg"`
}

// WechatUserInfo 微信用户信息
type WechatUserInfo struct {
	OpenID     string `json:"openid"`
	Nickname   string `json:"nickname"`
	Sex        int    `json:"sex"`
	Province   string `json:"province"`
	City       string `json:"city"`
	Country    string `json:"country"`
	HeadImgURL string `json:"headimgurl"`
	UnionID    string `json:"unionid"`
	ErrCode    int    `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

// GetAuthURL 获取微信OAuth授权URL
func (s *WechatService) GetAuthURL(state string) string {
	s.refreshConfig(context.Background())
	redirectURI := url.QueryEscape(s.cfg.RedirectURI)
	return fmt.Sprintf(
		"https://open.weixin.qq.com/connect/oauth2/authorize?appid=%s&redirect_uri=%s&response_type=code&scope=snsapi_userinfo&state=%s#wechat_redirect",
		s.cfg.AppID, redirectURI, state,
	)
}

// GetPublicConfig 获取公开的微信配置（不暴露secret）
func (s *WechatService) GetPublicConfig() map[string]interface{} {
	s.refreshConfig(context.Background())
	return map[string]interface{}{
		"app_id":       s.cfg.AppID,
		"enabled":      s.cfg.Enabled,
		"redirect_uri": s.cfg.RedirectURI,
	}
}

// LoginByCode 通过微信授权code登录
func (s *WechatService) LoginByCode(ctx context.Context, code, ip string) (*LoginResponse, error) {
	s.refreshConfig(ctx)
	if s.isDev && (strings.HasPrefix(code, "dev_") || !s.cfg.Enabled || s.cfg.AppID == "") {
		userInfo := &WechatUserInfo{
			OpenID:     "dev_openid_" + code,
			Nickname:   "微信用户",
			Sex:        0,
			HeadImgURL: "https://thirdwx.qlogo.cn/mmopen/vi_32/default/132",
			UnionID:    "dev_unionid_" + code,
		}
		return s.loginByWechatUserInfo(ctx, userInfo, ip)
	}

	// 1. 用code换取access_token和openid
	accessToken, err := s.exchangeCodeForToken(code)
	if err != nil {
		return nil, fmt.Errorf("获取微信token失败: %w", err)
	}

	// 2. 用access_token获取用户信息
	userInfo, err := s.getUserInfo(accessToken.AccessToken, accessToken.OpenID)
	if err != nil {
		return nil, fmt.Errorf("获取微信用户信息失败: %w", err)
	}

	return s.loginByWechatUserInfo(ctx, userInfo, ip)
}

func (s *WechatService) loginByWechatUserInfo(ctx context.Context, userInfo *WechatUserInfo, ip string) (*LoginResponse, error) {
	user, isNew, err := s.findOrCreateUser(ctx, userInfo)
	if err != nil {
		return nil, fmt.Errorf("处理用户失败: %w", err)
	}

	if user.Status != model.UserStatusNormal {
		return nil, ErrUserDisabled
	}

	userType := 1
	token, err := jwt.GenerateToken(s.jwtCfg.Secret, user.ID, user.Phone, userType, s.jwtCfg.Expire)
	if err != nil {
		return nil, fmt.Errorf("生成token失败: %w", err)
	}

	refreshToken, err := jwt.GenerateRefreshToken(s.jwtCfg.Secret, user.ID, s.jwtCfg.RefreshExpire)
	if err != nil {
		return nil, fmt.Errorf("生成刷新token失败: %w", err)
	}

	go s.userRepo.UpdateLastLogin(context.Background(), user.ID, ip)
	go s.userRepo.SetCache(context.Background(), user)

	logger.Info("微信用户登录: openid=%s, user_id=%d, is_new=%v", userInfo.OpenID, user.ID, isNew)

	return &LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		ExpireIn:     s.jwtCfg.Expire,
		User:         user,
	}, nil
}

// exchangeCodeForToken 用code换取access_token
func (s *WechatService) exchangeCodeForToken(code string) (*WechatAccessTokenResp, error) {
	apiURL := fmt.Sprintf(
		"https://api.weixin.qq.com/sns/oauth2/access_token?appid=%s&secret=%s&code=%s&grant_type=authorization_code",
		s.cfg.AppID, s.cfg.AppSecret, code,
	)

	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result WechatAccessTokenResp
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	if result.ErrCode != 0 {
		return nil, fmt.Errorf("微信返回错误 [%d]: %s", result.ErrCode, result.ErrMsg)
	}

	return &result, nil
}

// getUserInfo 获取微信用户信息
func (s *WechatService) getUserInfo(accessToken, openID string) (*WechatUserInfo, error) {
	apiURL := fmt.Sprintf(
		"https://api.weixin.qq.com/sns/userinfo?access_token=%s&openid=%s&lang=zh_CN",
		accessToken, openID,
	)

	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result WechatUserInfo
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	if result.ErrCode != 0 {
		return nil, fmt.Errorf("微信返回错误 [%d]: %s", result.ErrCode, result.ErrMsg)
	}

	return &result, nil
}

// findOrCreateUser 查找或创建用户
func (s *WechatService) findOrCreateUser(ctx context.Context, wxInfo *WechatUserInfo) (*model.User, bool, error) {
	// 先通过openid查找
	user, err := s.userRepo.GetByOpenID(ctx, wxInfo.OpenID)
	if err == nil && user != nil {
		// 老用户：更新头像昵称和unionid
		if user.Nickname == "" || user.Avatar == "" || user.UnionID == "" {
			user.Nickname = wxInfo.Nickname
			user.Avatar = wxInfo.HeadImgURL
			user.UnionID = wxInfo.UnionID
			go s.userRepo.BindWechat(context.Background(), user.ID, wxInfo.OpenID, wxInfo.UnionID)
		}
		return user, false, nil
	}

	// 新用户：创建
	phone := s.generateWechatPhone()
	user = &model.User{
		Phone:    phone,
		Nickname: wxInfo.Nickname,
		Avatar:   wxInfo.HeadImgURL,
		Gender:   wxInfo.Sex,
		OpenID:   wxInfo.OpenID,
		UnionID:  wxInfo.UnionID,
		Status:   model.UserStatusNormal,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, false, fmt.Errorf("创建微信用户失败: %w", err)
	}

	return user, true, nil
}

// generateWechatPhone 为微信用户生成虚拟手机号（后续可绑定真实手机号）
func (s *WechatService) generateWechatPhone() string {
	return fmt.Sprintf("19%09d", time.Now().UnixNano()%1000000000)
}

// BindPhone 微信用户绑定手机号
func (s *WechatService) BindPhone(ctx context.Context, userID int64, phone string) error {
	// 检查手机号是否已被其他用户使用
	existing, err := s.userRepo.GetByPhone(ctx, phone)
	if err == nil && existing != nil && existing.ID != userID {
		return errors.New("该手机号已被其他用户绑定")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}

	user.Phone = phone
	if err := s.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("绑定手机号失败: %w", err)
	}

	go s.userRepo.DeleteCache(context.Background(), userID)
	return nil
}
