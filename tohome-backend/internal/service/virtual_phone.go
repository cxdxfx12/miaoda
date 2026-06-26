// Package service 业务逻辑层 - 虚拟电话服务
package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"

	"github.com/miaoda/backend/internal/config"
	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/pkg/logger"
)

// VirtualPhoneService 虚拟电话服务（AXB隐私号）
type VirtualPhoneService struct {
	db    *sqlx.DB
	redis *redis.Client
	cfg   *config.Config
}

// NewVirtualPhoneService 创建虚拟电话服务
func NewVirtualPhoneService(db *sqlx.DB, redis *redis.Client, cfg *config.Config) *VirtualPhoneService {
	return &VirtualPhoneService{db: db, redis: redis, cfg: cfg}
}

func (s *VirtualPhoneService) refreshConfig(ctx context.Context) {
	if s == nil || s.cfg == nil {
		return
	}
	vp := &s.cfg.ThirdParty.VirtualPhone
	vp.Provider = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "provider", ""), vp.Provider)
	vp.Aliyun.AccessKeyID = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "aliyunAccessKey", ""), getConfigValue(ctx, "virtual_phone", "aliyun_access_key", ""), vp.Aliyun.AccessKeyID)
	vp.Aliyun.AccessKeySecret = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "aliyunAccessSecret", ""), getConfigValue(ctx, "virtual_phone", "aliyun_access_secret", ""), vp.Aliyun.AccessKeySecret)
	vp.Aliyun.PoolKey = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "aliyunPoolKey", ""), getConfigValue(ctx, "virtual_phone", "aliyun_pool_key", ""), vp.Aliyun.PoolKey)
	vp.Aliyun.CityCode = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "aliyunCityCode", ""), getConfigValue(ctx, "virtual_phone", "aliyun_city_code", ""), vp.Aliyun.CityCode)
	vp.Tencent.SecretID = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "tencentSecretId", ""), getConfigValue(ctx, "virtual_phone", "tencent_secret_id", ""), vp.Tencent.SecretID)
	vp.Tencent.SecretKey = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "tencentSecretKey", ""), getConfigValue(ctx, "virtual_phone", "tencent_secret_key", ""), vp.Tencent.SecretKey)
	vp.Tencent.AppID = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "tencentAppId", ""), getConfigValue(ctx, "virtual_phone", "tencent_app_id", ""), vp.Tencent.AppID)
	vp.Tencent.PoolID = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "tencentPoolId", ""), getConfigValue(ctx, "virtual_phone", "tencent_pool_id", ""), vp.Tencent.PoolID)
	vp.Cloopen.AccountSid = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "cloopenAccountSid", ""), getConfigValue(ctx, "virtual_phone", "cloopen_account_sid", ""), vp.Cloopen.AccountSid)
	vp.Cloopen.AuthToken = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "cloopenAuthToken", ""), getConfigValue(ctx, "virtual_phone", "cloopen_auth_token", ""), vp.Cloopen.AuthToken)
	vp.Cloopen.AppID = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "cloopenAppId", ""), getConfigValue(ctx, "virtual_phone", "cloopen_app_id", ""), vp.Cloopen.AppID)
	vp.Huawei.AppKey = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "huaweiAppKey", ""), getConfigValue(ctx, "virtual_phone", "huawei_app_key", ""), vp.Huawei.AppKey)
	vp.Huawei.AppSecret = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "huaweiAppSecret", ""), getConfigValue(ctx, "virtual_phone", "huawei_app_secret", ""), vp.Huawei.AppSecret)
	vp.Huawei.DomainName = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "huaweiDomainName", ""), getConfigValue(ctx, "virtual_phone", "huawei_domain_name", ""), vp.Huawei.DomainName)
	vp.Custom.ProviderName = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "customProviderName", ""), getConfigValue(ctx, "virtual_phone", "custom_provider_name", ""), vp.Custom.ProviderName)
	vp.Custom.APIEndpoint = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "customApiEndpoint", ""), getConfigValue(ctx, "virtual_phone", "custom_api_endpoint", ""), vp.Custom.APIEndpoint)
	vp.Custom.AppKey = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "customAppKey", ""), getConfigValue(ctx, "virtual_phone", "custom_app_key", ""), vp.Custom.AppKey)
	vp.Custom.AppSecret = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "customAppSecret", ""), getConfigValue(ctx, "virtual_phone", "custom_app_secret", ""), vp.Custom.AppSecret)
	if bindTTL := firstNonEmpty(getConfigValue(ctx, "virtual_phone", "bindTTL", ""), getConfigValue(ctx, "virtual_phone", "bind_ttl", ""), ""); bindTTL != "" {
		if value, err := strconv.Atoi(bindTTL); err == nil {
			vp.BindExpire = value
		}
	}
	if maxDaily := firstNonEmpty(getConfigValue(ctx, "virtual_phone", "maxBindsPerDay", ""), getConfigValue(ctx, "virtual_phone", "max_binds_per_day", ""), ""); maxDaily != "" {
		if value, err := strconv.Atoi(maxDaily); err == nil {
			vp.MaxBindDaily = value
		}
	}
	if recording := firstNonEmpty(getConfigValue(ctx, "virtual_phone", "recordingEnabled", ""), getConfigValue(ctx, "virtual_phone", "recording_enabled", ""), ""); recording != "" {
		if value, err := strconv.ParseBool(recording); err == nil {
			vp.RecordingEnabled = value
		}
	}
	vp.PreCallPrompt = firstNonEmpty(getConfigValue(ctx, "virtual_phone", "noticeContent", ""), getConfigValue(ctx, "virtual_phone", "pre_call_prompt", ""), vp.PreCallPrompt)
}

