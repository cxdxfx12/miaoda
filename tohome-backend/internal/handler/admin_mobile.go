package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"github.com/miaoda/backend/pkg/database"
	"github.com/miaoda/backend/pkg/response"
)

type mobileAdminScope struct {
	ID          int64          `db:"id" json:"id"`
	Username    string         `db:"username" json:"username"`
	Nickname    sql.NullString `db:"nickname" json:"nickname"`
	RoleCode    sql.NullString `db:"role_code" json:"role_code"`
	CityName    sql.NullString `db:"city_name" json:"city_name"`
	Permissions []byte         `db:"permissions" json:"-"`
}

func (s mobileAdminScope) role() string {
	if s.RoleCode.String == "" {
		return "super_admin"
	}
	return s.RoleCode.String
}

func (s mobileAdminScope) isSuper() bool {
	return s.role() == "super_admin"
}

func (s mobileAdminScope) city() string {
	return strings.TrimSpace(s.CityName.String)
}

func (h *AdminHandler) getMobileAdminScope(c *gin.Context) (*mobileAdminScope, error) {
	adminID, ok := c.Get("user_id")
	if !ok {
		return nil, fmt.Errorf("未登录")
	}
	id, _ := adminID.(int64)
	db := database.Database()
	if db == nil {
		return nil, fmt.Errorf("数据库不可用")
	}
	var scope mobileAdminScope
	err := db.GetContext(c.Request.Context(), &scope, `
		SELECT id, username, nickname, COALESCE(role_code, 'super_admin') AS role_code, COALESCE(city_name, '') AS city_name, COALESCE(permissions, '[]'::jsonb) AS permissions
		FROM admins
		WHERE id = $1 AND deleted_at IS NULL AND status = 1
	`, id)
	if err != nil {
		return nil, fmt.Errorf("管理员不存在或已禁用")
	}
	return &scope, nil
}

func orderCityWhere(scope *mobileAdminScope, args *[]interface{}) string {
	if scope == nil || scope.isSuper() || scope.city() == "" {
		return "1=1"
	}
	*args = append(*args, scope.city())
	return fmt.Sprintf("COALESCE(service_address->>'city', service_address->>'cityName', '') = $%d", len(*args))
}

func talentCityWhere(scope *mobileAdminScope, args *[]interface{}) string {
	if scope == nil || scope.isSuper() || scope.city() == "" {
		return "1=1"
	}
	*args = append(*args, scope.city())
	return fmt.Sprintf("service_city = $%d", len(*args))
}

func permissionsToSlice(raw []byte, fallback []string) []string {
	if len(raw) == 0 {
		return fallback
	}
	var list []string
	if err := json.Unmarshal(raw, &list); err != nil || len(list) == 0 {
		return fallback
	}
	return list
}

// AdminMobileMe 获取移动管理端当前管理员信息
func (h *AdminHandler) AdminMobileMe(c *gin.Context) {
	scope, err := h.getMobileAdminScope(c)
	if err != nil {
		response.Unauthorized(c)
		return
	}
	perms := permissionsToSlice(scope.Permissions, []string{"*"})
	if !scope.isSuper() && len(perms) == 0 {
		perms = []string{"dashboard", "orders", "talents", "users", "finance", "dispatch", "reviews", "marketing", "analytics"}
	}
	response.Success(c, gin.H{
		"id":          scope.ID,
		"username":    scope.Username,
		"nickname":    scope.Nickname.String,
		"role_code":   scope.role(),
		"city_name":   scope.city(),
		"is_super":    scope.isSuper(),
		"permissions": perms,
	})
}

