// Package database 提供数据库连接管理
package database

import (
	"context"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"

	"github.com/miaoda/backend/internal/config"
)

// DB 全局数据库连接
var DB *sqlx.DB

// RedisClient 全局Redis客户端
var RedisClient *redis.Client

// InitPostgres 初始化PostgreSQL连接
func InitPostgres(cfg *config.DatabaseConfig) error {
	db, err := sqlx.Connect("postgres", cfg.DSN())
	if err != nil {
		return fmt.Errorf("连接数据库失败: %w", err)
	}

	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("数据库ping失败: %w", err)
	}

	DB = db
	return nil
}

// InitRedis 初始化Redis连接
func InitRedis(cfg *config.RedisConfig) error {
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     cfg.Addr(),
		Password: cfg.Password,
		DB:       cfg.DB,
		PoolSize: cfg.PoolSize,
	})

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, err := RedisClient.Ping(ctx).Result(); err != nil {
		return fmt.Errorf("Redis连接失败: %w", err)
	}

	return nil
}

// Close 关闭数据库连接
func Close() {
	if DB != nil {
		DB.Close()
	}
	if RedisClient != nil {
		RedisClient.Close()
	}
}

// Database 返回全局数据库连接（用于 service 层直接查询）
func Database() *sqlx.DB {
	return DB
}
