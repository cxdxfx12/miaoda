// Package model 数据模型 - 用户地址
package model

import (
	"database/sql"
	"time"
)

// UserAddress 用户地址
type UserAddress struct {
	ID           int64        `db:"id" json:"id"`
	UserID       int64        `db:"user_id" json:"user_id"`
	ContactName  string       `db:"contact_name" json:"contact_name"`
	ContactPhone string       `db:"contact_phone" json:"contact_phone"`
	Province     string       `db:"province" json:"province"`
	City         string       `db:"city" json:"city"`
	District     string       `db:"district" json:"district"`
	Detail       string       `db:"detail" json:"detail"`
	Lat          *float64     `db:"lat" json:"lat"`
	Lng          *float64     `db:"lng" json:"lng"`
	IsDefault    int          `db:"is_default" json:"is_default"`
	Tag          *string      `db:"tag" json:"tag"`
	CreatedAt    time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time    `db:"updated_at" json:"updated_at"`
	DeletedAt    sql.NullTime `db:"deleted_at" json:"-"`
}

// TableName 表名
func (UserAddress) TableName() string {
	return "user_addresses"
}

// Notification 通知消息
type Notification struct {
	ID        int64      `db:"id" json:"id"`
	UserID    int64      `db:"user_id" json:"user_id"`
	UserType  int        `db:"user_type" json:"user_type"`
	Type      string     `db:"type" json:"type"`
	Title     string     `db:"title" json:"title"`
	Content   *string    `db:"content" json:"content"`
	Data      JSON       `db:"data" json:"data"`
	IsRead    int        `db:"is_read" json:"is_read"`
	ReadAt    *time.Time `db:"read_at" json:"read_at"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
}

// TableName 表名
func (Notification) TableName() string {
	return "notifications"
}

// Admin 管理员
type Admin struct {
	ID           int64          `db:"id" json:"id"`
	Username     string         `db:"username" json:"username"`
	PasswordHash string         `db:"password_hash" json:"-"`
	Nickname     sql.NullString `db:"nickname" json:"nickname"`
	Avatar       sql.NullString `db:"avatar" json:"avatar"`
	Email        sql.NullString `db:"email" json:"email"`
	Phone        sql.NullString `db:"phone" json:"phone"`
	RoleID       *int64         `db:"role_id" json:"role_id"`
	RoleCode     sql.NullString `db:"role_code" json:"role_code"`
	CityName     sql.NullString `db:"city_name" json:"city_name"`
	Permissions  JSON           `db:"permissions" json:"permissions"`
	Status       int            `db:"status" json:"status"`
	LastLoginAt  *time.Time     `db:"last_login_at" json:"last_login_at"`
	LastLoginIP  sql.NullString `db:"last_login_ip" json:"last_login_ip"`
	CreatedAt    time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time      `db:"updated_at" json:"updated_at"`
	DeletedAt    sql.NullTime   `db:"deleted_at" json:"-"`
}

// TableName 表名
func (Admin) TableName() string {
	return "admins"
}

// Role 角色
type Role struct {
	ID          int64     `db:"id" json:"id"`
	Name        string    `db:"name" json:"name"`
	Code        string    `db:"code" json:"code"`
	Description string    `db:"description" json:"description"`
	Permissions JSON      `db:"permissions" json:"permissions"`
	Status      int       `db:"status" json:"status"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
}

// TableName 表名
func (Role) TableName() string {
	return "roles"
}