// BindVirtualPhone 绑定虚拟号码（多服务商调度）
func (s *VirtualPhoneService) BindVirtualPhone(ctx context.Context, orderID int64, userPhone, talentPhone string) (*model.VirtualPhone, error) {
	s.refreshConfig(ctx)
	vpCfg := s.cfg.ThirdParty.VirtualPhone
	bindExpire := vpCfg.BindExpire
	if bindExpire <= 0 {
		bindExpire = 3600
	}

	// 检查日绑定上限
	todayKey := fmt.Sprintf("vphone:daily:%s", time.Now().Format("2006-01-02"))
	count, _ := s.redis.Incr(ctx, todayKey).Result()
	s.redis.Expire(ctx, todayKey, 24*time.Hour)
	if count > int64(vpCfg.MaxBindDaily) {
		return nil, fmt.Errorf("今日绑定次数已达上限(%d)", vpCfg.MaxBindDaily)
	}

	// 根据服务商分发绑定请求
	provider := vpCfg.Provider
	logger.Info("虚拟电话绑定: provider=%s, order=%d", provider, orderID)

	var virtualX, bindID string
	var err error

	switch provider {
	case "tencent":
		if vpCfg.Tencent.SecretID == "" {
			return nil, fmt.Errorf("腾讯云虚拟电话未配置，无法绑定真实隐私号码")
		}
		virtualX, bindID, err = s.tencentBindAXB(userPhone, talentPhone, bindExpire)
	case "cloopen":
		if vpCfg.Cloopen.AccountSid == "" {
			return nil, fmt.Errorf("容联云虚拟电话未配置，无法绑定真实隐私号码")
		}
		virtualX, bindID, err = s.cloopenBindCall(userPhone, talentPhone, bindExpire)
	case "huawei":
		if vpCfg.Huawei.AppKey == "" {
			return nil, fmt.Errorf("华为虚拟电话未配置，无法绑定真实隐私号码")
		}
		virtualX, bindID, err = s.huaweiBindAXB(userPhone, talentPhone, bindExpire)
	case "custom":
		if vpCfg.Custom.AppKey == "" {
			return nil, fmt.Errorf("自定义虚拟电话未配置，无法绑定真实隐私号码")
		}
		virtualX, bindID, err = s.customBind(userPhone, talentPhone, bindExpire)
	default: // "aliyun" or empty
		if vpCfg.Aliyun.AccessKeyID == "" {
			return nil, fmt.Errorf("阿里云虚拟电话未配置，无法绑定真实隐私号码")
		}
		virtualX, bindID, err = s.aliyunBindAXB(userPhone, talentPhone, bindExpire)
	}

	if err != nil {
		return nil, fmt.Errorf("绑定失败: %w", err)
	}

	vp := &model.VirtualPhone{
		OrderID:     orderID,
		UserPhone:   userPhone,
		TalentPhone: talentPhone,
		VirtualX:    virtualX,
		BindID:      bindID,
		ExpireAt:    time.Now().Add(time.Duration(bindExpire) * time.Second),
		Status:      0,
	}

	_, dbErr := s.db.NamedExecContext(ctx, `INSERT INTO virtual_phones (order_id, user_phone, talent_phone, virtual_x, bind_id, expire_at, status)
		VALUES (:order_id, :user_phone, :talent_phone, :virtual_x, :bind_id, :expire_at, :status)`, vp)
	if dbErr != nil {
		return nil, fmt.Errorf("保存绑定记录失败: %w", dbErr)
	}

	// 缓存到Redis
	cacheKey := fmt.Sprintf("vphone:order:%d", orderID)
	data, _ := json.Marshal(vp)
	s.redis.Set(ctx, cacheKey, data, time.Duration(bindExpire)*time.Second)

	logger.Info("虚拟号码绑定成功 [%s]: order=%d, user=%s, talent=%s, virtual=%s", provider, orderID, userPhone, talentPhone, virtualX)
	return vp, nil
}

