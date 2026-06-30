// Package config 提供配置加载功能
package config

import (
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config 全局配置
type Config struct {
	App        AppConfig        `mapstructure:"app"`
	Services   ServicesConfig   `mapstructure:"services"`
	Database   DatabaseConfig   `mapstructure:"database"`
	Redis      RedisConfig      `mapstructure:"redis"`
	RabbitMQ   RabbitMQConfig   `mapstructure:"rabbitmq"`
	JWT        JWTConfig        `mapstructure:"jwt"`
	Log        LogConfig        `mapstructure:"log"`
	ThirdParty ThirdPartyConfig `mapstructure:"third_party"`
	Payment    PaymentConfig    `mapstructure:"payment"`
	Platform   PlatformConfig   `mapstructure:"platform"`
	Dispatch   DispatchConfig   `mapstructure:"dispatch"`
}

// AppConfig 应用配置
type AppConfig struct {
	Name    string `mapstructure:"name"`
	Env     string `mapstructure:"env"`
	Version string `mapstructure:"version"`
	Debug   bool   `mapstructure:"debug"`
	Company string `mapstructure:"company"`
}

// ServicesConfig 服务端口配置
type ServicesConfig struct {
	GatewayHost  string `mapstructure:"gateway_host"`
	Gateway      int    `mapstructure:"gateway"`
	UserHost     string `mapstructure:"user_host"`
	User         int    `mapstructure:"user"`
	OrderHost    string `mapstructure:"order_host"`
	Order        int    `mapstructure:"order"`
	TalentHost   string `mapstructure:"talent_host"`
	Talent       int    `mapstructure:"talent"`
	PaymentHost  string `mapstructure:"payment_host"`
	Payment      int    `mapstructure:"payment"`
	DispatchHost string `mapstructure:"dispatch_host"`
	Dispatch     int    `mapstructure:"dispatch"`
}

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Host            string        `mapstructure:"host"`
	Port            int           `mapstructure:"port"`
	User            string        `mapstructure:"user"`
	Password        string        `mapstructure:"password"`
	DBName          string        `mapstructure:"dbname"`
	SSLMode         string        `mapstructure:"sslmode"`
	MaxOpenConns    int           `mapstructure:"max_open_conns"`
	MaxIdleConns    int           `mapstructure:"max_idle_conns"`
	ConnMaxLifetime time.Duration `mapstructure:"conn_max_lifetime"`
}

// DSN 生成数据库连接字符串
func (d *DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.DBName, d.SSLMode,
	)
}

// RedisConfig Redis配置
type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
	PoolSize int    `mapstructure:"pool_size"`
}

// Addr Redis地址
func (r *RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}

// RabbitMQConfig RabbitMQ配置
type RabbitMQConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Vhost    string `mapstructure:"vhost"`
}

// URL RabbitMQ连接URL
func (r *RabbitMQConfig) URL() string {
	return fmt.Sprintf("amqp://%s:%s@%s:%d%s", r.User, r.Password, r.Host, r.Port, r.Vhost)
}

// JWTConfig JWT配置
type JWTConfig struct {
	Secret        string `mapstructure:"secret"`
	Expire        int    `mapstructure:"expire"`
	RefreshExpire int    `mapstructure:"refresh_expire"`
	Issuer        string `mapstructure:"issuer"`
}

// LogConfig 日志配置
type LogConfig struct {
	Level    string `mapstructure:"level"`
	Format   string `mapstructure:"format"`
	Output   string `mapstructure:"output"`
	FilePath string `mapstructure:"file_path"`
}

// ThirdPartyConfig 第三方服务配置
type ThirdPartyConfig struct {
	AMap         AMapConfig                   `mapstructure:"amap"`
	TencentMap   TencentMapConfig             `mapstructure:"tencent_map"`
	BaiduMap     BaiduMapConfig               `mapstructure:"baidu_map"`
	WeChat       WechatPayConfig              `mapstructure:"wechat"`
	WechatMP     WechatMPConfig               `mapstructure:"wechat_mp"`
	Alipay       AlipayPayConfig              `mapstructure:"alipay"`
	Sms          ThirdPartySMSConfig          `mapstructure:"sms"`
	VirtualPhone ThirdPartyVirtualPhoneConfig `mapstructure:"virtual_phone"`
	Push         PushConfig                   `mapstructure:"push"`
}

