// Package repository 数据访问层 - 达人仓储
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"

	"github.com/miaoda/backend/internal/model"
)

// TalentRepository 达人仓储
type TalentRepository struct {
	db    *sqlx.DB
	redis *redis.Client
}

const talentSelectColumns = `id, created_at, updated_at, deleted_at, user_id, real_name, id_card, gender, birthday,
	avatar, phone, COALESCE(emergency_contact, '') AS emergency_contact, COALESCE(emergency_phone, '') AS emergency_phone,
	skills, certificates, life_photos, art_photos, service_city, service_districts, rating, service_count,
	positive_rate, balance, total_income, status, work_status, current_lat, current_lng, location_updated_at, introduction`

// NewTalentRepository 创建达人仓储
func NewTalentRepository(db *sqlx.DB, redis *redis.Client) *TalentRepository {
	return &TalentRepository{db: db, redis: redis}
}

// GetByID 根据ID获取达人
func (r *TalentRepository) GetByID(ctx context.Context, id int64) (*model.Talent, error) {
	var talent model.Talent
	err := r.db.GetContext(ctx, &talent, `SELECT `+talentSelectColumns+` FROM technicians WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return nil, err
	}
	return &talent, nil
}

// GetByUserID 根据用户ID获取达人
func (r *TalentRepository) GetByUserID(ctx context.Context, userID int64) (*model.Talent, error) {
	var talent model.Talent
	err := r.db.GetContext(ctx, &talent, `SELECT `+talentSelectColumns+` FROM technicians WHERE user_id = $1 AND deleted_at IS NULL`, userID)
	if err != nil {
		return nil, err
	}
	return &talent, nil
}

// GetByPhone 根据手机号获取达人
func (r *TalentRepository) GetByPhone(ctx context.Context, phone string) (*model.Talent, error) {
	var talent model.Talent
	err := r.db.GetContext(ctx, &talent, `SELECT `+talentSelectColumns+` FROM technicians WHERE phone = $1 AND deleted_at IS NULL`, phone)
	if err != nil {
		return nil, err
	}
	return &talent, nil
}

// Create 创建达人
func (r *TalentRepository) Create(ctx context.Context, talent *model.Talent) error {
	query := `
		INSERT INTO technicians (user_id, real_name, id_card, gender, birthday, avatar, phone, emergency_contact, emergency_phone, skills, certificates, life_photos, art_photos, service_city, service_districts, introduction, status, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18)
		RETURNING id, created_at, updated_at`
	now := time.Now()
	err := r.db.QueryRowxContext(ctx, query,
		talent.UserID, talent.RealName, talent.IDCard, talent.Gender, talent.Birthday, talent.Avatar, talent.Phone,
		talent.EmergencyContact, talent.EmergencyPhone, talent.Skills, talent.Certificates, talent.LifePhotos, talent.ArtPhotos, talent.ServiceCity, talent.ServiceDistricts, talent.Introduction,
		model.TalentStatusPending, now,
	).Scan(&talent.ID, &talent.CreatedAt, &talent.UpdatedAt)
	return err
}

// Update 更新达人
func (r *TalentRepository) Update(ctx context.Context, talent *model.Talent) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE technicians
		SET real_name = $1, avatar = $2, skills = $3, certificates = $4, service_city = $5,
		    service_districts = $6, introduction = $7, life_photos = $8, art_photos = $9,
		    phone = $10, gender = $11, birthday = $12, emergency_contact = $13, emergency_phone = $14,
		    updated_at = $15
		WHERE id = $16 AND deleted_at IS NULL`,
		talent.RealName, talent.Avatar, talent.Skills, talent.Certificates, talent.ServiceCity,
		talent.ServiceDistricts, talent.Introduction, talent.LifePhotos, talent.ArtPhotos,
		talent.Phone, talent.Gender, talent.Birthday, talent.EmergencyContact, talent.EmergencyPhone,
		time.Now(), talent.ID)
	return err
}

