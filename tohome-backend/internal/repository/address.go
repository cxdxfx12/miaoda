// Package repository 数据访问层 - 地址仓储
package repository

import (
	"context"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/miaoda/backend/internal/model"
)

// AddressRepository 地址仓储
type AddressRepository struct {
	db *sqlx.DB
}

// NewAddressRepository 创建地址仓储
func NewAddressRepository(db *sqlx.DB) *AddressRepository {
	return &AddressRepository{db: db}
}

// ListByUserID 获取用户地址列表
func (r *AddressRepository) ListByUserID(ctx context.Context, userID int64) ([]model.UserAddress, error) {
	var addresses []model.UserAddress
	err := r.db.SelectContext(ctx, &addresses,
		`SELECT * FROM user_addresses WHERE user_id = $1 AND deleted_at IS NULL ORDER BY is_default DESC, id DESC`,
		userID)
	return addresses, err
}

// GetByID 根据ID获取地址
func (r *AddressRepository) GetByID(ctx context.Context, id int64) (*model.UserAddress, error) {
	var addr model.UserAddress
	err := r.db.GetContext(ctx, &addr,
		`SELECT * FROM user_addresses WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return nil, err
	}
	return &addr, nil
}

// Create 创建地址
func (r *AddressRepository) Create(ctx context.Context, addr *model.UserAddress) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 如果是默认地址，先取消其他默认地址
	if addr.IsDefault == 1 {
		_, err = tx.ExecContext(ctx,
			`UPDATE user_addresses SET is_default = 0 WHERE user_id = $1`, addr.UserID)
		if err != nil {
			return err
		}
	}

	query := `
		INSERT INTO user_addresses (user_id, contact_name, contact_phone, province, city, district, detail, lat, lng, is_default, tag, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, created_at`
	now := time.Now()
	err = tx.QueryRowxContext(ctx, query,
		addr.UserID, addr.ContactName, addr.ContactPhone, addr.Province, addr.City,
		addr.District, addr.Detail, addr.Lat, addr.Lng, addr.IsDefault, addr.Tag, now, now,
	).Scan(&addr.ID, &addr.CreatedAt)
	if err != nil {
		return err
	}
	addr.UpdatedAt = now
	return tx.Commit()
}

// Update 更新地址
func (r *AddressRepository) Update(ctx context.Context, addr *model.UserAddress) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 如果是默认地址，先取消其他默认地址
	if addr.IsDefault == 1 {
		_, err = tx.ExecContext(ctx,
			`UPDATE user_addresses SET is_default = 0 WHERE user_id = $1 AND id != $2`, addr.UserID, addr.ID)
		if err != nil {
			return err
		}
	}

	query := `
		UPDATE user_addresses
		SET contact_name = $1, contact_phone = $2, province = $3, city = $4, district = $5,
		    detail = $6, lat = $7, lng = $8, is_default = $9, tag = $10, updated_at = $11
		WHERE id = $12 AND user_id = $13 AND deleted_at IS NULL`
	_, err = tx.ExecContext(ctx, query,
		addr.ContactName, addr.ContactPhone, addr.Province, addr.City, addr.District,
		addr.Detail, addr.Lat, addr.Lng, addr.IsDefault, addr.Tag, time.Now(), addr.ID, addr.UserID)
	if err != nil {
		return err
	}
	return tx.Commit()
}

// Delete 删除地址
func (r *AddressRepository) Delete(ctx context.Context, id int64, userID int64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE user_addresses SET deleted_at = $1 WHERE id = $2 AND user_id = $3`,
		time.Now(), id, userID)
	return err
}

// SetDefault 设置默认地址
func (r *AddressRepository) SetDefault(ctx context.Context, id int64, userID int64) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx,
		`UPDATE user_addresses SET is_default = 0 WHERE user_id = $1`, userID)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx,
		`UPDATE user_addresses SET is_default = 1 WHERE id = $1 AND user_id = $2`, id, userID)
	return tx.Commit()
}