// AMapConfig 高德地图配置
type AMapConfig struct {
	Key          string `mapstructure:"key"`
	Secret       string `mapstructure:"secret"`
	SearchRadius int    `mapstructure:"search_radius"`
	CacheEnabled bool   `mapstructure:"cache_enabled"`
	CacheTTL     int    `mapstructure:"cache_ttl"`
}

// TencentMapConfig 腾讯地图配置
type TencentMapConfig struct {
	Key string `mapstructure:"key"`
}

// BaiduMapConfig 百度地图配置
type BaiduMapConfig struct {
	Key string `mapstructure:"key"`
}

// PushConfig 推送配置
type PushConfig struct {
	Provider string `mapstructure:"provider"`
	JPush    struct {
		AppKey       string `mapstructure:"app_key"`
		MasterSecret string `mapstructure:"master_secret"`
	} `mapstructure:"jpush"`
	GeTui struct {
		AppID        string `mapstructure:"app_id"`
		AppKey       string `mapstructure:"app_key"`
		MasterSecret string `mapstructure:"master_secret"`
	} `mapstructure:"getui"`
}

// ThirdPartySMSConfig 第三方短信配置(兼容旧格式: third_party.sms)
type ThirdPartySMSConfig struct {
	Provider   string           `mapstructure:"provider"`
	Aliyun     SMSAliyunConfig  `mapstructure:"aliyun"`
	Tencent    SMSTencentConfig `mapstructure:"tencent"`
	SmsBao     SMSSmsBaoConfig  `mapstructure:"smsbao"`
	RateLimit  int              `mapstructure:"rate_limit"`
	CodeExpire int              `mapstructure:"code_expire"`
}

// SMSSmsBaoConfig 短信宝配置
type SMSSmsBaoConfig struct {
	Username  string `mapstructure:"username"`
	APIKey    string `mapstructure:"api_key"`
	SignName  string `mapstructure:"sign_name"`
}

// ThirdPartyVirtualPhoneConfig 虚拟电话配置
type ThirdPartyVirtualPhoneConfig struct {
	Provider         string                    `mapstructure:"provider"`
	Aliyun           VirtualPhoneAliyunConfig  `mapstructure:"aliyun"`
	Tencent          VirtualPhoneTencentConfig `mapstructure:"tencent"`
	Cloopen          VirtualPhoneCloopenConfig `mapstructure:"cloopen"`
	Huawei           VirtualPhoneHuaweiConfig  `mapstructure:"huawei"`
	Custom           VirtualPhoneCustomConfig  `mapstructure:"custom"`
	BindExpire       int                       `mapstructure:"bind_expire"`
	MaxBindDaily     int                       `mapstructure:"max_bind_daily"`
	RecordingEnabled bool                      `mapstructure:"recording_enabled"`
	PreCallPrompt    string                    `mapstructure:"pre_call_prompt"`
}

// VirtualPhoneAliyunConfig 阿里云隐私号配置
type VirtualPhoneAliyunConfig struct {
	AccessKeyID     string `mapstructure:"access_key_id"`
	AccessKeySecret string `mapstructure:"access_key_secret"`
	PoolKey         string `mapstructure:"pool_key"`
	CityCode        string `mapstructure:"city_code"`
}

// VirtualPhoneTencentConfig 腾讯云 NPP 配置
type VirtualPhoneTencentConfig struct {
	SecretID  string `mapstructure:"secret_id"`
	SecretKey string `mapstructure:"secret_key"`
	AppID     string `mapstructure:"app_id"`
	PoolID    string `mapstructure:"pool_id"`
}

// VirtualPhoneCloopenConfig 容联云双向回拨配置
type VirtualPhoneCloopenConfig struct {
	AccountSid string `mapstructure:"account_sid"`
	AuthToken  string `mapstructure:"auth_token"`
	AppID      string `mapstructure:"app_id"`
}

// VirtualPhoneHuaweiConfig 华为隐私保护通话配置
type VirtualPhoneHuaweiConfig struct {
	AppKey     string `mapstructure:"app_key"`
	AppSecret  string `mapstructure:"app_secret"`
	DomainName string `mapstructure:"domain_name"`
}

