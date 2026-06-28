// Package service 业务逻辑层 - 用户服务
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/miaoda/backend/internal/config"
	"github.com/miaoda/backend/internal/model"
	"github.com/miaoda/backend/internal/repository"
	"github.com/miaoda/backend/pkg/database"
	"github.com/miaoda/backend/pkg/jwt"
	"github.com/miaoda/backend/pkg/logger"
)

// 业务错误
var (
	ErrInvalidParams     = errors.New("参数无效")
	ErrUserNotFound      = errors.New("用户不存在")
	ErrPhoneRegistered   = errors.New("手机号已注册")
	ErrInvalidPassword   = errors.New("密码错误")
	ErrInvalidCode       = errors.New("验证码错误")
	ErrUserDisabled      = errors.New("账号已被禁用")
	ErrTalentNotApproved = errors.New("达人不存在或未通过审核")
)

// UserService 用户服务
type UserService struct {
	userRepo    *repository.UserRepository
	addressRepo *repository.AddressRepository
	talentRepo  *repository.TalentRepository
	jwtCfg      *config.JWTConfig
	isDevMode   bool
}

// NewUserService 创建用户服务
func NewUserService(userRepo *repository.UserRepository, addressRepo *repository.AddressRepository, cfg *config.Config) *UserService {
	return &UserService{
		userRepo:    userRepo,
		addressRepo: addressRepo,
		jwtCfg:      &cfg.JWT,
		isDevMode:   cfg.App.Debug,
	}
}

// SetTalentRepo 设置达人仓储（用于登录时判断用户是否为达人）
func (s *UserService) SetTalentRepo(repo *repository.TalentRepository) {
	s.talentRepo = repo
}

