package service

import (
	"github.com/redis/go-redis/v9"
)

type redisClient = redis.Client

var globalRedis *redis.Client

// InitGlobalRedis 初始化全局 Redis 客户端
func InitGlobalRedis(client *redis.Client) {
	globalRedis = client
}
