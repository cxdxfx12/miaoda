// Package service 业务逻辑层 - 短信服务
package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha1"
	"crypto/sha256"
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

// SmsService 短信服务
type SmsService struct {
	db    *sqlx.DB
	redis *redis.Client
	cfg   *config.Config
}

// NewSmsService 创建短信服务
func NewSmsService(db *sqlx.DB, redis *redis.Client, cfg *config.Config) *SmsService {
	return &SmsService{db: db, redis: redis, cfg: cfg}
}

// SendSmsCode 发送短信验证码
func (s *SmsService) SendSmsCode(ctx context.Context, phone, typ, ip string) error {
	// 频率限制检查
	rateLimitKey := fmt.Sprintf("sms:rate:%s:%s", phone, typ)
	rateLimit := s.cfg.ThirdParty.Sms.RateLimit
	if rateLimit <= 0 {
		rateLimit = 60
	}
	exists, _ := s.redis.Exists(ctx, rateLimitKey).Result()
	if exists > 0 {
		return fmt.Errorf("发送过于频繁，请%d秒后再试", rateLimit)
	}

	// 生成6位验证码
	code := fmt.Sprintf("%06d", rand.Intn(1000000))

	// 选择短信提供商
	provider := s.cfg.ThirdParty.Sms.Provider
	if provider == "" {
		provider = "aliyun"
	}

	var err error
	var content string
	switch provider {
	case "tencent":
		err = s.sendViaTencent(phone, code, typ)
	default:
		err = s.sendViaAliyun(phone, code, typ)
	}

	// 记录短信日志
	log := &model.SmsLog{
		Phone:    phone,
		Code:     code,
		Type:     typ,
		Content:  content,
		Provider: provider,
		Status:   1,
		IP:       ip,
	}
	if err != nil {
		log.Status = 2
		log.Result = err.Error()
	} else {
		log.Status = 1
		log.Result = "success"
	}
	_, dbErr := s.db.NamedExecContext(ctx, `INSERT INTO sms_logs (phone, code, type, content, provider, status, result, ip) 
		VALUES (:phone, :code, :type, :content, :provider, :status, :result, :ip)`, log)
	if dbErr != nil {
		logger.Warn("记录短信日志失败: %v", dbErr)
	}

	if err != nil {
		return fmt.Errorf("短信发送失败: %w", err)
	}

	// 存储验证码到Redis（5分钟有效）
	codeExpire := s.cfg.ThirdParty.Sms.CodeExpire
	if codeExpire <= 0 {
		codeExpire = 300
	}
	codeKey := fmt.Sprintf("sms:code:%s:%s", phone, typ)
	s.redis.Set(ctx, codeKey, code, time.Duration(codeExpire)*time.Second)
	s.redis.Set(ctx, rateLimitKey, "1", time.Duration(rateLimit)*time.Second)

	logger.Info("验证码已发送: phone=%s, type=%s", phone, typ)
	return nil
}

// VerifySmsCode 验证短信验证码
func (s *SmsService) VerifySmsCode(ctx context.Context, phone, code, typ string) (bool, error) {
	codeKey := fmt.Sprintf("sms:code:%s:%s", phone, typ)
	storedCode, err := s.redis.Get(ctx, codeKey).Result()
	if err == redis.Nil {
		return false, fmt.Errorf("验证码已过期，请重新获取")
	}
	if err != nil {
		return false, fmt.Errorf("验证码校验失败")
	}

	if storedCode != code {
		return false, fmt.Errorf("验证码错误")
	}

	// 验证成功后删除验证码
	s.redis.Del(ctx, codeKey)
	return true, nil
}