// LoginRequest 登录请求
type LoginRequest struct {
	Phone      string `json:"phone" binding:"required,len=11"`
	Code       string `json:"code" binding:"required,len=6"`
	InviteCode string `json:"invite_code"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token        string      `json:"token"`
	RefreshToken string      `json:"refresh_token"`
	ExpireIn     int         `json:"expire_in"`
	UserType     int         `json:"user_type"`
	User         *model.User `json:"user"`
}

// Login 短信验证码登录
func (s *UserService) Login(ctx context.Context, req *LoginRequest, ip string) (*LoginResponse, error) {
	// 验证手机号格式
	if len(req.Phone) != 11 {
		return nil, ErrInvalidParams
	}

	// 验证短信验证码（实际应从Redis获取并校验）
	if !s.verifySmsCode(ctx, req.Phone, req.Code) {
		return nil, ErrInvalidCode
	}

	// 查找用户
	user, err := s.userRepo.GetByPhone(ctx, req.Phone)
	isNewUser := false
	if err != nil {
		// 用户不存在则自动注册
		user = &model.User{
			Phone:    req.Phone,
			Nickname: generateNickname(),
			Avatar:   "https://api.dicebear.com/7.x/avataaars/svg?seed=" + req.Phone,
			Status:   model.UserStatusNormal,
		}
		if err := s.userRepo.Create(ctx, user); err != nil {
			logger.Error("创建用户失败: %v", err)
			return nil, fmt.Errorf("创建用户失败: %w", err)
		}
		isNewUser = true
	}
	_, _ = EnsureInviteCode(ctx, user.ID)
	if isNewUser {
		_ = BindInviteOnRegister(ctx, user.ID, req.InviteCode)
	}

	if user.Status != model.UserStatusNormal {
		return nil, ErrUserDisabled
	}

	// 判断用户类型：默认为普通用户(1)，如果已通过达人审核则为达人(2)
	userType := 1
	if s.talentRepo != nil {
		talent, err := s.talentRepo.GetByUserID(ctx, user.ID)
		if err == nil && talent != nil && talent.Status == model.TalentStatusNormal {
			userType = 2 // 达人
			logger.Info("用户 %d 以达人身份登录 (talent_id=%d)", user.ID, talent.ID)
		}
	}

	// 生成Token
	token, err := jwt.GenerateToken(s.jwtCfg.Secret, user.ID, user.Phone, userType, s.jwtCfg.Expire)
	if err != nil {
		return nil, fmt.Errorf("生成token失败: %w", err)
	}

	refreshToken, err := jwt.GenerateRefreshToken(s.jwtCfg.Secret, user.ID, s.jwtCfg.RefreshExpire)
	if err != nil {
		return nil, fmt.Errorf("生成刷新token失败: %w", err)
	}

	// 更新最后登录信息
	go s.userRepo.UpdateLastLogin(context.Background(), user.ID, ip)

	// 缓存用户信息
	go s.userRepo.SetCache(context.Background(), user)

	return &LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		ExpireIn:     s.jwtCfg.Expire,
		UserType:     userType,
		User:         user,
	}, nil
}

// TalentLogin 达人短信验证码登录
func (s *UserService) TalentLogin(ctx context.Context, req *LoginRequest, ip string) (*LoginResponse, error) {
	if s.talentRepo == nil {
		return nil, ErrTalentNotApproved
	}
	if len(req.Phone) != 11 {
		return nil, ErrInvalidParams
	}
	if !s.verifySmsCode(ctx, req.Phone, req.Code) {
		return nil, ErrInvalidCode
	}

	user, err := s.userRepo.GetByPhone(ctx, req.Phone)
	if err != nil {
		return nil, ErrTalentNotApproved
	}
	if user.Status != model.UserStatusNormal {
		return nil, ErrUserDisabled
	}

	talent, err := s.talentRepo.GetByUserID(ctx, user.ID)
	if err != nil || talent == nil || talent.Status != model.TalentStatusNormal {
		return nil, ErrTalentNotApproved
	}

	token, err := jwt.GenerateToken(s.jwtCfg.Secret, user.ID, user.Phone, 2, s.jwtCfg.Expire)
	if err != nil {
		return nil, fmt.Errorf("生成token失败: %w", err)
	}
	refreshToken, err := jwt.GenerateRefreshToken(s.jwtCfg.Secret, user.ID, s.jwtCfg.RefreshExpire)
	if err != nil {
		return nil, fmt.Errorf("生成刷新token失败: %w", err)
	}

	go s.userRepo.UpdateLastLogin(context.Background(), user.ID, ip)
	go s.userRepo.SetCache(context.Background(), user)

	return &LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
		ExpireIn:     s.jwtCfg.Expire,
		UserType:     2,
		User:         user,
	}, nil
}

// RefreshToken 使用刷新Token签发新的访问Token和刷新Token
func (s *UserService) RefreshToken(ctx context.Context, refreshToken string) (*LoginResponse, error) {
	userID, err := jwt.ParseRefreshToken(s.jwtCfg.Secret, refreshToken)
	if err != nil {
		return nil, ErrInvalidParams
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, ErrUserNotFound
	}
	if user.Status != model.UserStatusNormal {
		return nil, ErrUserDisabled
	}

	userType := 1
	if s.talentRepo != nil {
		talent, err := s.talentRepo.GetByUserID(ctx, user.ID)
		if err == nil && talent != nil && talent.Status == model.TalentStatusNormal {
			userType = 2
		}
	}

	token, err := jwt.GenerateToken(s.jwtCfg.Secret, user.ID, user.Phone, userType, s.jwtCfg.Expire)
	if err != nil {
		return nil, fmt.Errorf("生成token失败: %w", err)
	}
	newRefreshToken, err := jwt.GenerateRefreshToken(s.jwtCfg.Secret, user.ID, s.jwtCfg.RefreshExpire)
	if err != nil {
		return nil, fmt.Errorf("生成刷新token失败: %w", err)
	}

	go s.userRepo.SetCache(context.Background(), user)

	return &LoginResponse{
		Token:        token,
		RefreshToken: newRefreshToken,
		ExpireIn:     s.jwtCfg.Expire,
		UserType:     userType,
		User:         user,
	}, nil
}

// SendSmsCode 发送短信验证码
func (s *UserService) SendSmsCode(ctx context.Context, phone string) error {
	if len(phone) != 11 {
		return ErrInvalidParams
	}

	// 检查发送频率（1分钟内只能发1条）
	key := fmt.Sprintf("sms:limit:%s", phone)
	exists, _ := databaseRedis().Exists(ctx, key).Result()
	if exists > 0 {
		return errors.New("发送过于频繁，请稍后再试")
	}

	// 生成6位验证码
	code := generateCode()

	// 存储验证码到Redis，5分钟过期
	codeKey := fmt.Sprintf("sms:code:%s", phone)
	if err := databaseRedis().Set(ctx, codeKey, code, 5*time.Minute).Err(); err != nil {
		return fmt.Errorf("存储验证码失败: %w", err)
	}

	// 设置发送频率限制，1分钟
	if err := databaseRedis().Set(ctx, key, "1", time.Minute).Err(); err != nil {
		return fmt.Errorf("设置发送限制失败: %w", err)
	}

	// 实际项目中调用短信服务发送验证码
	logger.Info("向手机号 %s 发送验证码: %s", phone, code)

	return nil
}

// verifySmsCode 验证短信验证码
func (s *UserService) verifySmsCode(ctx context.Context, phone, code string) bool {
	// 开发环境万能验证码（方便调试，无需真实发送短信）
	if s.isDevMode && code == "123456" {
		return true
	}

	key := fmt.Sprintf("sms:code:%s", phone)
	storedCode, err := databaseRedis().Get(ctx, key).Result()
	if err != nil {
		return false
	}
	if storedCode != code {
		return false
	}
	// 验证成功，删除验证码
	databaseRedis().Del(ctx, key)
	return true
}

// GetUserInfo 获取用户信息
func (s *UserService) GetUserInfo(ctx context.Context, userID int64) (*model.User, error) {
	// 先从缓存获取
	if user, err := s.userRepo.GetCache(ctx, userID); err == nil && user != nil {
		return user, nil
	}

	// 从数据库获取
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	// 设置缓存
	go s.userRepo.SetCache(context.Background(), user)

	return user, nil
}

// UpdateUserInfo 更新用户信息
func (s *UserService) UpdateUserInfo(ctx context.Context, user *model.User) error {
	return s.userRepo.Update(ctx, user)
}

// UpdatePassword 更新密码
func (s *UserService) UpdatePassword(ctx context.Context, userID int64, oldPassword, newPassword string) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}

	// 验证旧密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return ErrInvalidPassword
	}

	// 加密新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.userRepo.UpdatePassword(ctx, userID, string(hashedPassword)); err != nil {
		return err
	}

	// 删除缓存
	return s.userRepo.DeleteCache(ctx, userID)
}

// ListAddresses 获取地址列表
func (s *UserService) ListAddresses(ctx context.Context, userID int64) ([]model.UserAddress, error) {
	return s.addressRepo.ListByUserID(ctx, userID)
}

// CreateAddress 创建地址
func (s *UserService) CreateAddress(ctx context.Context, addr *model.UserAddress) error {
	return s.addressRepo.Create(ctx, addr)
}

// UpdateAddress 更新地址
func (s *UserService) UpdateAddress(ctx context.Context, addr *model.UserAddress) error {
	return s.addressRepo.Update(ctx, addr)
}

// DeleteAddress 删除地址
func (s *UserService) DeleteAddress(ctx context.Context, id int64, userID int64) error {
	return s.addressRepo.Delete(ctx, id, userID)
}

// SetDefaultAddress 设置默认地址
func (s *UserService) SetDefaultAddress(ctx context.Context, id int64, userID int64) error {
	return s.addressRepo.SetDefault(ctx, id, userID)
}

// generateNickname 生成昵称
func generateNickname() string {
	return fmt.Sprintf("用户_%s", generateCode())
}

// generateCode 生成随机码
func generateCode() string {
	return fmt.Sprintf("%06d", time.Now().UnixNano()%1000000)
}

// databaseRedis 获取Redis客户端
func databaseRedis() *redisClient {
	return globalRedis
}

// ===================== 管理后台方法 =====================

// AdminLogin 管理员登录
func (s *UserService) AdminLogin(ctx context.Context, username, password string) (map[string]interface{}, error) {
	admin, err := s.userRepo.FindAdminByUsername(ctx, username)
	if err != nil {
		return nil, fmt.Errorf("账号或密码错误: %v", err)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(password)); err != nil {
		// 如果 bcrypt 不匹配，尝试明文比较（兼容开发环境）
		if admin.PasswordHash != password {
			return nil, fmt.Errorf("账号或密码错误")
		}
	}
	phone := admin.Phone.String
	token, _ := jwt.GenerateToken(s.jwtCfg.Secret, admin.ID, phone, 3, s.jwtCfg.Expire)
	roleCode := admin.RoleCode.String
	if roleCode == "" {
		roleCode = "super_admin"
	}
	return map[string]interface{}{
		"token": token,
		"admin": map[string]interface{}{
			"id":          admin.ID,
			"username":    admin.Username,
			"nickname":    admin.Nickname.String,
			"real_name":   admin.Nickname.String,
			"role":        roleCode,
			"role_code":   roleCode,
			"city_name":   admin.CityName.String,
			"avatar":      admin.Avatar.String,
			"email":       admin.Email.String,
			"phone":       phone,
			"permissions": admin.Permissions,
		},
	}, nil
}

// AdminChangePassword 修改管理员密码
func (s *UserService) AdminChangePassword(ctx context.Context, adminID int64, oldPassword, newPassword string) error {
	if len(newPassword) < 6 {
		return fmt.Errorf("新密码至少需要6位")
	}
	if oldPassword == newPassword {
		return fmt.Errorf("新密码不能和旧密码相同")
	}
	admin, err := s.userRepo.FindAdminByID(ctx, adminID)
	if err != nil {
		return fmt.Errorf("管理员不存在")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(oldPassword)); err != nil {
		if admin.PasswordHash != oldPassword {
			return fmt.Errorf("旧密码错误")
		}
	}
	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.userRepo.UpdateAdminPassword(ctx, adminID, string(hashedPwd))
}

// GetAdminProfile 获取当前管理员个人信息
func (s *UserService) GetAdminProfile(ctx context.Context, adminID int64) (map[string]interface{}, error) {
	admin, err := s.userRepo.FindAdminByID(ctx, adminID)
	if err != nil {
		return nil, fmt.Errorf("管理员不存在")
	}
	return s.formatAdminProfile(admin), nil
}

// UpdateAdminProfile 更新当前管理员个人信息
func (s *UserService) UpdateAdminProfile(ctx context.Context, adminID int64, nickname, email, phone, avatar string) (map[string]interface{}, error) {
	if nickname == "" {
		return nil, fmt.Errorf("昵称不能为空")
	}
	if err := s.userRepo.UpdateAdminProfile(ctx, adminID, nickname, email, phone, avatar); err != nil {
		return nil, err
	}
	return s.GetAdminProfile(ctx, adminID)
}

func (s *UserService) formatAdminProfile(admin *model.Admin) map[string]interface{} {
	roleCode := admin.RoleCode.String
	if roleCode == "" {
		roleCode = "super_admin"
	}
	return map[string]interface{}{
		"id":          admin.ID,
		"username":    admin.Username,
		"nickname":    admin.Nickname.String,
		"real_name":   admin.Nickname.String,
		"role":        roleCode,
		"role_code":   roleCode,
		"city_name":   admin.CityName.String,
		"avatar":      admin.Avatar.String,
		"email":       admin.Email.String,
		"phone":       admin.Phone.String,
		"permissions": admin.Permissions,
		"status":      admin.Status,
		"created_at":  admin.CreatedAt,
		"updated_at":  admin.UpdatedAt,
	}
}

// GetDashboard 仪表盘
func (s *UserService) GetDashboard(ctx context.Context) (map[string]interface{}, error) {
	return s.getDashboardData(ctx)
}

// GetStats 统计数据
func (s *UserService) GetStats(ctx context.Context, period string) (map[string]interface{}, error) {
	return s.getStatsData(ctx, period)
}

// AdminCreateUserRequest 管理员创建用户请求
type AdminCreateUserRequest struct {
	Phone       string `json:"phone" binding:"required,len=11"`
	Nickname    string `json:"nickname" binding:"required"`
	Password    string `json:"password" binding:"required,min=6"`
	Gender      int    `json:"gender"`
	Avatar      string `json:"avatar"`
	City        string `json:"city"`
	MemberLevel int    `json:"member_level"`
}

// AdminCreateUser 管理员创建用户
func (s *UserService) AdminCreateUser(ctx context.Context, req *AdminCreateUserRequest) (*model.User, error) {
	// 检查手机号是否已注册
	existing, err := s.userRepo.GetByPhone(ctx, req.Phone)
	if err == nil && existing != nil {
		return nil, ErrPhoneRegistered
	}

	// 加密密码
	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("密码加密失败: %w", err)
	}

	user := &model.User{
		Phone:        req.Phone,
		PasswordHash: string(hashedPwd),
		Nickname:     req.Nickname,
		Avatar:       req.Avatar,
		Gender:       req.Gender,
		MemberLevel:  req.MemberLevel,
		Status:       model.UserStatusNormal,
	}
	if req.Avatar == "" {
		user.Avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + req.Phone
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("创建用户失败: %w", err)
	}

	return user, nil
}

// AdminUpdateUserRequest 管理员更新用户请求
type AdminUpdateUserRequest struct {
	Phone       string `json:"phone" binding:"required,len=11"`
	Nickname    string `json:"nickname" binding:"required"`
	Password    string `json:"password"`
	Gender      int    `json:"gender"`
	Avatar      string `json:"avatar"`
	City        string `json:"city"`
	MemberLevel int    `json:"member_level"`
	Status      *int   `json:"status"`
}

// AdminUpdateUser 管理员更新用户
func (s *UserService) AdminUpdateUser(ctx context.Context, userID int64, req *AdminUpdateUserRequest) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}

	user.Nickname = req.Nickname
	user.Phone = req.Phone
	user.Gender = req.Gender
	user.Avatar = req.Avatar
	user.MemberLevel = req.MemberLevel

	if req.Password != "" {
		hashedPwd, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("密码加密失败: %w", err)
		}
		user.PasswordHash = string(hashedPwd)
	}

	if req.Status != nil {
		user.Status = *req.Status
	}

	if err := s.userRepo.AdminUpdate(ctx, user); err != nil {
		return fmt.Errorf("更新用户失败: %w", err)
	}

	// 删除缓存
	go s.userRepo.DeleteCache(context.Background(), userID)
	return nil
}

// AdminDeleteUser 管理员删除用户（软删除）
func (s *UserService) AdminDeleteUser(ctx context.Context, userID int64) error {
	// 检查用户是否存在
	_, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}

	if err := s.userRepo.SoftDelete(ctx, userID); err != nil {
		return fmt.Errorf("删除用户失败: %w", err)
	}

	// 删除缓存
	go s.userRepo.DeleteCache(context.Background(), userID)
	return nil
}

// AdminListUsers 管理员用户列表
func (s *UserService) AdminListUsers(ctx context.Context, page, pageSize, status, level int, keyword string) ([]model.User, int64, error) {
	return s.userRepo.AdminList(ctx, page, pageSize, status, level, keyword)
}

// AdminGetUserDetail 获取用户详情
func (s *UserService) AdminGetUserDetail(ctx context.Context, userID int64) (*model.User, error) {
	return s.userRepo.FindByID(ctx, userID)
}

// DisableUser 禁用用户
func (s *UserService) DisableUser(ctx context.Context, userID int64) error {
	return s.userRepo.UpdateStatus(ctx, userID, model.UserStatusDisabled)
}

// EnableUser 启用用户
func (s *UserService) EnableUser(ctx context.Context, userID int64) error {
	return s.userRepo.UpdateStatus(ctx, userID, model.UserStatusNormal)
}

// GetFinanceOverview 财务概览
func (s *UserService) GetFinanceOverview(ctx context.Context) (map[string]interface{}, error) {
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	var monthRevenue, monthOrders, talentIncome, platformIncome float64
	db := database.Database()

	if err := db.GetContext(ctx, &monthRevenue,
		`SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE created_at >= $1 AND status != $2`, monthStart, model.OrderStatusCancelled); err != nil {
		monthRevenue = 0
	}
	if err := db.GetContext(ctx, &monthOrders,
		`SELECT COUNT(*) FROM orders WHERE created_at >= $1`, monthStart); err != nil {
		monthOrders = 0
	}
	if err := db.GetContext(ctx, &talentIncome,
		`SELECT COALESCE(SUM(technician_income), 0) FROM orders WHERE created_at >= $1 AND status = $2`, monthStart, model.OrderStatusCompleted); err != nil {
		talentIncome = 0
	}
	if err := db.GetContext(ctx, &platformIncome,
		`SELECT COALESCE(SUM(platform_fee), 0) FROM orders WHERE created_at >= $1 AND status = $2`, monthStart, model.OrderStatusCompleted); err != nil {
		platformIncome = 0
	}

	return map[string]interface{}{
		"month_revenue":   monthRevenue,
		"month_orders":    int64(monthOrders),
		"talent_income":   talentIncome,
		"platform_income": monthRevenue - talentIncome,
	}, nil
}

// GetTransactions 资金流水
func (s *UserService) GetTransactions(ctx context.Context, page, pageSize int, typ string) ([]map[string]interface{}, int64, error) {
	db := database.Database()
	var total int64
	args := []interface{}{}
	where := "1=1"
	if typ != "" && typ != "all" {
		where = "pay_channel = $1"
		args = append(args, typ)
	}
	countQuery := "SELECT COUNT(*) FROM payments WHERE " + where
	if err := db.GetContext(ctx, &total, countQuery, args...); err != nil {
		return nil, 0, err
	}

	type row struct {
		ID            int64      `db:"id"`
		PaymentNo     string     `db:"payment_no"`
		OrderNo       string     `db:"order_no"`
		UserID        int64      `db:"user_id"`
		Amount        float64    `db:"amount"`
		PayMethod     int        `db:"pay_method"`
		PayChannel    string     `db:"pay_channel"`
		TransactionID *string    `db:"transaction_id"`
		Status        int        `db:"status"`
		PaidAt        *time.Time `db:"paid_at"`
		CreatedAt     time.Time  `db:"created_at"`
	}

	offset := (page - 1) * pageSize
	args = append(args, pageSize, offset)
	var rows []row
	listQuery := fmt.Sprintf(`SELECT * FROM payments WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	if err := db.SelectContext(ctx, &rows, listQuery, args...); err != nil {
		return nil, 0, err
	}

	results := make([]map[string]interface{}, len(rows))
	payMethods := map[int]string{1: "微信支付", 2: "支付宝", 3: "余额支付"}
	statusTexts := map[int]string{0: "待支付", 1: "成功", 2: "失败", 3: "已退款"}
	for i, r := range rows {
		results[i] = map[string]interface{}{
			"id":          r.ID,
			"payment_no":  r.PaymentNo,
			"order_no":    r.OrderNo,
			"amount":      r.Amount,
			"pay_method":  payMethods[r.PayMethod],
			"pay_channel": r.PayChannel,
			"status":      statusTexts[r.Status],
			"paid_at":     r.PaidAt,
			"created_at":  r.CreatedAt,
		}
	}
	return results, total, nil
}

