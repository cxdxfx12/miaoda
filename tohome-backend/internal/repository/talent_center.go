package repository

import (
	"context"
	"fmt"

	"github.com/miaoda/backend/pkg/database"
)

type TalentCenterRepo struct{}

func NewTalentCenterRepo() *TalentCenterRepo { return &TalentCenterRepo{} }

// ===== 自选服务项目 =====

type TalentServiceItem struct {
	ID           int64    `db:"id" json:"id"`
	TalentID     int64    `db:"talent_id" json:"talent_id"`
	ServiceID    int64    `db:"service_id" json:"service_id"`
	CustomPrice  *float64 `db:"custom_price" json:"custom_price"`
	IsAvailable bool     `db:"is_available" json:"is_available"`
	SortOrder    int      `db:"sort_order" json:"sort_order"`
	ServiceName  string   `db:"service_name" json:"service_name"`
	ServiceIcon  *string  `db:"service_icon" json:"service_icon"`
	Price        float64  `db:"price" json:"price"`
	CreatedAt    string   `db:"created_at" json:"created_at"`
	UpdatedAt    string   `db:"updated_at" json:"updated_at"`
}

func (r *TalentCenterRepo) ListTalentServices(ctx context.Context, talentID int64) ([]TalentServiceItem, error) {
	db := database.Database()
	rows := []TalentServiceItem{}
	err := db.SelectContext(ctx, &rows, `
		SELECT ts.*, COALESCE(s.name, '') AS service_name, s.cover_image AS service_icon, COALESCE(s.base_price, 0) AS price
		FROM talent_services ts
		LEFT JOIN services s ON s.id = ts.service_id
		WHERE ts.talent_id = $1
		ORDER BY ts.sort_order ASC, ts.id ASC`, talentID)
	return rows, err
}

func (r *TalentCenterRepo) AddTalentService(ctx context.Context, talentID, serviceID int64, customPrice *float64, sortOrder int) error {
	db := database.Database()
	_, err := db.ExecContext(ctx, `
		INSERT INTO talent_services (talent_id, service_id, custom_price, sort_order)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (talent_id, service_id) DO UPDATE SET
			custom_price = EXCLUDED.custom_price,
			updated_at = NOW()`, talentID, serviceID, customPrice, sortOrder)
	return err
}

func (r *TalentCenterRepo) RemoveTalentService(ctx context.Context, talentID, serviceID int64) error {
	db := database.Database()
	_, err := db.ExecContext(ctx, `DELETE FROM talent_services WHERE talent_id = $1 AND service_id = $2`, talentID, serviceID)
	return err
}

func (r *TalentCenterRepo) ToggleServiceAvailability(ctx context.Context, talentID, serviceID int64, available bool) error {
	db := database.Database()
	_, err := db.ExecContext(ctx, `UPDATE talent_services SET is_available = $3, updated_at = NOW() WHERE talent_id = $1 AND service_id = $2`, talentID, serviceID, available)
	return err
}

// ===== 服务地址 =====

type TalentAddress struct {
	ID        int64    `db:"id" json:"id"`
	TalentID  int64    `db:"talent_id" json:"talent_id"`
	Name      string   `db:"name" json:"name"`
	City      string   `db:"city" json:"city"`
	District  string   `db:"district" json:"district"`
	Detail    string   `db:"detail" json:"detail"`
	Lat       *float64 `db:"lat" json:"lat"`
	Lng       *float64 `db:"lng" json:"lng"`
	IsDefault bool     `db:"is_default" json:"is_default"`
	CreatedAt string   `db:"created_at" json:"created_at"`
	UpdatedAt string   `db:"updated_at" json:"updated_at"`
}

func (r *TalentCenterRepo) ListTalentAddresses(ctx context.Context, talentID int64) ([]TalentAddress, error) {
	db := database.Database()
	rows := []TalentAddress{}
	err := db.SelectContext(ctx, &rows, `SELECT * FROM talent_addresses WHERE talent_id = $1 ORDER BY is_default DESC, id ASC`, talentID)
	return rows, err
}

func (r *TalentCenterRepo) AddTalentAddress(ctx context.Context, addr *TalentAddress) error {
	db := database.Database()
	if addr.IsDefault {
		db.ExecContext(ctx, `UPDATE talent_addresses SET is_default = false WHERE talent_id = $1`, addr.TalentID)
	}
	return db.QueryRowxContext(ctx, `
		INSERT INTO talent_addresses (talent_id, name, city, district, detail, lat, lng, is_default)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id`, addr.TalentID, addr.Name, addr.City, addr.District, addr.Detail, addr.Lat, addr.Lng, addr.IsDefault).Scan(&addr.ID)
}