// VirtualPhoneCustomConfig 自定义虚拟号服务商配置
type VirtualPhoneCustomConfig struct {
	ProviderName string `mapstructure:"provider_name"`
	APIEndpoint  string `mapstructure:"api_endpoint"`
	AppKey       string `mapstructure:"app_key"`
	AppSecret    string `mapstructure:"app_secret"`
}

// Load 加载配置
func Load(configPath string) (*Config, error) {
	viper.SetConfigFile(configPath)
	viper.SetConfigType("yaml")
	viper.AutomaticEnv()
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// 绑定 compose 环境变量到 config 路径
	_ = viper.BindEnv("app.env", "APP_ENV")
	_ = viper.BindEnv("app.debug", "APP_DEBUG")

	_ = viper.BindEnv("database.host", "POSTGRES_HOST")
	_ = viper.BindEnv("database.port", "POSTGRES_PORT")
	_ = viper.BindEnv("database.user", "POSTGRES_USER")
	_ = viper.BindEnv("database.password", "POSTGRES_PASSWORD")
	_ = viper.BindEnv("database.dbname", "POSTGRES_DB")
	_ = viper.BindEnv("database.sslmode", "POSTGRES_SSLMODE")

	_ = viper.BindEnv("redis.host", "REDIS_HOST")
	_ = viper.BindEnv("redis.port", "REDIS_PORT")
	_ = viper.BindEnv("redis.password", "REDIS_PASSWORD")
	_ = viper.BindEnv("redis.db", "REDIS_DB")

	_ = viper.BindEnv("rabbitmq.host", "RABBITMQ_HOST")
	_ = viper.BindEnv("rabbitmq.port", "RABBITMQ_PORT")
	_ = viper.BindEnv("rabbitmq.user", "RABBITMQ_USER")
	_ = viper.BindEnv("rabbitmq.password", "RABBITMQ_PASSWORD")
	_ = viper.BindEnv("rabbitmq.vhost", "RABBITMQ_VHOST")

	_ = viper.BindEnv("jwt.secret", "JWT_SECRET")
	_ = viper.BindEnv("jwt.expire", "JWT_EXPIRE")
	_ = viper.BindEnv("jwt.refresh_expire", "JWT_REFRESH_EXPIRE")
	_ = viper.BindEnv("jwt.issuer", "JWT_ISSUER")

	// 服务 host 环境变量（Docker 中为容器名，本地为 127.0.0.1）
	_ = viper.BindEnv("services.gateway_host", "SVC_GATEWAY_HOST")
	_ = viper.BindEnv("services.user_host", "SVC_USER_HOST")
	_ = viper.BindEnv("services.order_host", "SVC_ORDER_HOST")
	_ = viper.BindEnv("services.talent_host", "SVC_TALENT_HOST")
	_ = viper.BindEnv("services.payment_host", "SVC_PAYMENT_HOST")
	_ = viper.BindEnv("services.dispatch_host", "SVC_DISPATCH_HOST")
	_ = viper.BindEnv("services.gateway", "SVC_GATEWAY_PORT")
	_ = viper.BindEnv("services.user", "SVC_USER_PORT")
	_ = viper.BindEnv("services.order", "SVC_ORDER_PORT")
	_ = viper.BindEnv("services.talent", "SVC_TALENT_PORT")
	_ = viper.BindEnv("services.payment", "SVC_PAYMENT_PORT")
	_ = viper.BindEnv("services.dispatch", "SVC_DISPATCH_PORT")

	_ = viper.BindEnv("payment.wechat.app_id", "WECHAT_APP_ID")
	_ = viper.BindEnv("payment.wechat.mch_id", "WECHAT_MCH_ID")
	_ = viper.BindEnv("payment.wechat.api_key", "WECHAT_API_KEY")
	_ = viper.BindEnv("payment.wechat.api_v3_key", "WECHAT_API_V3_KEY")
	_ = viper.BindEnv("payment.wechat.notify_url", "WECHAT_NOTIFY_URL")
	_ = viper.BindEnv("payment.alipay.app_id", "ALIPAY_APP_ID")
	_ = viper.BindEnv("payment.alipay.private_key", "ALIPAY_PRIVATE_KEY")
	_ = viper.BindEnv("payment.alipay.alipay_public_key", "ALIPAY_PUBLIC_KEY")
	_ = viper.BindEnv("payment.alipay.notify_url", "ALIPAY_NOTIFY_URL")

	_ = viper.BindEnv("third_party.amap.key", "AMAP_KEY")
	_ = viper.BindEnv("third_party.amap.secret", "AMAP_SECRET")
	_ = viper.BindEnv("third_party.wechat_mp.app_id", "WECHAT_MP_APP_ID")
	_ = viper.BindEnv("third_party.wechat_mp.app_secret", "WECHAT_MP_APP_SECRET")

	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("读取配置文件失败: %w", err)
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("解析配置失败: %w", err)
	}

	return &config, nil
}