// ListReviews 评价列表
func (s *UserService) ListReviews(ctx context.Context, page, pageSize int) ([]model.Review, int64, error) {
	db := database.Database()
	var total int64
	if err := db.GetContext(ctx, &total, `SELECT COUNT(*) FROM reviews`); err != nil {
		return nil, 0, err
	}
	var reviews []model.Review
	offset := (page - 1) * pageSize
	err := db.SelectContext(ctx, &reviews,
		`SELECT * FROM reviews ORDER BY created_at DESC LIMIT $1 OFFSET $2`, pageSize, offset)
	return reviews, total, err
}

// ReplyReview 回复评价
func (s *UserService) ReplyReview(ctx context.Context, reviewID int64, reply string) error {
	db := database.Database()
	now := time.Now()
	_, err := db.ExecContext(ctx,
		`UPDATE reviews SET reply_content = $1, reply_at = $2, updated_at = $2 WHERE id = $3`,
		reply, now, reviewID)
	return err
}

// GetSystemConfigs 获取系统配置
func (s *UserService) GetSystemConfigs(ctx context.Context, group string) ([]map[string]interface{}, error) {
	db := database.Database()
	type configRow struct {
		Key       string `db:"key"`
		Value     string `db:"value"`
		GroupName string `db:"group_name"`
		Remark    string `db:"remark"`
	}
	var rows []configRow
	err := db.SelectContext(ctx, &rows,
		`SELECT group_name, key, value, COALESCE(remark, '') AS remark FROM system_configs WHERE group_name = $1`, group)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	results := make([]map[string]interface{}, len(rows))
	for i, r := range rows {
		results[i] = map[string]interface{}{
			"key":    r.Key,
			"value":  r.Value,
			"group":  r.GroupName,
			"remark": r.Remark,
		}
	}
	return results, nil
}

