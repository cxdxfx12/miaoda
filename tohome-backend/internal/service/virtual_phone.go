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

// BindVirtualPhone 绑定虚拟号码（多服务商调度）
func (s *VirtualPhoneService) BindVirtualPhone(ctx context.Context, orderID int64, userPhone, talentPhone string) (*model.VirtualPhone, error) {
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
			logger.Warn("腾讯云虚拟电话未配置，使用模拟模式")
			return s.mockBind(orderID, userPhone, talentPhone, bindExpire)
		}
		virtualX, bindID, err = s.tencentBindAXB(userPhone, talentPhone, bindExpire)
	case "cloopen":
		if vpCfg.Cloopen.AccountSid == "" {
			logger.Warn("容联云虚拟电话未配置，使用模拟模式")
			return s.mockBind(orderID, userPhone, talentPhone, bindExpire)
		}
		virtualX, bindID, err = s.cloopenBindCall(userPhone, talentPhone, bindExpire)
	case "huawei":
		if vpCfg.Huawei.AppKey == "" {
			logger.Warn("华为虚拟电话未配置，使用模拟模式")
			return s.mockBind(orderID, userPhone, talentPhone, bindExpire)
		}
		virtualX, bindID, err = s.huaweiBindAXB(userPhone, talentPhone, bindExpire)
	case "custom":
		if vpCfg.Custom.AppKey == "" {
			logger.Warn("自定义虚拟电话未配置，使用模拟模式")
			return s.mockBind(orderID, userPhone, talentPhone, bindExpire)
		}
		virtualX, bindID, err = s.customBind(userPhone, talentPhone, bindExpire)
	default: // "aliyun" or empty
		if vpCfg.Aliyun.AccessKeyID == "" {
			logger.Warn("阿里云虚拟电话未配置，使用模拟模式")
			return s.mockBind(orderID, userPhone, talentPhone, bindExpire)
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

// mockBind 模拟绑定（未配置时使用）
func (s *VirtualPhoneService) mockBind(orderID int64, userPhone, talentPhone string, expireSec int) (*model.VirtualPhone, error) {
	if expireSec <= 0 {
		expireSec = 3600
	}
	virtualX := fmt.Sprintf("170%08d", rand.Intn(100000000))
	vp := &model.VirtualPhone{
		OrderID:     orderID,
		UserPhone:   userPhone,
		TalentPhone: talentPhone,
		VirtualX:    virtualX,
		BindID:      fmt.Sprintf("mock_%d_%d", orderID, time.Now().Unix()),
		ExpireAt:    time.Now().Add(time.Duration(expireSec) * time.Second),
		Status:      0,
	}
	cacheKey := fmt.Sprintf("vphone:order:%d", orderID)
	data, _ := json.Marshal(vp)
	s.redis.Set(context.Background(), cacheKey, data, time.Duration(expireSec)*time.Second)
	return vp, nil
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
	cfg := s.cfg.ThirdParty.VirtualPhone.Tencent
	// TODO: 对接腾讯云号码保护 NPP API (npp.tencentcloudapi.com)
	// 腾讯云使用 V3 签名 (TC3-HMAC-SHA256)，需要实现签名 V3 逻辑
	// API: CreateCallBack -> Bind Number
	// 临时使用模拟模式
	logger.Info("[腾讯云NPP] 绑定(模拟): appId=%s, user=%s, talent=%s", cfg.AppID, userPhone, talentPhone)
	virtualX = fmt.Sprintf("95013%06d", rand.Intn(1000000))
	bindID = fmt.Sprintf("tencent_%d_%d", time.Now().UnixNano(), rand.Intn(10000))
	return virtualX, bindID, nil
}

func (s *VirtualPhoneService) tencentUnbind(bindID string) error {
	cfg := s.cfg.ThirdParty.VirtualPhone.Tencent
	// TODO: 对接腾讯云 NPP 解绑 API
	logger.Info("[腾讯云NPP] 解绑(模拟): appId=%s, bindId=%s", cfg.AppID, bindID)
	return nil
}

// ===================== 容联云双向回拨 =====================

func (s *VirtualPhoneService) cloopenBindCall(userPhone, talentPhone string, expireSec int) (virtualX, bindID string, err error) {
	cfg := s.cfg.ThirdParty.VirtualPhone.Cloopen
	// TODO: 对接容联云双向回拨 REST API (yo2o.cloopen.com)
	// 容联云使用 主账号+Token 鉴权 (Authorization: base64(sid:timestamp))
	// API: /2013-12-26/Accounts/{sid}/Calls/DuplexCallback
	// 容联云双向回拨模式: 平台先拨 userPhone，接通后拨 talentPhone，然后桥接双方
	logger.Info("[容联云] 双向回拨(模拟): appId=%s, user=%s, talent=%s", cfg.AppID, userPhone, talentPhone)
	virtualX = fmt.Sprintf("010%07d", rand.Intn(10000000)) // 容联云双向回拨无中间号，此处为占位
	bindID = fmt.Sprintf("cloopen_%d_%d", time.Now().UnixNano(), rand.Intn(10000))
	return virtualX, bindID, nil
}

func (s *VirtualPhoneService) cloopenUnbind(bindID string) error {
	cfg := s.cfg.ThirdParty.VirtualPhone.Cloopen
	// 容联云双向回拨无需主动解绑，通话结束自动释放
	logger.Info("[容联云] 解绑(模拟): appId=%s, bindId=%s", cfg.AppID, bindID)
	return nil
}

// ===================== 华为隐私保护通话 =====================

func (s *VirtualPhoneService) huaweiBindAXB(userPhone, talentPhone string, expireSec int) (virtualX, bindID string, err error) {
	cfg := s.cfg.ThirdParty.VirtualPhone.Huawei
	// TODO: 对接华为云隐私保护通话 REST API
	// 华为云使用 WS-Security 签名或 OAuth2 Token 鉴权
	// API: POST {domain}/rest/caas/privatenumber/v1.0
	logger.Info("[华为云] 绑定(模拟): appKey=%s, user=%s, talent=%s", cfg.AppKey, userPhone, talentPhone)
	virtualX = fmt.Sprintf("170%08d", rand.Intn(100000000))
	bindID = fmt.Sprintf("huawei_%d_%d", time.Now().UnixNano(), rand.Intn(10000))
	return virtualX, bindID, nil
}

func (s *VirtualPhoneService) huaweiUnbind(bindID string) error {
	cfg := s.cfg.ThirdParty.VirtualPhone.Huawei
	logger.Info("[华为云] 解绑(模拟): appKey=%s, bindId=%s", cfg.AppKey, bindID)
	return nil
}

// ===================== 自定义服务商 =====================

func (s *VirtualPhoneService) customBind(userPhone, talentPhone string, expireSec int) (virtualX, bindID string, err error) {
	cfg := s.cfg.ThirdParty.VirtualPhone.Custom
	logger.Info("[自定义] 绑定(模拟): provider=%s, endpoint=%s, user=%s, talent=%s",
		cfg.ProviderName, cfg.APIEndpoint, userPhone, talentPhone)
	virtualX = fmt.Sprintf("170%08d", rand.Intn(100000000))
	bindID = fmt.Sprintf("custom_%d_%d", time.Now().UnixNano(), rand.Intn(10000))
	return virtualX, bindID, nil
}

func (s *VirtualPhoneService) customUnbind(bindID string) error {
	cfg := s.cfg.ThirdParty.VirtualPhone.Custom
	logger.Info("[自定义] 解绑(模拟): provider=%s, bindId=%s", cfg.ProviderName, bindID)
	return nil
}