// AdminMobileOverview 移动管理端经营总览
func (h *AdminHandler) AdminMobileOverview(c *gin.Context) {
	scope, err := h.getMobileAdminScope(c)
	if err != nil {
		response.Unauthorized(c)
		return
	}
	db := database.Database()
	today := time.Now()
	dayStart := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, today.Location())
	monthStart := time.Date(today.Year(), today.Month(), 1, 0, 0, 0, 0, today.Location())

	var args []interface{}
	orderWhere := orderCityWhere(scope, &args)
	var monthOrders, todayOrders, pendingOrders int64
	var monthRevenue float64
	_ = db.GetContext(c.Request.Context(), &monthOrders, fmt.Sprintf(`SELECT COUNT(*) FROM orders WHERE created_at >= $%d AND %s`, len(args)+1, orderWhere), append(args, monthStart)...)
	_ = db.GetContext(c.Request.Context(), &todayOrders, fmt.Sprintf(`SELECT COUNT(*) FROM orders WHERE created_at >= $%d AND %s`, len(args)+1, orderWhere), append(args, dayStart)...)
	_ = db.GetContext(c.Request.Context(), &pendingOrders, fmt.Sprintf(`SELECT COUNT(*) FROM orders WHERE status IN (0,1,2) AND %s`, orderWhere), args...)
	_ = db.GetContext(c.Request.Context(), &monthRevenue, fmt.Sprintf(`SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE created_at >= $%d AND status NOT IN (5,6) AND %s`, len(args)+1, orderWhere), append(args, monthStart)...)

	var tArgs []interface{}
	talentWhere := talentCityWhere(scope, &tArgs)
	var talents, onlineTalents, pendingTalents int64
	_ = db.GetContext(c.Request.Context(), &talents, fmt.Sprintf(`SELECT COUNT(*) FROM technicians WHERE deleted_at IS NULL AND %s`, talentWhere), tArgs...)
	_ = db.GetContext(c.Request.Context(), &onlineTalents, fmt.Sprintf(`SELECT COUNT(*) FROM technicians WHERE deleted_at IS NULL AND work_status = 1 AND %s`, talentWhere), tArgs...)
	_ = db.GetContext(c.Request.Context(), &pendingTalents, fmt.Sprintf(`SELECT COUNT(*) FROM technicians WHERE deleted_at IS NULL AND status = 0 AND %s`, talentWhere), tArgs...)

	var trend []gin.H
	for i := 6; i >= 0; i-- {
		start := dayStart.AddDate(0, 0, -i)
		end := start.AddDate(0, 0, 1)
		queryArgs := append(append([]interface{}{}, args...), start, end)
		var count int64
		var amount float64
		_ = db.GetContext(c.Request.Context(), &count, fmt.Sprintf(`SELECT COUNT(*) FROM orders WHERE %s AND created_at >= $%d AND created_at < $%d`, orderWhere, len(args)+1, len(args)+2), queryArgs...)
		_ = db.GetContext(c.Request.Context(), &amount, fmt.Sprintf(`SELECT COALESCE(SUM(final_amount),0) FROM orders WHERE %s AND created_at >= $%d AND created_at < $%d AND status NOT IN (5,6)`, orderWhere, len(args)+1, len(args)+2), queryArgs...)
		trend = append(trend, gin.H{"date": start.Format("01-02"), "orders": count, "revenue": amount})
	}

	response.Success(c, gin.H{
		"scope": gin.H{"city_name": scope.city(), "role_code": scope.role(), "is_super": scope.isSuper()},
		"kpis": gin.H{
			"month_orders":    monthOrders,
			"today_orders":    todayOrders,
			"pending_orders":  pendingOrders,
			"month_revenue":   monthRevenue,
			"talents":         talents,
			"online_talents":  onlineTalents,
			"pending_talents": pendingTalents,
		},
		"trend": trend,
	})
}