func (r *TalentCenterRepo) UpdateTalentAddress(ctx context.Context, talentID, addrID int64, addr *TalentAddress) error {
	db := database.Database()
	if addr.IsDefault {
		db.ExecContext(ctx, `UPDATE talent_addresses SET is_default = false WHERE talent_id = $1 AND id != $2`, talentID, addrID)
	}
	_, err := db.ExecContext(ctx, `
		UPDATE talent_addresses SET name=$3, city=$4, district=$5, detail=$6, lat=$7, lng=$8, is_default=$9, updated_at=NOW()
		WHERE id=$1 AND talent_id=$2`, addrID, talentID, addr.Name, addr.City, addr.District, addr.Detail, addr.Lat, addr.Lng, addr.IsDefault)
	return err
}

func (r *TalentCenterRepo) DeleteTalentAddress(ctx context.Context, talentID, addrID int64) error {
	db := database.Database()
	_, err := db.ExecContext(ctx, `DELETE FROM talent_addresses WHERE id = $1 AND talent_id = $2`, addrID, talentID)
	return err
}

func (r *TalentCenterRepo) SetDefaultAddress(ctx context.Context, talentID, addrID int64) error {
	db := database.Database()
	db.ExecContext(ctx, `UPDATE talent_addresses SET is_default = false WHERE talent_id = $1`, talentID)
	_, err := db.ExecContext(ctx, `UPDATE talent_addresses SET is_default = true, updated_at = NOW() WHERE id = $1 AND talent_id = $2`, addrID, talentID)
	return err
}

// ===== 提现记录 =====

type WithdrawRecord struct {
	ID        int64   `db:"id" json:"id"`
	TalentID  int64   `db:"talent_id" json:"talent_id"`
	Amount    float64 `db:"amount" json:"amount"`
	Status    int     `db:"status" json:"status"`
	Reason    *string `db:"reason" json:"reason"`
	CreatedAt string  `db:"created_at" json:"created_at"`
	UpdatedAt string  `db:"updated_at" json:"updated_at"`
}

func (r *TalentCenterRepo) ListWithdrawRecords(ctx context.Context, talentID int64, page, pageSize int) ([]WithdrawRecord, int64, error) {
	db := database.Database()
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	var total int64
	_ = db.GetContext(ctx, &total, `SELECT COUNT(*) FROM withdraws WHERE talent_id = $1`, talentID)
	rows := []WithdrawRecord{}
	err := db.SelectContext(ctx, &rows, `SELECT * FROM withdraws WHERE talent_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, talentID, pageSize, (page-1)*pageSize)
	return rows, total, err
}

// ===== 提现 =====
func (r *TalentCenterRepo) CreateWithdraw(ctx context.Context, talentID int64, amount float64) (int64, error) {
	db := database.Database()
	var id int64
	err := db.QueryRowxContext(ctx, `
		INSERT INTO withdraws (talent_id, amount, status, created_at, updated_at)
		VALUES ($1, $2, 0, NOW(), NOW())
		RETURNING id`, talentID, amount).Scan(&id)
	return id, err
}

// Admin withdraw list
func (r *TalentCenterRepo) AdminListWithdraws(ctx context.Context, page, pageSize, status int) ([]map[string]interface{}, int64, error) {
	db := database.Database()
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	args := []interface{}{}
	where := "1=1"
	if status >= 0 {
		args = append(args, status)
		where += fmt.Sprintf(" AND w.status = $%d", len(args))
	}
	var total int64
	_ = db.GetContext(ctx, &total, fmt.Sprintf(`SELECT COUNT(*) FROM withdraws w WHERE %s`, where), args...)
	args = append(args, pageSize, (page-1)*pageSize)
	query := fmt.Sprintf(`
		SELECT w.*, t.real_name AS talent_name, t.phone AS talent_phone
		FROM withdraws w
		LEFT JOIN technicians t ON t.id = w.talent_id
		WHERE %s
		ORDER BY w.created_at DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	rows, err := db.QueryxContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	list := []map[string]interface{}{}
	for rows.Next() {
		m := make(map[string]interface{})
		if err := rows.MapScan(m); err == nil {
			list = append(list, m)
		}
	}
	return list, total, nil
}

func (r *TalentCenterRepo) AdminProcessWithdraw(ctx context.Context, id int64, status int, reason string) error {
	db := database.Database()
	_, err := db.ExecContext(ctx, `UPDATE withdraws SET status = $2, reason = $3, updated_at = NOW() WHERE id = $1`, id, status, reason)
	return err
}