// UpdateSystemConfig 更新或创建系统配置
func (s *UserService) UpdateSystemConfig(ctx context.Context, group, key, value string) error {
	db := database.Database()
	_, err := db.ExecContext(ctx, `
		INSERT INTO system_configs (group_name, key, value, updated_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (group_name, key) DO UPDATE SET value = $3, updated_at = $4`,
		group, key, value, time.Now())
	return err
}

// GetRevenueAnalytics 营收分析（按月）
func (s *UserService) GetRevenueAnalytics(ctx context.Context, months int) ([]map[string]interface{}, error) {
	db := database.Database()
	now := time.Now()
	var results []map[string]interface{}
	for i := months - 1; i >= 0; i-- {
		monthStart := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, now.Location())
		monthEnd := monthStart.AddDate(0, 1, 0)
		var revenue, cost, profit float64
		var orderCount int64
		_ = db.GetContext(ctx, &revenue,
			`SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE created_at >= $1 AND created_at < $2 AND status NOT IN ($3, $4)`,
			monthStart, monthEnd, model.OrderStatusCancelled, model.OrderStatusRefunded)
		_ = db.GetContext(ctx, &orderCount,
			`SELECT COUNT(*) FROM orders WHERE created_at >= $1 AND created_at < $2`, monthStart, monthEnd)
		_ = db.GetContext(ctx, &cost,
			`SELECT COALESCE(SUM(technician_income), 0) FROM orders WHERE created_at >= $1 AND created_at < $2 AND status = $3`,
			monthStart, monthEnd, model.OrderStatusCompleted)
		profit = revenue - cost
		if profit < 0 {
			profit = 0
		}
		results = append(results, map[string]interface{}{
			"month":   monthStart.Format("1月"),
			"revenue": revenue,
			"cost":    cost,
			"profit":  profit,
			"orders":  orderCount,
		})
	}
	return results, nil
}