// AdminMobileOrders 移动管理端订单列表
func (h *AdminHandler) AdminMobileOrders(c *gin.Context) {
	scope, err := h.getMobileAdminScope(c)
	if err != nil {
		response.Unauthorized(c)
		return
	}
	db := database.Database()
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 20
	}
	var args []interface{}
	where := orderCityWhere(scope, &args)
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		args = append(args, status)
		where += fmt.Sprintf(" AND status = $%d", len(args))
	}
	args = append(args, pageSize, (page-1)*pageSize)
	type item struct {
		ID             int64          `db:"id" json:"id"`
		OrderNo        string         `db:"order_no" json:"order_no"`
		UserName       string         `db:"user_name" json:"user_name"`
		TechnicianName sql.NullString `db:"technician_name" json:"technician_name"`
		ServiceName    string         `db:"service_name" json:"service_name"`
		FinalAmount    float64        `db:"final_amount" json:"final_amount"`
		Status         int            `db:"status" json:"status"`
		City           sql.NullString `db:"city" json:"city"`
		CreatedAt      time.Time      `db:"created_at" json:"created_at"`
	}
	var list []item
	query := fmt.Sprintf(`SELECT id, order_no, user_name, technician_name, service_name, final_amount, status, COALESCE(service_address->>'city', service_address->>'cityName', '') AS city, created_at FROM orders WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	_ = db.SelectContext(c.Request.Context(), &list, query, args...)
	response.Success(c, gin.H{"list": list, "page": page, "page_size": pageSize})
}

// AdminMobileTalents 移动管理端达人列表
func (h *AdminHandler) AdminMobileTalents(c *gin.Context) {
	scope, err := h.getMobileAdminScope(c)
	if err != nil {
		response.Unauthorized(c)
		return
	}
	db := database.Database()
	var args []interface{}
	where := talentCityWhere(scope, &args)
	type item struct {
		ID           int64   `db:"id" json:"id"`
		RealName     string  `db:"real_name" json:"real_name"`
		Avatar       string  `db:"avatar" json:"avatar"`
		Phone        string  `db:"phone" json:"phone"`
		ServiceCity  string  `db:"service_city" json:"service_city"`
		Rating       float64 `db:"rating" json:"rating"`
		ServiceCount int     `db:"service_count" json:"service_count"`
		Status       int     `db:"status" json:"status"`
		WorkStatus   int     `db:"work_status" json:"work_status"`
	}
	var list []item
	_ = db.SelectContext(c.Request.Context(), &list, fmt.Sprintf(`SELECT id, real_name, avatar, phone, service_city, rating, service_count, status, work_status FROM technicians WHERE deleted_at IS NULL AND %s ORDER BY updated_at DESC LIMIT 50`, where), args...)
	response.Success(c, gin.H{"list": list})
}

// AdminMobileUsers 移动管理端用户概览列表
func (h *AdminHandler) AdminMobileUsers(c *gin.Context) {
	scope, err := h.getMobileAdminScope(c)
	if err != nil {
		response.Unauthorized(c)
		return
	}
	db := database.Database()
	type userItem struct {
		ID          int64          `db:"id" json:"id"`
		Phone       string         `db:"phone" json:"phone"`
		Nickname    string         `db:"nickname" json:"nickname"`
		Avatar      string         `db:"avatar" json:"avatar"`
		MemberLevel int            `db:"member_level" json:"member_level"`
		Status      int            `db:"status" json:"status"`
		City        sql.NullString `db:"city" json:"city"`
		CreatedAt   time.Time      `db:"created_at" json:"created_at"`
	}
	if scope.isSuper() || scope.city() == "" {
		var list []userItem
		_ = db.SelectContext(c.Request.Context(), &list, `SELECT id, phone, nickname, avatar, member_level, status, '' AS city, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50`)
		response.Success(c, gin.H{"list": list})
		return
	}
	var list []userItem
	_ = db.SelectContext(c.Request.Context(), &list, `
		SELECT DISTINCT u.id, u.phone, u.nickname, u.avatar, u.member_level, u.status, $1 AS city, u.created_at
		FROM users u
		JOIN orders o ON o.user_id = u.id
		WHERE u.deleted_at IS NULL AND COALESCE(o.service_address->>'city', o.service_address->>'cityName', '') = $1
		ORDER BY u.created_at DESC LIMIT 50
	`, scope.city())
	response.Success(c, gin.H{"list": list})
}

// AdminMobileListAdmins 城市管理员列表
func (h *AdminHandler) AdminMobileListAdmins(c *gin.Context) {
	scope, err := h.getMobileAdminScope(c)
	if err != nil {
		response.Unauthorized(c)
		return
	}
	if !scope.isSuper() {
		response.FailWithStatus(c, 403, response.CodeForbidden, "只有超管可以管理城市管理员")
		return
	}
	db := database.Database()
	type item struct {
		ID          int64          `db:"id" json:"id"`
		Username    string         `db:"username" json:"username"`
		Nickname    sql.NullString `db:"nickname" json:"nickname"`
		Phone       sql.NullString `db:"phone" json:"phone"`
		RoleCode    sql.NullString `db:"role_code" json:"role_code"`
		CityName    sql.NullString `db:"city_name" json:"city_name"`
		Permissions []byte         `db:"permissions" json:"-"`
		Status      int            `db:"status" json:"status"`
		CreatedAt   time.Time      `db:"created_at" json:"created_at"`
	}
	var rows []item
	_ = db.SelectContext(c.Request.Context(), &rows, `SELECT id, username, nickname, phone, COALESCE(role_code,'city_admin') AS role_code, COALESCE(city_name,'') AS city_name, COALESCE(permissions,'[]'::jsonb) AS permissions, status, created_at FROM admins WHERE deleted_at IS NULL ORDER BY id DESC`)
	list := make([]gin.H, 0, len(rows))
	for _, r := range rows {
		list = append(list, gin.H{"id": r.ID, "username": r.Username, "nickname": r.Nickname.String, "phone": r.Phone.String, "role_code": r.RoleCode.String, "city_name": r.CityName.String, "permissions": permissionsToSlice(r.Permissions, nil), "status": r.Status, "created_at": r.CreatedAt})
	}
	response.Success(c, gin.H{"list": list})
}

// AdminMobileCreateAdmin 创建城市管理员
func (h *AdminHandler) AdminMobileCreateAdmin(c *gin.Context) {
	scope, err := h.getMobileAdminScope(c)
	if err != nil {
		response.Unauthorized(c)
		return
	}
	if !scope.isSuper() {
		response.FailWithStatus(c, 403, response.CodeForbidden, "只有超管可以添加城市管理员")
		return
	}
	var req struct {
		Username    string   `json:"username" binding:"required"`
		Password    string   `json:"password" binding:"required"`
		Nickname    string   `json:"nickname"`
		Phone       string   `json:"phone"`
		CityName    string   `json:"city_name" binding:"required"`
		Permissions []string `json:"permissions"`
		Status      int      `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "请填写账号、密码和城市")
		return
	}
	if len(req.Password) < 6 {
		response.ParamError(c, "密码至少 6 位")
		return
	}
	if len(req.Permissions) == 0 {
		req.Permissions = []string{"dashboard", "orders", "talents", "users", "finance", "dispatch", "reviews", "marketing", "analytics"}
	}
	if req.Status == 0 {
		req.Status = 1
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	perms, _ := json.Marshal(req.Permissions)
	db := database.Database()
	var id int64
	err = db.QueryRowxContext(c.Request.Context(), `
		INSERT INTO admins (username, password_hash, nickname, phone, role_code, city_name, permissions, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,'city_admin',$5,$6::jsonb,$7,NOW(),NOW())
		RETURNING id
	`, req.Username, string(hash), req.Nickname, req.Phone, req.CityName, string(perms), req.Status).Scan(&id)
	if err != nil {
		response.ServerError(c, "创建失败，账号可能已存在: "+err.Error())
		return
	}
	response.Success(c, gin.H{"id": id, "message": "城市管理员已创建"})
}