// UnbindVirtualPhone 解绑虚拟号码（多服务商调度）
func (s *VirtualPhoneService) UnbindVirtualPhone(ctx context.Context, orderID int64) error {
	s.refreshConfig(ctx)
	// 从Redis获取绑定信息
	cacheKey := fmt.Sprintf("vphone:order:%d", orderID)
	data, err := s.redis.Get(ctx, cacheKey).Result()
	if err == redis.Nil {
		var vp model.VirtualPhone
		err := s.db.GetContext(ctx, &vp, "SELECT * FROM virtual_phones WHERE order_id = $1 AND status = 0 LIMIT 1", orderID)
		if err != nil {
			return fmt.Errorf("未找到绑定记录")
		}
		data2, _ := json.Marshal(vp)
		data = string(data2)
	}

	var vp model.VirtualPhone
	json.Unmarshal([]byte(data), &vp)

	if vp.BindID != "" && !strings.HasPrefix(vp.BindID, "mock_") {
		vpCfg := s.cfg.ThirdParty.VirtualPhone
		provider := vpCfg.Provider
		var unbindErr error
		switch provider {
		case "tencent":
			unbindErr = s.tencentUnbind(vp.BindID)
		case "cloopen":
			unbindErr = s.cloopenUnbind(vp.BindID)
		case "huawei":
			unbindErr = s.huaweiUnbind(vp.BindID)
		case "custom":
			unbindErr = s.customUnbind(vp.BindID)
		default: // aliyun
			if vpCfg.Aliyun.AccessKeyID != "" {
				unbindErr = s.aliyunUnbind(vp.BindID)
			}
		}
		if unbindErr != nil {
			logger.Warn("解绑API调用失败 [%s]: %v", provider, unbindErr)
		}
	}

	now := time.Now()
	s.db.ExecContext(ctx, "UPDATE virtual_phones SET status = 1, unbind_at = $1, updated_at = $1 WHERE order_id = $2 AND status = 0",
		now, orderID)
	s.redis.Del(ctx, cacheKey)

	logger.Info("虚拟号码已解绑: order=%d", orderID)
	return nil
}

// GetVirtualPhone 获取虚拟号码
func (s *VirtualPhoneService) GetVirtualPhone(ctx context.Context, orderID int64) (*model.VirtualPhone, error) {
	cacheKey := fmt.Sprintf("vphone:order:%d", orderID)
	data, err := s.redis.Get(ctx, cacheKey).Result()
	if err == redis.Nil {
		var vp model.VirtualPhone
		err := s.db.GetContext(ctx, &vp, "SELECT * FROM virtual_phones WHERE order_id = $1 AND status = 0 LIMIT 1", orderID)
		if err != nil {
			return nil, fmt.Errorf("无有效绑定")
		}
		return &vp, nil
	}
	var vp model.VirtualPhone
	json.Unmarshal([]byte(data), &vp)
	return &vp, nil
}

