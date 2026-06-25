# 喵搭 O2O 平台

> 专业的喵搭达人 O2O 服务平台 - 客户端 / 达人端 / 管理后台 / 后端服务

**公司**: 杭州喵喵至家网络有限公司

## 项目架构

```
tohome/
├── tohome-backend/        # 后端 - Go + Gin 微服务
├── tohome-user-app/       # 用户端 - React Native
├── tohome-tech-app/       # 达人端 - React Native
├── tohome-admin/          # 管理后台 - Next.js 15
├── tohome-deploy/         # 部署配置 - Docker/Nginx/Prometheus
├── tohome-docs/           # 项目文档
├── docker-compose.yml     # 容器编排
└── 喵搭达人服务平台开发文档.md  # 详细开发文档
```

## 技术栈

### 后端
- Go 1.22+ / Gin
- PostgreSQL 16 (PostGIS) / Redis 7.2
- RabbitMQ / Centrifugo (WebSocket)
- 微服务: gateway / user / order / talent / payment / dispatch

### 用户端 APP
- React Native 0.75.4
- Zustand / TanStack Query
- Phosphor Icons

### 达人端 APP
- React Native 0.75.4
- 实时定位 / 订单推送

### 管理后台
- Next.js 15.0.3 (App Router)
- React 18 + TypeScript
- Tailwind CSS 4.0
- Radix UI / Lucide Icons
- Recharts / Zustand

## 快速开始

### 1. 环境准备
- Docker 24+
- Docker Compose 2.0+
- Node.js 20+ (本地开发)
- Go 1.22+ (本地开发)

### 2. 启动所有服务

```bash
# 复制环境变量配置
cp .env.example .env

# 启动所有服务(后端 + 数据库 + 管理后台 + 监控)
docker-compose up -d

# 查看日志
docker-compose logs -f

# 访问服务
# 管理后台: http://localhost:3000
# API 网关: http://localhost:8080
# RabbitMQ: http://localhost:15672
# Grafana: http://localhost:3001
# Prometheus: http://localhost:9090
```

### 3. 单独启动某个服务

```bash
# 仅启动基础服务
docker-compose up -d postgres redis rabbitmq centrifugo

# 启动指定微服务
docker-compose up -d gateway order-service
```

### 4. 本地开发

```bash
# 后端
cd tohome-backend
go mod download
go run cmd/gateway/main.go

# 用户端
cd tohome-user-app
npm install
npm start  # 启动 Metro

# 管理后台
cd tohome-admin
npm install
npm run dev
```

## 默认账号

- 管理后台: `admin` / `admin123`
- 数据库: `miaoda` / `miaoda123`
- Redis: 无用户名 / `redis123`
- RabbitMQ: `miaoda` / `rabbit123`

## 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80/443 | 反向代理 |
| API Gateway | 8080 | API 统一入口 |
| User Service | 8081 | 用户微服务 |
| Order Service | 8082 | 订单微服务 |
| Talent Service | 8083 | 达人微服务 |
| Payment Service | 8084 | 支付微服务 |
| Dispatch Service | 8085 | 派单微服务 |
| Admin Web | 3000 | 管理后台 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| RabbitMQ | 5672/15672 | 消息队列 |
| Centrifugo | 8000 | WebSocket |
| Prometheus | 9090 | 监控 |
| Grafana | 3001 | 监控可视化 |

## 开发文档

- [喵搭达人服务平台开发文档.md](./喵搭达人服务平台开发文档.md) - 完整开发文档
- [tohome-backend/README.md](./tohome-backend/README.md) - 后端说明
- [tohome-admin/README.md](./tohome-admin/README.md) - 管理后台说明

## License

MIT