// AdminMobileUpdateAdmin 更新城市管理员
func (h *AdminHandler) AdminMobileUpdateAdmin(c *gin.Context) {
	scope, err := h.getMobileAdminScope(c)
	if err != nil {
		response.Unauthorized(c)
		return
	}
	if !scope.isSuper() {
		response.FailWithStatus(c, 403, response.CodeForbidden, "只有超管可以更新城市管理员")
		return
	}
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var req struct {
		Nickname    string   `json:"nickname"`
		Phone       string   `json:"phone"`
		CityName    string   `json:"city_name"`
		Permissions []string `json:"permissions"`
		Status      int      `json:"status"`
		Password    string   `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "参数错误")
		return
	}
	perms, _ := json.Marshal(req.Permissions)
	db := database.Database()
	if strings.TrimSpace(req.Password) != "" {
		hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		_, err = db.ExecContext(c.Request.Context(), `UPDATE admins SET password_hash=$1, nickname=$2, phone=$3, city_name=$4, permissions=$5::jsonb, status=$6, updated_at=NOW() WHERE id=$7 AND deleted_at IS NULL`, string(hash), req.Nickname, req.Phone, req.CityName, string(perms), req.Status, id)
	} else {
		_, err = db.ExecContext(c.Request.Context(), `UPDATE admins SET nickname=$1, phone=$2, city_name=$3, permissions=$4::jsonb, status=$5, updated_at=NOW() WHERE id=$6 AND deleted_at IS NULL`, req.Nickname, req.Phone, req.CityName, string(perms), req.Status, id)
	}
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"message": "城市管理员已更新"})
}