// UpdateWorkStatus 更新工作状态
func (r *TalentRepository) UpdateWorkStatus(ctx context.Context, id int64, status int) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE technicians SET work_status = $1, updated_at = $2 WHERE id = $3`,
		status, time.Now(), id)

	// 同时更新Redis
	key := fmt.Sprintf("talent:status:%d", id)
	if err := r.redis.Set(ctx, key, status, 24*time.Hour).Err(); err != nil {
		return err
	}

	return err
}

// UpdateLocation 更新位置
func (r *TalentRepository) UpdateLocation(ctx context.Context, id int64, lat, lng float64) error {
	now := time.Now()
	_, err := r.db.ExecContext(ctx, `
		UPDATE technicians
		SET current_lat = $1, current_lng = $2, location_updated_at = $3, updated_at = $3
		WHERE id = $4`,
		lat, lng, now, id)
	return err
}

// FindAvailable 查找可用的达人
func (r *TalentRepository) FindAvailable(ctx context.Context, appointmentTime time.Time) ([]model.Talent, error) {
	var talents []model.Talent
	err := r.db.SelectContext(ctx, &talents, `
		SELECT * FROM technicians
		WHERE status = $1
		AND work_status = $2
		AND deleted_at IS NULL
		ORDER BY rating DESC, service_count DESC
		LIMIT 10`,
		model.TalentStatusNormal, model.WorkStatusOnline)
	return talents, err
}

// FindNearby 查找附近达人
func (r *TalentRepository) FindNearby(ctx context.Context, lat, lng, radius float64, limit int) ([]model.Talent, error) {
	// 使用Haversine公式计算距离
	var talents []model.Talent
	err := r.db.SelectContext(ctx, &talents, `
		SELECT id, created_at, updated_at, deleted_at, user_id, real_name, id_card, gender, birthday,
			avatar, phone, emergency_contact, emergency_phone, skills, certificates, life_photos,
			art_photos, service_city, service_districts, rating, service_count, positive_rate,
			balance, total_income, status, work_status, current_lat, current_lng,
			location_updated_at, introduction
		FROM (
			SELECT *,
				(6371 * acos(LEAST(1, GREATEST(-1,
					cos(radians($1)) * cos(radians(current_lat)) *
					cos(radians(current_lng) - radians($2)) +
					sin(radians($1)) * sin(radians(current_lat))
				)))) AS distance
			FROM technicians
			WHERE status = $3
			AND work_status = $4
			AND current_lat IS NOT NULL
			AND current_lng IS NOT NULL
			AND deleted_at IS NULL
		) AS nearby
		WHERE distance < $5
		ORDER BY distance ASC
		LIMIT $6`,
		lat, lng, model.TalentStatusNormal, model.WorkStatusOnline, radius, limit)
	return talents, err
}

// List 达人列表（管理后台）
func (r *TalentRepository) List(ctx context.Context, status *int, page, pageSize int) ([]model.Talent, int64, error) {
	var talents []model.Talent
	var total int64

	args := []interface{}{}
	where := "deleted_at IS NULL"
	if status != nil {
		where += " AND status = $1"
		args = append(args, *status)
	}

	if err := r.db.GetContext(ctx, &total,
		fmt.Sprintf("SELECT COUNT(*) FROM technicians WHERE %s", where), args...); err != nil {
		return nil, 0, err
	}

	args = append(args, pageSize, (page-1)*pageSize)
	listQuery := fmt.Sprintf(`
		SELECT `+talentSelectColumns+` FROM technicians WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	err := r.db.SelectContext(ctx, &talents, listQuery, args...)
	return talents, total, err
}

// Approve 审核通过
func (r *TalentRepository) Approve(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE technicians SET status = $1, updated_at = $2 WHERE id = $3`,
		model.TalentStatusNormal, time.Now(), id)
	return err
}

// Reject 审核拒绝
func (r *TalentRepository) Reject(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE technicians SET status = $1, updated_at = $2 WHERE id = $3`,
		model.TalentStatusRejected, time.Now(), id)
	return err
}

// GetIncomeStatistics 获取收入统计
func (r *TalentRepository) GetIncomeStatistics(ctx context.Context, talentID int64, startTime, endTime time.Time) (map[string]interface{}, error) {
	result := make(map[string]interface{})

	// 总收入
	var totalIncome float64
	err := r.db.GetContext(ctx, &totalIncome, `
		SELECT COALESCE(SUM(technician_income), 0) FROM orders
		WHERE technician_id = $1 AND status = $2 AND completed_at BETWEEN $3 AND $4`,
		talentID, model.OrderStatusCompleted, startTime, endTime)
	if err != nil {
		return nil, err
	}
	result["total_income"] = totalIncome

	// 订单数
	var orderCount int64
	err = r.db.GetContext(ctx, &orderCount, `
		SELECT COUNT(*) FROM orders
		WHERE technician_id = $1 AND status = $2 AND completed_at BETWEEN $3 AND $4`,
		talentID, model.OrderStatusCompleted, startTime, endTime)
	if err != nil {
		return nil, err
	}
	result["order_count"] = orderCount

	// 服务时长
	var totalDuration int64
	err = r.db.GetContext(ctx, &totalDuration, `
		SELECT COALESCE(SUM(service_duration), 0) FROM orders
		WHERE technician_id = $1 AND status = $2 AND completed_at BETWEEN $3 AND $4`,
		talentID, model.OrderStatusCompleted, startTime, endTime)
	if err != nil {
		return nil, err
	}
	result["service_hours"] = float64(totalDuration) / 60

	return result, nil
}

// 错误
var ErrTalentNotFound = errors.New("达人不存在")