// GetUserAnalytics 用户增长分析
func (s *UserService) GetUserAnalytics(ctx context.Context, days int) ([]map[string]interface{}, error) {
	db := database.Database()
	now := time.Now()
	var results []map[string]interface{}
	for i := days - 1; i >= 0; i-- {
		dayStart := time.Date(now.Year(), now.Month(), now.Day()-i, 0, 0, 0, 0, now.Location())
		dayEnd := dayStart.AddDate(0, 0, 1)
		var newUsers, activeUsers int64
		_ = db.GetContext(ctx, &newUsers,
			`SELECT COUNT(*) FROM users WHERE created_at >= $1 AND created_at < $2`, dayStart, dayEnd)
		_ = db.GetContext(ctx, &activeUsers,
			`SELECT COUNT(DISTINCT user_id) FROM orders WHERE created_at >= $1 AND created_at < $2`, dayStart, dayEnd)
		dayLabels := []string{"周日", "周一", "周二", "周三", "周四", "周五", "周六"}
		results = append(results, map[string]interface{}{
			"day":    dayLabels[dayStart.Weekday()],
			"new":    newUsers,
			"active": activeUsers,
		})
	}
	return results, nil
}

// GetCityAnalytics 城市分析
func (s *UserService) GetCityAnalytics(ctx context.Context) ([]map[string]interface{}, error) {
	db := database.Database()
	type cityRow struct {
		City    string  `db:"city"`
		Orders  int64   `db:"orders"`
		Revenue float64 `db:"revenue"`
	}
	var rows []cityRow
	err := db.SelectContext(ctx, &rows, `
		SELECT 
			COALESCE(service_address->>'city', '未知') as city,
			COUNT(*) as orders,
			COALESCE(SUM(final_amount), 0) as revenue
		FROM orders 
		WHERE status NOT IN ($1, $2)
		GROUP BY service_address->>'city'
		ORDER BY orders DESC
		LIMIT 10`, model.OrderStatusCancelled, model.OrderStatusRefunded)
	if err != nil {
		return []map[string]interface{}{}, nil
	}
	results := make([]map[string]interface{}, len(rows))
	for i, r := range rows {
		results[i] = map[string]interface{}{
			"city":    r.City,
			"orders":  r.Orders,
			"revenue": r.Revenue,
		}
	}
	return results, nil
}