// aliyunBindAXB 阿里云AXB绑定
func (s *VirtualPhoneService) aliyunBindAXB(userPhone, talentPhone string, expireSec int) (virtualX, bindID string, err error) {
	cfg := s.cfg.ThirdParty.VirtualPhone.Aliyun
	params := map[string]string{
		"AccessKeyId":      cfg.AccessKeyID,
		"Action":           "BindAxb",
		"Format":           "JSON",
		"PoolKey":          cfg.PoolKey,
		"PhoneNoA":         userPhone,
		"PhoneNoB":         talentPhone,
		"Expiration":       fmt.Sprintf("%d", expireSec),
		"CallRecording":    "true",
		"SignatureMethod":  "HMAC-SHA1",
		"SignatureVersion": "1.0",
		"SignatureNonce":   fmt.Sprintf("%d", rand.Int63()),
		"Timestamp":        time.Now().UTC().Format("2006-01-02T15:04:05Z"),
		"Version":          "2017-05-25",
	}

	signature := s.aliyunSign(params, cfg.AccessKeySecret)
	params["Signature"] = signature

	queryStr := s.buildQuery(params)
	reqURL := fmt.Sprintf("https://dyplsapi.aliyuncs.com/?%s", queryStr)

	resp, err := http.Get(reqURL)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if code, ok := result["Code"].(string); ok && code == "OK" {
		data := result["SecretBindDTO"].(map[string]interface{})
		virtualX = data["SecretNo"].(string)
		bindID = data["SubsId"].(string)
		return
	}
	return "", "", fmt.Errorf("阿里云绑定失败: %v", result["Message"])
}

