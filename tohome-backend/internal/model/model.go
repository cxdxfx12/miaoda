// Package model 定义数据模型
package model

import (
	"database/sql"
	"time"
)

// BaseModel 基础模型
type BaseModel struct {
	ID        int64        `db:"id" json:"id"`
	CreatedAt time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt time.Time    `db:"updated_at" json:"updated_at"`
	DeletedAt sql.NullTime `db:"deleted_at" json:"-"`
}

// UserStatus 用户状态
const (
	UserStatusDisabled = 0
	UserStatusNormal   = 1
)

// MemberLevel 会员等级
const (
	MemberLevelNormal = 0
	MemberLevelSilver = 1
	MemberLevelGold   = 2
	MemberLevelDiamond = 3
)

// User 用户模型
type User struct {
	BaseModel
	Phone         string     `db:"phone" json:"phone"`
	PasswordHash  *string    `db:"password_hash" json:"-"`
	Nickname      string     `db:"nickname" json:"nickname"`
	Avatar        *string    `db:"avatar" json:"avatar"`
	Gender        int        `db:"gender" json:"gender"`
	Birthday      *time.Time `db:"birthday" json:"birthday"`
	Email         *string    `db:"email" json:"email"`
	OpenID        *string    `db:"openid" json:"-"`
	UnionID       *string    `db:"unionid" json:"-"`
	MemberLevel   int        `db:"member_level" json:"member_level"`
	MemberPoints  int        `db:"member_points" json:"member_points"`
	MemberExpireAt *time.Time `db:"member_expire_at" json:"member_expire_at"`
	Status        int        `db:"status" json:"status"`
	LastLoginAt   *time.Time `db:"last_login_at" json:"last_login_at"`
	LastLoginIP   *string    `db:"last_login_ip" json:"last_login_ip"`
}

// TableName 表名
func (User) TableName() string {
	return "users"
}

// 达人状态
const (
	TalentStatusPending  = 0
	TalentStatusNormal   = 1
	TalentStatusFrozen   = 2
	TalentStatusRejected = 3
)

// 达人工作状态
const (
	WorkStatusOffline = 0
	WorkStatusOnline  = 1
	WorkStatusRest    = 2
)

// Talent 达人模型
type Talent struct {
	BaseModel
	UserID             int64        `db:"user_id" json:"user_id"`
	RealName           string       `db:"real_name" json:"real_name"`
	IDCard             string       `db:"id_card" json:"-"`
	Gender             int          `db:"gender" json:"gender"`
	Birthday           *time.Time   `db:"birthday" json:"birthday"`
	Avatar             string       `db:"avatar" json:"avatar"`
	Phone              string       `db:"phone" json:"phone"`
	EmergencyContact   string       `db:"emergency_contact" json:"emergency_contact"`
	EmergencyPhone     string       `db:"emergency_phone" json:"emergency_phone"`
	Skills             JSON         `db:"skills" json:"skills"`
	Certificates       JSON         `db:"certificates" json:"certificates"`
	LifePhotos         JSON         `db:"life_photos" json:"life_photos"`
	ArtPhotos          JSON         `db:"art_photos" json:"art_photos"`
	ServiceCity        string       `db:"service_city" json:"service_city"`
	ServiceDistricts   JSON         `db:"service_districts" json:"service_districts"`
	Rating             float64      `db:"rating" json:"rating"`
	ServiceCount       int          `db:"service_count" json:"service_count"`
	PositiveRate       float64      `db:"positive_rate" json:"positive_rate"`
	Balance            float64      `db:"balance" json:"balance"`
	TotalIncome        float64      `db:"total_income" json:"total_income"`
	Status             int          `db:"status" json:"status"`
	WorkStatus         int          `db:"work_status" json:"work_status"`
	CurrentLat         *float64     `db:"current_lat" json:"current_lat"`
	CurrentLng         *float64     `db:"current_lng" json:"current_lng"`
	LocationUpdatedAt  *time.Time   `db:"location_updated_at" json:"location_updated_at"`
	Introduction       string       `db:"introduction" json:"introduction"`
}

// TableName 表名
func (Talent) TableName() string {
	return "talents"
}