// GetMarketingOverview 营销概览
func (s *UserService) GetMarketingOverview(ctx context.Context) (map[string]interface{}, error) {
	db := database.Database()
	var couponTotal, couponUsed, activityCount int64
	_ = db.GetContext(ctx, &couponTotal,
		`SELECT COALESCE(SUM(total_count), 0) FROM coupons`)
	_ = db.GetContext(ctx, &couponUsed,
		`SELECT COALESCE(SUM(receive_count), 0) FROM coupons`)
	_ = db.GetContext(ctx, &activityCount,
		`SELECT COUNT(*) FROM activities WHERE status = $1`, model.ActivityStatusActive)
	return map[string]interface{}{
		"coupon_total":    couponTotal,
		"coupon_used":     couponUsed,
		"activity_active": activityCount,
	}, nil
}

// ListActivities 活动列表
func (s *UserService) ListActivities(ctx context.Context) ([]model.Activity, error) {
	db := database.Database()
	var activities []model.Activity
	err := db.SelectContext(ctx, &activities,
		`SELECT * FROM activities ORDER BY start_time DESC`)
	if err != nil {
		return []model.Activity{}, nil
	}
	return activities, nil
}

// CreateActivity 创建活动
func (s *UserService) CreateActivity(ctx context.Context, req map[string]interface{}) error {
	db := database.Database()
	startTime, _ := time.Parse("2006-01-02", req["start_time"].(string))
	endTime, _ := time.Parse("2006-01-02", req["end_time"].(string))
	ruleJSON, _ := json.Marshal(req["rule"])
	_, err := db.ExecContext(ctx, `
		INSERT INTO activities (name, type, banner, description, start_time, end_time, status, rule, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
		req["name"], req["type"], req["banner"], req["description"],
		startTime, endTime, model.ActivityStatusActive, ruleJSON, time.Now())
	return err
}

// ListCoupons 优惠券列表
func (s *UserService) ListCoupons(ctx context.Context) ([]model.Coupon, error) {
	db := database.Database()
	var coupons []model.Coupon
	err := db.SelectContext(ctx, &coupons,
		`SELECT * FROM coupons ORDER BY created_at DESC`)
	if err != nil {
		return []model.Coupon{}, nil
	}
	return coupons, nil
}

// CreateCoupon 创建优惠券
func (s *UserService) CreateCoupon(ctx context.Context, req map[string]interface{}) error {
	db := database.Database()
	startTime, _ := time.Parse("2006-01-02", req["start_time"].(string))
	endTime, _ := time.Parse("2006-01-02", req["end_time"].(string))
	_, err := db.ExecContext(ctx, `
		INSERT INTO coupons (name, type, value, min_amount, total_count, start_time, end_time, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
		req["name"], req["type"], req["value"], req["min_amount"],
		req["total_count"], startTime, endTime, 1, time.Now())
	return err
}

// SendCoupon 发放优惠券给用户
func (s *UserService) SendCoupon(ctx context.Context, couponID, userID int64) error {
	db := database.Database()
	var coupon model.Coupon
	if err := db.GetContext(ctx, &coupon, `SELECT * FROM coupons WHERE id = $1`, couponID); err != nil {
		return err
	}
	// 检查是否已领取
	var existCount int64
	_ = db.GetContext(ctx, &existCount,
		`SELECT COUNT(*) FROM user_coupons WHERE user_id = $1 AND coupon_id = $2`, userID, couponID)
	if existCount > 0 {
		return errors.New("该用户已领取此优惠券")
	}
	_, err := db.ExecContext(ctx, `
		INSERT INTO user_coupons (user_id, coupon_id, status, expire_at, created_at, updated_at)
		VALUES ($1, $2, 0, $3, $4, $4)`,
		userID, couponID, coupon.EndTime, time.Now())
	if err == nil {
		// 更新发放计数
		db.ExecContext(ctx, `UPDATE coupons SET receive_count = receive_count + 1 WHERE id = $1`, couponID)
	}
	return err
}

// getStatsData 统计数据（带真实数据库查询）
func (s *UserService) getStatsData(ctx context.Context, period string) (map[string]interface{}, error) {
	db := database.Database()
	now := time.Now()
	var startTime time.Time
	switch period {
	case "today":
		startTime = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	case "week":
		startTime = now.AddDate(0, 0, -7)
	case "month":
		startTime = now.AddDate(0, -1, 0)
	default:
		startTime = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	}

	var orders, users, talents int64
	var revenue float64
	_ = db.GetContext(ctx, &orders, `SELECT COUNT(*) FROM orders WHERE created_at >= $1`, startTime)
	_ = db.GetContext(ctx, &revenue, `SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE created_at >= $1 AND status NOT IN ($2, $3)`, startTime, model.OrderStatusCancelled, model.OrderStatusRefunded)
	_ = db.GetContext(ctx, &users, `SELECT COUNT(*) FROM users WHERE created_at >= $1`, startTime)
	_ = db.GetContext(ctx, &talents, `SELECT COUNT(*) FROM technicians WHERE status = $1`, model.TalentStatusNormal)

	return map[string]interface{}{
		"period":  period,
		"orders":  orders,
		"revenue": revenue,
		"users":   users,
		"talents": talents,
	}, nil
}

// getDashboardData 仪表盘（带真实数据库查询）
func (s *UserService) getDashboardData(ctx context.Context) (map[string]interface{}, error) {
	stats, _ := s.userRepo.GetDashboardStats(ctx)
	db := database.Database()

	// 最近订单趋势（7天）
	var orderTrend []map[string]interface{}
	now := time.Now()
	for i := 6; i >= 0; i-- {
		dayStart := time.Date(now.Year(), now.Month(), now.Day()-i, 0, 0, 0, 0, now.Location())
		dayEnd := dayStart.AddDate(0, 0, 1)
		var count int64
		var amount float64
		_ = db.GetContext(ctx, &count, `SELECT COUNT(*) FROM orders WHERE created_at >= $1 AND created_at < $2`, dayStart, dayEnd)
		_ = db.GetContext(ctx, &amount, `SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE created_at >= $1 AND created_at < $2 AND status NOT IN ($3, $4)`, dayStart, dayEnd, model.OrderStatusCancelled, model.OrderStatusRefunded)
		orderTrend = append(orderTrend, map[string]interface{}{
			"date":   dayStart.Format("01-02"),
			"count":  count,
			"amount": amount,
		})
	}

	// 最近订单
	type recentOrder struct {
		ID          int64     `db:"id"`
		OrderNo     string    `db:"order_no"`
		UserName    string    `db:"user_name"`
		ServiceName string    `db:"service_name"`
		FinalAmount float64   `db:"final_amount"`
		Status      int       `db:"status"`
		CreatedAt   time.Time `db:"created_at"`
	}
	var recentOrders []recentOrder
	_ = db.SelectContext(ctx, &recentOrders,
		`SELECT id, order_no, user_name, service_name, final_amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 10`)

	orders := make([]map[string]interface{}, len(recentOrders))
	for i, o := range recentOrders {
		orders[i] = map[string]interface{}{
			"id":           o.ID,
			"order_no":     o.OrderNo,
			"user_name":    o.UserName,
			"service_name": o.ServiceName,
			"final_amount": o.FinalAmount,
			"status":       o.Status,
			"status_text":  model.OrderStatusText[o.Status],
			"created_at":   o.CreatedAt,
		}
	}

	return map[string]interface{}{
		"stats":         stats,
		"order_trend":   orderTrend,
		"recent_orders": orders,
	}, nil
}

// --------------- Banner 管理 ---------------

// ListBanners 获取轮播图列表
func (s *UserService) ListBanners(ctx context.Context) ([]model.Banner, error) {
	db := database.Database()
	if db == nil {
		return nil, errors.New("数据库不可用")
	}
	var banners []model.Banner
	err := db.SelectContext(ctx, &banners, `SELECT * FROM banners WHERE deleted_at IS NULL ORDER BY sort ASC`)
	return banners, err
}

// SaveBanner 创建轮播图
func (s *UserService) SaveBanner(ctx context.Context, banner *model.Banner) error {
	db := database.Database()
	if db == nil {
		return errors.New("数据库不可用")
	}
	now := time.Now()
	return db.GetContext(ctx, banner, `
		INSERT INTO banners (title, subtitle, image_url, link_url, sort, status, theme_color, icon, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING id, created_at, updated_at`,
		banner.Title, banner.Subtitle, banner.ImageURL, banner.LinkURL, banner.Sort, banner.Status, banner.ThemeColor, banner.Icon, now)
}

// UpdateBanner 更新轮播图
func (s *UserService) UpdateBanner(ctx context.Context, banner *model.Banner) error {
	db := database.Database()
	if db == nil {
		return errors.New("数据库不可用")
	}
	now := time.Now()
	_, err := db.ExecContext(ctx, `
		UPDATE banners SET title=$1, subtitle=$2, image_url=$3, link_url=$4, sort=$5, status=$6, theme_color=$7, icon=$8, updated_at=$9
		WHERE id=$10 AND deleted_at IS NULL`,
		banner.Title, banner.Subtitle, banner.ImageURL, banner.LinkURL, banner.Sort, banner.Status, banner.ThemeColor, banner.Icon, now, banner.ID)
	return err
}

// DeleteBanner 删除轮播图（软删除）
func (s *UserService) DeleteBanner(ctx context.Context, id int64) error {
	db := database.Database()
	if db == nil {
		return errors.New("数据库不可用")
	}
	now := time.Now()
	_, err := db.ExecContext(ctx, `UPDATE banners SET deleted_at=$1 WHERE id=$2`, now, id)
	return err
}

// --------------- 服务分类管理（管理后台） ---------------

// AdminListServiceCategories 管理后台获取所有分类
func (s *UserService) AdminListServiceCategories(ctx context.Context) ([]model.ServiceCategory, error) {
	db := database.Database()
	if db == nil {
		return nil, errors.New("数据库不可用")
	}
	var categories []model.ServiceCategory
	err := db.SelectContext(ctx, &categories, `SELECT * FROM service_categories ORDER BY sort_order ASC`)
	return categories, err
}

// SaveServiceCategory 创建服务分类
func (s *UserService) SaveServiceCategory(ctx context.Context, cat *model.ServiceCategory) error {
	db := database.Database()
	if db == nil {
		return errors.New("数据库不可用")
	}
	now := time.Now()
	return db.GetContext(ctx, cat, `
		INSERT INTO service_categories (name, icon, sort_order, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $5) RETURNING id, created_at, updated_at`,
		cat.Name, cat.Icon, cat.SortOrder, cat.Status, now)
}

// UpdateServiceCategory 更新服务分类
func (s *UserService) UpdateServiceCategory(ctx context.Context, cat *model.ServiceCategory) error {
	db := database.Database()
	if db == nil {
		return errors.New("数据库不可用")
	}
	now := time.Now()
	_, err := db.ExecContext(ctx, `
		UPDATE service_categories SET name=$1, icon=$2, sort_order=$3, status=$4, updated_at=$5
		WHERE id=$6`,
		cat.Name, cat.Icon, cat.SortOrder, cat.Status, now, cat.ID)
	return err
}

// DeleteServiceCategory 删除服务分类
func (s *UserService) DeleteServiceCategory(ctx context.Context, id int64) error {
	db := database.Database()
	if db == nil {
		return errors.New("数据库不可用")
	}
	_, err := db.ExecContext(ctx, `DELETE FROM service_categories WHERE id=$1`, id)
	return err
}

// --------------- 服务项目管理（管理后台） ---------------

// AdminListServices 管理后台获取服务列表（不含 status 过滤）
func (s *UserService) AdminListServices(ctx context.Context, categoryID *int64, keyword string, page, pageSize int) ([]model.Service, int64, error) {
	db := database.Database()
	if db == nil {
		return nil, 0, errors.New("数据库不可用")
	}
	var total int64
	args := []interface{}{}
	where := "deleted_at IS NULL"
	if categoryID != nil {
		where += fmt.Sprintf(" AND category_id = $%d", len(args)+1)
		args = append(args, *categoryID)
	}
	if keyword != "" {
		where += fmt.Sprintf(" AND name ILIKE $%d", len(args)+1)
		args = append(args, "%"+keyword+"%")
	}
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)
	if err := db.GetContext(ctx, &total, fmt.Sprintf("SELECT COUNT(*) FROM services WHERE %s", where), countArgs...); err != nil {
		return nil, 0, err
	}
	args = append(args, pageSize, (page-1)*pageSize)
	var services []model.Service
	query := fmt.Sprintf(`SELECT * FROM services WHERE %s ORDER BY sort_order ASC, created_at DESC LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	if err := db.SelectContext(ctx, &services, query, args...); err != nil {
		return nil, 0, err
	}
	return services, total, nil
}

// AdminGetServiceDetail 管理后台获取服务详情
func (s *UserService) AdminGetServiceDetail(ctx context.Context, id int64) (*model.Service, error) {
	db := database.Database()
	if db == nil {
		return nil, errors.New("数据库不可用")
	}
	var svc model.Service
	err := db.GetContext(ctx, &svc, `SELECT * FROM services WHERE id=$1 AND deleted_at IS NULL`, id)
	if err != nil {
		return nil, err
	}
	return &svc, nil
}

// SaveService 创建服务
func (s *UserService) SaveService(ctx context.Context, svc *model.Service) error {
	db := database.Database()
	if db == nil {
		return errors.New("数据库不可用")
	}
	now := time.Now()
	imagesJSON, _ := json.Marshal(svc.Images)
	specsJSON, _ := json.Marshal(svc.Specs)
	return db.GetContext(ctx, svc, `
		INSERT INTO services (name, description, cover_image, images, category_id, base_price, original_price, specs, status, sort_order, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11) RETURNING id, created_at, updated_at`,
		svc.Name, svc.Description, svc.CoverImage, imagesJSON, svc.CategoryID, svc.BasePrice, svc.OriginalPrice, specsJSON, svc.Status, svc.SortOrder, now)
}

// UpdateService 更新服务
func (s *UserService) UpdateService(ctx context.Context, svc *model.Service) error {
	db := database.Database()
	if db == nil {
		return errors.New("数据库不可用")
	}
	now := time.Now()
	imagesJSON, _ := json.Marshal(svc.Images)
	specsJSON, _ := json.Marshal(svc.Specs)
	_, err := db.ExecContext(ctx, `
		UPDATE services SET name=$1, description=$2, cover_image=$3, images=$4, category_id=$5, base_price=$6, original_price=$7, specs=$8, status=$9, sort_order=$10, updated_at=$11
		WHERE id=$12 AND deleted_at IS NULL`,
		svc.Name, svc.Description, svc.CoverImage, imagesJSON, svc.CategoryID, svc.BasePrice, svc.OriginalPrice, specsJSON, svc.Status, svc.SortOrder, now, svc.ID)
	return err
}

// DeleteService 删除服务（软删除）
func (s *UserService) DeleteService(ctx context.Context, id int64) error {
	db := database.Database()
	if db == nil {
		return errors.New("数据库不可用")
	}
	now := time.Now()
	_, err := db.ExecContext(ctx, `UPDATE services SET deleted_at=$1 WHERE id=$2`, now, id)
	return err
}