// GetString 获取字符串配置
func GetString(key string) string {
	return viper.GetString(key)
}

// GetInt 获取整数配置
func GetInt(key string) int {
	return viper.GetInt(key)
}

// GetBool 获取布尔配置
func GetBool(key string) bool {
	return viper.GetBool(key)
}

// ===================== 支付配置 =====================

// PaymentConfig 支付配置
type PaymentConfig struct {
	WeChat   WechatPayConfig `mapstructure:"wechat"`
	Alipay   AlipayPayConfig `mapstructure:"alipay"`
	Platform PlatformConfig  `mapstructure:"platform"`
}

// WechatPayConfig 微信支付配置
type WechatPayConfig struct {
	AppID          string `mapstructure:"app_id"`
	MchID          string `mapstructure:"mch_id"`
	APIKey         string `mapstructure:"api_key"`
	APIV3Key       string `mapstructure:"api_v3_key"`
	PrivateKeyPath string `mapstructure:"private_key_path"`
	NotifyURL      string `mapstructure:"notify_url"`
}

// WechatMPConfig 微信公众号/服务号配置（OAuth登录）
type WechatMPConfig struct {
	AppID          string `mapstructure:"app_id"`
	AppSecret      string `mapstructure:"app_secret"`
	Token          string `mapstructure:"token"`
	EncodingAESKey string `mapstructure:"encoding_aes_key"`
	RedirectURI    string `mapstructure:"redirect_uri"`
	Enabled        bool   `mapstructure:"enabled"`
}

// AlipayPayConfig 支付宝支付配置
type AlipayPayConfig struct {
	AppID           string `mapstructure:"app_id"`
	PrivateKey      string `mapstructure:"private_key"`
	AlipayPublicKey string `mapstructure:"alipay_public_key"`
	NotifyURL       string `mapstructure:"notify_url"`
	GatewayURL      string `mapstructure:"gateway_url"`
}

// PlatformConfig 平台分账配置
type PlatformConfig struct {
	CommissionRate float64 `mapstructure:"commission_rate"`
	MinWithdraw    float64 `mapstructure:"min_withdraw"`
	SettleCycle    string  `mapstructure:"settle_cycle"`
}

// ===================== 短信配置(共享类型) =====================

// SMSAliyunConfig 阿里云短信配置
type SMSAliyunConfig struct {
	AccessKeyID     string `mapstructure:"access_key_id"`
	AccessKeySecret string `mapstructure:"access_key_secret"`
	SignName        string `mapstructure:"sign_name"`
	TemplateCode    string `mapstructure:"template_code"`
}

// SMSTencentConfig 腾讯云短信配置
type SMSTencentConfig struct {
	AppID      string `mapstructure:"app_id"`
	AppKey     string `mapstructure:"app_key"`
	SignName   string `mapstructure:"sign_name"`
	TemplateID string `mapstructure:"template_id"`
}

// ===================== 派单配置 =====================

// DispatchConfig 派单配置
type DispatchConfig struct {
	MatchRadius         int             `mapstructure:"match_radius"`
	MaxConcurrentOrders int             `mapstructure:"max_concurrent_orders"`
	TimeoutRetry        int             `mapstructure:"timeout_retry"`
	ScanInterval        int             `mapstructure:"scan_interval"`
	Weights             DispatchWeights `mapstructure:"weights"`
}

// DispatchWeights 派单权重配置
type DispatchWeights struct {
	Distance       int `mapstructure:"distance"`
	Rating         int `mapstructure:"rating"`
	CompletionRate int `mapstructure:"completion_rate"`
	ResponseTime   int `mapstructure:"response_time"`
}