// ServiceCategory 服务分类
type ServiceCategory struct {
	BaseModel
	Name        string `db:"name" json:"name"`
	Icon        string `db:"icon" json:"icon"`
	SortOrder   int    `db:"sort_order" json:"sort_order"`
	Status      int    `db:"status" json:"status"`
}

// TableName 表名
func (ServiceCategory) TableName() string {
	return "service_categories"
}

// ServiceStatus 服务状态
const (
	ServiceStatusOffline = 0
	ServiceStatusOnline  = 1
)

// Service 服务项目
type Service struct {
	BaseModel
	Name         string  `db:"name" json:"name"`
	Description  string  `db:"description" json:"description"`
	CoverImage   string  `db:"cover_image" json:"cover_image"`
	Images       JSON    `db:"images" json:"images"`
	CategoryID   int64   `db:"category_id" json:"category_id"`
	BasePrice    float64 `db:"base_price" json:"base_price"`
	OriginalPrice float64 `db:"original_price" json:"original_price"`
	Specs        JSON    `db:"specs" json:"specs"`
	Status       int     `db:"status" json:"status"`
	SortOrder    int     `db:"sort_order" json:"sort_order"`
	OrderCount   int     `db:"order_count" json:"order_count"`
	ViewCount    int     `db:"view_count" json:"view_count"`
	Category     *ServiceCategory `db:"-" json:"category,omitempty"`
}

// TableName 表名
func (Service) TableName() string {
	return "services"
}

// ServiceSpec 服务规格
type ServiceSpec struct {
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	Duration int     `json:"duration"`
}