// sendViaAliyun 阿里云短信发送
func (s *SmsService) sendViaAliyun(phone, code, typ string) error {
	cfg := s.cfg.ThirdParty.Sms.Aliyun
	if cfg.AccessKeyID == "" {
		logger.Warn("阿里云短信未配置，使用模拟模式: phone=%s, code=%s", phone, code)
		return nil
	}

	templateParam := fmt.Sprintf(`{"code":"%s"}`, code)
	params := map[string]string{
		"AccessKeyId":      cfg.AccessKeyID,
		"Action":           "SendSms",
		"Format":           "JSON",
		"PhoneNumbers":     phone,
		"SignName":         cfg.SignName,
		"TemplateCode":     cfg.TemplateCode,
		"TemplateParam":    templateParam,
		"SignatureMethod":  "HMAC-SHA1",
		"SignatureVersion": "1.0",
		"SignatureNonce":   fmt.Sprintf("%d", rand.Int63()),
		"Timestamp":        time.Now().UTC().Format("2006-01-02T15:04:05Z"),
		"Version":          "2017-05-25",
		"RegionId":         "cn-hangzhou",
	}

	// 计算签名
	signature := s.aliyunSign(params, cfg.AccessKeySecret)
	params["Signature"] = signature

	// 构建请求
	queryStr := s.buildQuery(params)
	reqURL := fmt.Sprintf("https://dysmsapi.aliyuncs.com/?%s", queryStr)

	resp, err := http.Get(reqURL)
	if err != nil {
		return fmt.Errorf("短信请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	if code, ok := result["Code"].(string); ok && code == "OK" {
		return nil
	}
	return fmt.Errorf("短信发送失败: %v", result["Message"])
}

// aliyunSign 阿里云签名计算
func (s *SmsService) aliyunSign(params map[string]string, secret string) string {
	// 排序参数
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// 构建签名字符串
	var canonicalized strings.Builder
	for _, k := range keys {
		canonicalized.WriteString("&")
		canonicalized.WriteString(s.specialURLEncode(k))
		canonicalized.WriteString("=")
		canonicalized.WriteString(s.specialURLEncode(params[k]))
	}
	stringToSign := "GET&%2F&" + s.specialURLEncode(canonicalized.String()[1:])

	// HMAC-SHA1签名
	key := secret + "&"
	h := hmac.New(sha1.New, []byte(key))
	h.Write([]byte(stringToSign))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func (s *SmsService) specialURLEncode(str string) string {
	encoded := url.QueryEscape(str)
	encoded = strings.ReplaceAll(encoded, "+", "%20")
	encoded = strings.ReplaceAll(encoded, "*", "%2A")
	encoded = strings.ReplaceAll(encoded, "%7E", "~")
	return encoded
}

func (s *SmsService) buildQuery(params map[string]string) string {
	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var parts []string
	for _, k := range keys {
		parts = append(parts, fmt.Sprintf("%s=%s", s.specialURLEncode(k), s.specialURLEncode(params[k])))
	}
	return strings.Join(parts, "&")
}

// sendViaTencent 腾讯云短信发送
func (s *SmsService) sendViaTencent(phone, code, typ string) error {
	cfg := s.cfg.ThirdParty.Sms.Tencent
	if cfg.AppID == "" {
		logger.Warn("腾讯云短信未配置，使用模拟模式: phone=%s, code=%s", phone, code)
		return nil
	}

	timestamp := time.Now().Unix()
	reqBody := map[string]interface{}{
		"PhoneNumberSet":   []string{"+86" + phone},
		"SmsSdkAppId":      cfg.AppID,
		"TemplateId":       cfg.TemplateID,
		"SignName":         cfg.SignName,
		"TemplateParamSet": []string{code},
	}

	body, _ := json.Marshal(reqBody)
	payload := string(body)

	// 腾讯云API v3签名
	service := "sms"
	host := "sms.tencentcloudapi.com"
	action := "SendSms"
	version := "2021-01-11"
	algorithm := "TC3-HMAC-SHA256"
	date := time.Unix(timestamp, 0).UTC().Format("2006-01-02")

	// CanonicalRequest
	canonicalHeaders := fmt.Sprintf("content-type:application/json\nhost:%s\n", host)
	signedHeaders := "content-type;host"
	hashedPayload := fmt.Sprintf("%x", sha256.Sum256([]byte(payload)))
	canonicalRequest := fmt.Sprintf("POST\n/\n\n%s\n%s\n%s", canonicalHeaders, signedHeaders, hashedPayload)

	// StringToSign
	credentialScope := fmt.Sprintf("%s/%s/tc3_request", date, service)
	hashedCanonical := fmt.Sprintf("%x", sha256.Sum256([]byte(canonicalRequest)))
	stringToSign := fmt.Sprintf("%s\n%d\n%s\n%s", algorithm, timestamp, credentialScope, hashedCanonical)

	// Signature
	secretDate := s.hmacSHA256([]byte("TC3"+cfg.AppKey), date)
	secretService := s.hmacSHA256(secretDate, service)
	secretSigning := s.hmacSHA256(secretService, "tc3_request")
	signature := fmt.Sprintf("%x", s.hmacSHA256(secretSigning, stringToSign))

	authorization := fmt.Sprintf("%s Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		algorithm, cfg.AppID, credentialScope, signedHeaders, signature)

	httpReq, _ := http.NewRequest("POST", "https://"+host, strings.NewReader(payload))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Host", host)
	httpReq.Header.Set("X-TC-Action", action)
	httpReq.Header.Set("X-TC-Version", version)
	httpReq.Header.Set("X-TC-Timestamp", fmt.Sprintf("%d", timestamp))
	httpReq.Header.Set("Authorization", authorization)

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("短信请求失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(respBody, &result)

	if respStatus, ok := result["Response"].(map[string]interface{}); ok {
		if errCode, ok := respStatus["Error"].(map[string]interface{}); ok {
			return fmt.Errorf("短信发送失败: %v", errCode["Message"])
		}
	}
	return nil
}

func (s *SmsService) hmacSHA256(key []byte, data string) []byte {
	h := hmac.New(sha256.New, key)
	h.Write([]byte(data))
	return h.Sum(nil)
}