// aliyunUnbind 阿里云解绑
func (s *VirtualPhoneService) aliyunUnbind(bindID string) error {
	cfg := s.cfg.ThirdParty.VirtualPhone.Aliyun
	params := map[string]string{
		"AccessKeyId":      cfg.AccessKeyID,
		"Action":           "UnbindSubscription",
		"Format":           "JSON",
		"PoolKey":          cfg.PoolKey,
		"SubsId":           bindID,
		"SignatureMethod":  "HMAC-SHA1",
		"SignatureVersion": "1.0",
		"SignatureNonce":   fmt.Sprintf("%d", rand.Int63()),
		"Timestamp":        time.Now().UTC().Format("2006-01-02T15:04:05Z"),
		"Version":          "2017-05-25",
	}

	signature := s.aliyunSign(params, cfg.AccessKeySecret)
	params["Signature"] = signature

	queryStr := s.buildQuery(params)
	reqURL := fmt.Sprintf("https://dyplsapi.aliyuncs.com/?%s", queryStr)

	resp, err := http.Get(reqURL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

func (s *VirtualPhoneService) aliyunSign(params map[string]string, secret string) string {
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var canonicalized strings.Builder
	for _, k := range keys {
		canonicalized.WriteString("&")
		canonicalized.WriteString(specialURLEncode(k))
		canonicalized.WriteString("=")
		canonicalized.WriteString(specialURLEncode(params[k]))
	}
	stringToSign := "GET&%2F&" + specialURLEncode(canonicalized.String()[1:])
	h := hmac.New(sha1.New, []byte(secret+"&"))
	h.Write([]byte(stringToSign))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func (s *VirtualPhoneService) buildQuery(params map[string]string) string {
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var parts []string
	for _, k := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", specialURLEncode(k), specialURLEncode(params[k])))
	}
	return strings.Join(parts, "&")
}

func specialURLEncode(str string) string {
	encoded := url.QueryEscape(str)
	encoded = strings.ReplaceAll(encoded, "+", "%20")
	encoded = strings.ReplaceAll(encoded, "*", "%2A")
	encoded = strings.ReplaceAll(encoded, "%7E", "~")
	return encoded
}

// ===================== 服务商连接测试 =====================

// TestVirtualPhoneConnection 测试虚拟电话服务连接
func (s *VirtualPhoneService) TestVirtualPhoneConnection(ctx context.Context) error {
	vpCfg := s.cfg.ThirdParty.VirtualPhone
	provider := vpCfg.Provider

	switch provider {
	case "tencent":
		if vpCfg.Tencent.SecretID == "" || vpCfg.Tencent.SecretKey == "" {
			return fmt.Errorf("腾讯云配置不完整: SecretId/SecretKey 为空")
		}
		// TODO: 调用腾讯云 NPP DescribeCallBackCdr 验证连接
		logger.Info("腾讯云虚拟电话连接测试: appId=%s", vpCfg.Tencent.AppID)
		return nil
	case "cloopen":
		if vpCfg.Cloopen.AccountSid == "" || vpCfg.Cloopen.AuthToken == "" {
			return fmt.Errorf("容联云配置不完整: AccountSid/AuthToken 为空")
		}
		// TODO: 调用容联云 REST API 验证鉴权
		logger.Info("容联云虚拟电话连接测试: accountSid=%s", vpCfg.Cloopen.AccountSid)
		return nil
	case "huawei":
		if vpCfg.Huawei.AppKey == "" || vpCfg.Huawei.AppSecret == "" {
			return fmt.Errorf("华为云配置不完整: AppKey/AppSecret 为空")
		}
		// TODO: 调用华为云 Private Number API 验证连接
		logger.Info("华为云虚拟电话连接测试: appKey=%s", vpCfg.Huawei.AppKey)
		return nil
	case "custom":
		if vpCfg.Custom.AppKey == "" {
			return fmt.Errorf("自定义服务商配置不完整")
		}
		logger.Info("自定义服务商连接测试: provider=%s, endpoint=%s", vpCfg.Custom.ProviderName, vpCfg.Custom.APIEndpoint)
		return nil
	default: // aliyun
		if vpCfg.Aliyun.AccessKeyID == "" || vpCfg.Aliyun.AccessKeySecret == "" {
			return fmt.Errorf("阿里云配置不完整: AccessKey/Secret 为空")
		}
		// 阿里云测试：尝试查询号码池信息
		params := map[string]string{
			"AccessKeyId":      vpCfg.Aliyun.AccessKeyID,
			"Action":           "QueryPoolInfoList",
			"Format":           "JSON",
			"SignatureMethod":  "HMAC-SHA1",
			"SignatureVersion": "1.0",
			"SignatureNonce":   fmt.Sprintf("%d", rand.Int63()),
			"Timestamp":        time.Now().UTC().Format("2006-01-02T15:04:05Z"),
			"Version":          "2017-05-25",
		}
		sig := s.aliyunSign(params, vpCfg.Aliyun.AccessKeySecret)
		params["Signature"] = sig
		qs := s.buildQuery(params)
		reqURL := fmt.Sprintf("https://dyplsapi.aliyuncs.com/?%s", qs)
		resp, err := http.Get(reqURL)
		if err != nil {
			return fmt.Errorf("阿里云连接失败: %w", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			return fmt.Errorf("阿里云返回异常状态码: %d", resp.StatusCode)
		}
		logger.Info("阿里云虚拟电话连接测试成功")
		return nil
	}
}

// ===================== 腾讯云 NPP =====================

func (s *VirtualPhoneService) tencentBindAXB(userPhone, talentPhone string, expireSec int) (virtualX, bindID string, err error) {
	return "", "", fmt.Errorf("腾讯云虚拟电话真实接口尚未接入")
}

func (s *VirtualPhoneService) tencentUnbind(bindID string) error {
	return fmt.Errorf("腾讯云虚拟电话真实解绑接口尚未接入")
}

// ===================== 容联云双向回拨 =====================

func (s *VirtualPhoneService) cloopenBindCall(userPhone, talentPhone string, expireSec int) (virtualX, bindID string, err error) {
	return "", "", fmt.Errorf("容联云虚拟电话真实接口尚未接入")
}

func (s *VirtualPhoneService) cloopenUnbind(bindID string) error {
	return fmt.Errorf("容联云虚拟电话真实解绑接口尚未接入")
}

// ===================== 华为隐私保护通话 =====================

func (s *VirtualPhoneService) huaweiBindAXB(userPhone, talentPhone string, expireSec int) (virtualX, bindID string, err error) {
	return "", "", fmt.Errorf("华为云虚拟电话真实接口尚未接入")
}

func (s *VirtualPhoneService) huaweiUnbind(bindID string) error {
	return fmt.Errorf("华为云虚拟电话真实解绑接口尚未接入")
}

// ===================== 自定义服务商 =====================

func (s *VirtualPhoneService) customBind(userPhone, talentPhone string, expireSec int) (virtualX, bindID string, err error) {
	return "", "", fmt.Errorf("自定义虚拟电话真实接口尚未接入")
}

func (s *VirtualPhoneService) customUnbind(bindID string) error {
	return fmt.Errorf("自定义虚拟电话真实解绑接口尚未接入")
}