// Address 服务地址
type Address struct {
	Province string  `json:"province"`
	City     string  `json:"city"`
	District string  `json:"district"`
	Detail   string  `json:"detail"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
}

// 订单状态
const (
	OrderStatusPendingPayment = 0 // 待支付
	OrderStatusPendingAccept  = 1 // 待接单
	OrderStatusAccepted       = 2 // 已接单
	OrderStatusDeparted       = 7 // 技师已出发
	OrderStatusArrived        = 8 // 技师已到达
	OrderStatusInService      = 3 // 服务中
	OrderStatusCompleted      = 4 // 已完成
	OrderStatusCancelled      = 5 // 已取消
	OrderStatusRefunded       = 6 // 已退款
)

// OrderStatusText 订单状态文本映射
var OrderStatusText = map[int]string{
	OrderStatusPendingPayment: "待支付",
	OrderStatusPendingAccept:  "待接单",
	OrderStatusAccepted:       "已接单",
	OrderStatusDeparted:       "已出发",
	OrderStatusArrived:        "已到达",
	OrderStatusInService:      "服务中",
	OrderStatusCompleted:      "已完成",
	OrderStatusCancelled:      "已取消",
	OrderStatusRefunded:       "已退款",
}

// AllOrderStatuses 所有订单状态列表（用于管理后台筛选）
var AllOrderStatuses = []int{
	OrderStatusPendingPayment,
	OrderStatusPendingAccept,
	OrderStatusAccepted,
	OrderStatusDeparted,
	OrderStatusArrived,
	OrderStatusInService,
	OrderStatusCompleted,
	OrderStatusCancelled,
	OrderStatusRefunded,
}

// Order 订单
type Order struct {
	BaseModel
	OrderNo          string     `db:"order_no" json:"order_no"`
	UserID           int64      `db:"user_id" json:"user_id"`
	UserName         string     `db:"user_name" json:"user_name"`
	UserPhone        string     `db:"user_phone" json:"user_phone"`
	TalentID         *int64     `db:"technician_id" json:"talent_id"`
	TalentName       *string    `db:"technician_name" json:"talent_name"`
	TalentPhone      *string    `db:"technician_phone" json:"talent_phone"`
	ServiceID        int64      `db:"service_id" json:"service_id"`
	ServiceName      string     `db:"service_name" json:"service_name"`
	ServiceSpec      string     `db:"service_spec" json:"service_spec"`
	ServiceDuration  int        `db:"service_duration" json:"service_duration"`
	ServiceAddress   JSON       `db:"service_address" json:"service_address"`
	AppointmentTime  time.Time  `db:"appointment_time" json:"appointment_time"`
	StartTime        *time.Time `db:"start_time" json:"start_time"`
	EndTime          *time.Time `db:"end_time" json:"end_time"`
	OriginalAmount   float64    `db:"original_amount" json:"original_amount"`
	DiscountAmount   float64    `db:"discount_amount" json:"discount_amount"`
	ExtraAmount      float64    `db:"extra_amount" json:"extra_amount"`
	FinalAmount      float64    `db:"final_amount" json:"final_amount"`
	PlatformFee      float64    `db:"platform_fee" json:"platform_fee"`
	TalentIncome     float64    `db:"technician_income" json:"talent_income"`
	CouponID         *int64     `db:"coupon_id" json:"coupon_id"`
	CouponName       *string    `db:"coupon_name" json:"coupon_name"`
	Status           int        `db:"status" json:"status"`
	CancelReason     *string    `db:"cancel_reason" json:"cancel_reason"`
	CancelBy         *int       `db:"cancel_by" json:"cancel_by"`
	Remark           *string    `db:"remark" json:"remark"`
	PaidAt           *time.Time `db:"paid_at" json:"paid_at"`
	AcceptedAt       *time.Time `db:"accepted_at" json:"accepted_at"`
	DepartedAt       *time.Time `db:"departed_at" json:"departed_at"`
	ArrivedAt        *time.Time `db:"arrived_at" json:"arrived_at"`
	CompletedAt      *time.Time `db:"completed_at" json:"completed_at"`
	CancelledAt      *time.Time `db:"cancelled_at" json:"cancelled_at"`
}

// TableName 表名
func (Order) TableName() string {
	return "orders"
}

// 支付方式
const (
	PayMethodWeChat = 1
	PayMethodAlipay = 2
	PayMethodBalance = 3
)

// 支付状态
const (
	PaymentStatusPending  = 0
	PaymentStatusSuccess  = 1
	PaymentStatusFailed   = 2
	PaymentStatusRefunded = 3
)

// Payment 支付
type Payment struct {
	BaseModel
	PaymentNo    string  `db:"payment_no" json:"payment_no"`
	OrderID      int64   `db:"order_id" json:"order_id"`
	OrderNo      string  `db:"order_no" json:"order_no"`
	UserID       int64   `db:"user_id" json:"user_id"`
	Amount       float64 `db:"amount" json:"amount"`
	PayMethod    int     `db:"pay_method" json:"pay_method"`
	PayChannel   string  `db:"pay_channel" json:"pay_channel"`
	TransactionID *string `db:"transaction_id" json:"transaction_id"`
	PrepayID     *string `db:"prepay_id" json:"prepay_id"`
	Status       int     `db:"status" json:"status"`
	PaidAt       *time.Time `db:"paid_at" json:"paid_at"`
	RefundedAt   *time.Time `db:"refunded_at" json:"refunded_at"`
}

// TableName 表名
func (Payment) TableName() string {
	return "payments"
}

// Review 评价
type Review struct {
	BaseModel
	OrderID       int64     `db:"order_id" json:"order_id"`
	UserID        int64     `db:"user_id" json:"user_id"`
	UserName      string    `db:"user_name" json:"user_name"`
	TalentID      int64     `db:"technician_id" json:"talent_id"`
	TalentName    string    `db:"technician_name" json:"talent_name"`
	ServiceID     int64     `db:"service_id" json:"service_id"`
	ServiceName   string    `db:"service_name" json:"service_name"`
	Rating        int       `db:"rating" json:"rating"`
	Content       string    `db:"content" json:"content"`
	Images        JSON      `db:"images" json:"images"`
	Tags          JSON      `db:"tags" json:"tags"`
	IsAnonymous   int       `db:"is_anonymous" json:"is_anonymous"`
	ReplyContent  *string   `db:"reply_content" json:"reply_content"`
	ReplyAt       *time.Time `db:"reply_at" json:"reply_at"`
	Status        int       `db:"status" json:"status"`
}

// TableName 表名
func (Review) TableName() string {
	return "reviews"
}

// 优惠券类型
const (
	CouponTypeFullReduction = 1 // 满减券
	CouponTypeDiscount      = 2 // 折扣券
	CouponTypeCash          = 3 // 现金券
)

// Coupon 优惠券
type Coupon struct {
	BaseModel
	Name         string     `db:"name" json:"name"`
	Type         int        `db:"type" json:"type"`
	Value        float64    `db:"value" json:"value"`
	MinAmount    float64    `db:"min_amount" json:"min_amount"`
	Scope        int        `db:"scope" json:"scope"`
	ScopeIDs     JSON       `db:"scope_ids" json:"scope_ids"`
	TotalCount   int        `db:"total_count" json:"total_count"`
	ReceiveCount int        `db:"receive_count" json:"receive_count"`
	PerLimit     int        `db:"per_limit" json:"per_limit"`
	StartTime    time.Time  `db:"start_time" json:"start_time"`
	EndTime      time.Time  `db:"end_time" json:"end_time"`
	Status       int        `db:"status" json:"status"`
}

// TableName 表名
func (Coupon) TableName() string {
	return "coupons"
}

// UserCoupon 用户优惠券
type UserCoupon struct {
	BaseModel
	UserID     int64      `db:"user_id" json:"user_id"`
	CouponID   int64      `db:"coupon_id" json:"coupon_id"`
	Coupon     *Coupon    `db:"-" json:"coupon,omitempty"`
	Status     int        `db:"status" json:"status"` // 0:未使用 1:已使用 2:已过期
	OrderID    *int64     `db:"order_id" json:"order_id"`
	UsedAt     *time.Time `db:"used_at" json:"used_at"`
	ExpireAt   time.Time  `db:"expire_at" json:"expire_at"`
}

// TableName 表名
func (UserCoupon) TableName() string {
	return "user_coupons"
}

// TalentTrack 达人位置轨迹
type TalentTrack struct {
	ID         int64     `db:"id" json:"id"`
	TalentID   int64     `db:"technician_id" json:"talent_id"`
	OrderID    *int64    `db:"order_id" json:"order_id"`
	Latitude   float64   `db:"latitude" json:"latitude"`
	Longitude  float64   `db:"longitude" json:"longitude"`
	Status     *int      `db:"status" json:"status"`
	RecordedAt time.Time `db:"recorded_at" json:"recorded_at"`
}

// TableName 表名
func (TalentTrack) TableName() string {
	return "talent_tracks"
}

// 提现状态
const (
	WithdrawStatusPending  = 0
	WithdrawStatusApproved = 1
	WithdrawStatusRejected = 2
	WithdrawStatusPaid     = 3
)

// Withdraw 提现记录
type Withdraw struct {
	BaseModel
	WithdrawNo   string     `db:"withdraw_no" json:"withdraw_no"`
	TalentID     int64      `db:"technician_id" json:"talent_id"`
	Amount       float64    `db:"amount" json:"amount"`
	BankName     string     `db:"bank_name" json:"bank_name"`
	BankAccount  string     `db:"bank_account" json:"bank_account"`
	AccountName  string     `db:"account_name" json:"account_name"`
	Status       int        `db:"status" json:"status"`
	RejectReason *string    `db:"reject_reason" json:"reject_reason"`
	ProcessedAt  *time.Time `db:"processed_at" json:"processed_at"`
	PaidAt       *time.Time `db:"paid_at" json:"paid_at"`
}

// TableName 表名
func (Withdraw) TableName() string {
	return "withdraws"
}

// SmsLog 短信发送记录
type SmsLog struct {
	ID        int64     `db:"id" json:"id"`
	Phone     string    `db:"phone" json:"phone"`
	Code      string    `db:"code" json:"-"`
	Type      string    `db:"type" json:"type"`       // login / register / notify
	Content   string    `db:"content" json:"content"`
	Provider  string    `db:"provider" json:"provider"` // aliyun / tencent
	Status    int       `db:"status" json:"status"`     // 0:发送中 1:成功 2:失败
	Result    string    `db:"result" json:"result"`
	IP        string    `db:"ip" json:"ip"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

func (SmsLog) TableName() string {
	return "sms_logs"
}

// VirtualPhone 虚拟号码绑定
type VirtualPhone struct {
	BaseModel
	OrderID      int64      `db:"order_id" json:"order_id"`
	UserPhone    string     `db:"user_phone" json:"user_phone"`
	TalentPhone  string     `db:"talent_phone" json:"talent_phone"`
	VirtualX     string     `db:"virtual_x" json:"virtual_x"`
	BindID       string     `db:"bind_id" json:"bind_id"`
	ExpireAt     time.Time  `db:"expire_at" json:"expire_at"`
	UnbindAt     *time.Time `db:"unbind_at" json:"unbind_at"`
	Status       int        `db:"status" json:"status"` // 0:已绑定 1:已解绑
}

func (VirtualPhone) TableName() string {
	return "virtual_phones"
}

// 活动状态
const (
	ActivityStatusDraft    = 0
	ActivityStatusActive   = 1
	ActivityStatusFinished = 2
)

// Activity 营销活动
type Activity struct {
	BaseModel
	Name        string    `db:"name" json:"name"`
	Type        string    `db:"type" json:"type"`
	Banner      string    `db:"banner" json:"banner"`
	Description string    `db:"description" json:"description"`
	StartTime   time.Time `db:"start_time" json:"start_time"`
	EndTime     time.Time `db:"end_time" json:"end_time"`
	Status      int       `db:"status" json:"status"`
	Rule        JSON      `db:"rule" json:"rule"`
	OrderCount  int       `db:"order_count" json:"order_count"`
	Revenue     float64   `db:"revenue" json:"revenue"`
}

func (Activity) TableName() string {
	return "activities"
}

// Banner 轮播图
type Banner struct {
	ID         int64      `db:"id" json:"id"`
	Title      string     `db:"title" json:"title"`
	Subtitle   string     `db:"subtitle" json:"subtitle"`
	ImageURL   string     `db:"image_url" json:"image_url"`
	LinkURL    string     `db:"link_url" json:"link_url"`
	Sort       int        `db:"sort" json:"sort"`
	Status     int        `db:"status" json:"status"`
	ThemeColor string     `db:"theme_color" json:"theme_color"`
	Icon       string     `db:"icon" json:"icon"`
	CreatedAt  time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt  *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

func (Banner) TableName() string {
	return "banners"
}

// SystemConfig 系统配置
type SystemConfig struct {
	ID        int64     `db:"id" json:"id"`
	Group     string    `db:"group" json:"group"`
	Key       string    `db:"key" json:"key"`
	Value     string    `db:"value" json:"value"`
	Remark    string    `db:"remark" json:"remark"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

func (SystemConfig) TableName() string {
	return "system_configs"
}

// IncomeRecord 达人收入记录
type IncomeRecord struct {
	BaseModel
	TalentID     int64     `db:"technician_id" json:"talent_id"`
	OrderID      int64     `db:"order_id" json:"order_id"`
	OrderNo      string    `db:"order_no" json:"order_no"`
	Type         string    `db:"type" json:"type"` // order / withdraw / bonus
	Amount       float64   `db:"amount" json:"amount"`
	Balance      float64   `db:"balance" json:"balance"`
	Description  string    `db:"description" json:"description"`
	RecordAt     time.Time `db:"record_at" json:"record_at"`
}

func (IncomeRecord) TableName() string {
	return "income_records"
}

// JSON 自定义JSON类型
type JSON []byte

// Scan 实现sql.Scanner接口
func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	switch v := value.(type) {
	case []byte:
		*j = append((*j)[:0], v...)
	case string:
		*j = []byte(v)
	}
	return nil
}

// Value 实现driver.Valuer接口
func (j JSON) Value() (interface{}, error) {
	if j == nil {
		return nil, nil
	}
	return string(j), nil
}

// MarshalJSON 自定义JSON序列化（禁止Base64编码，直接输出原始JSON）
func (j JSON) MarshalJSON() ([]byte, error) {
	if j == nil {
		return []byte("null"), nil
	}
	return j, nil
}

// UnmarshalJSON 自定义JSON反序列化
func (j *JSON) UnmarshalJSON(data []byte) error {
	if data == nil {
		return nil
	}
	*j = make([]byte, len(data))
	copy(*j, data)
	return nil
}
