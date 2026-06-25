# 喵搭 Backend - 喵搭达人服务平台后端

基于 Go + Gin 的微服务架构，提供完整的喵搭达人O2O平台后端服务。

**公司**: 杭州喵喵至家网络有限公司

## 服务列表

| 服务 | 端口 | 说明 |
|------|------|------|
| gateway | 8080 | API网关，统一入口 |
| user | 8081 | 用户服务 |
| order | 8082 | 订单服务 |
| talent | 8083 | 达人服务 |
| payment | 8084 | 支付服务 |
| dispatch | 8085 | 调度服务 |

## 技术栈

- **语言**: Go 1.22+
- **Web框架**: Gin
- **数据库**: PostgreSQL 16+ (主库) + Redis 7.2+ (缓存)
- **消息队列**: RabbitMQ
- **实时通信**: WebSocket + Centrifugo
- **服务发现**: Consul
- **配置管理**: Viper
- **日志**: Logrus

## 目录结构

```
tohome-backend/
├── cmd/                # 各服务入口
│   ├── gateway/        # API网关
│   ├── user/           # 用户服务
│   ├── order/          # 订单服务
│   ├── talent/         # 达人服务
│   ├── payment/        # 支付服务
│   └── dispatch/       # 调度服务
├── internal/           # 内部实现
│   ├── model/          # 数据模型
│   ├── service/        # 业务逻辑
│   ├── handler/        # HTTP处理器
│   ├── repository/     # 数据访问层
│   ├── middleware/     # 中间件
│   ├── config/         # 配置
│   └── router/         # 路由
├── pkg/                # 公共包
├── configs/            # 配置文件
├── migrations/         # 数据库迁移
└── deploy/             # 部署文件
```

## 快速开始

### 环境要求

- Go 1.22+
- PostgreSQL 16+
- Redis 7.2+
- RabbitMQ 3.13+
- Consul 1.18+

### 本地开发

1. **克隆代码**
   ```bash
   git clone https://github.com/miaoda/backend.git
   cd tohome-backend
   ```

2. **启动依赖服务**
   ```bash
   docker-compose -f deploy/docker-compose.yml up -d
   ```

3. **安装依赖**
   ```bash
   go mod tidy
   ```

4. **运行数据库迁移**
   ```bash
   make migrate-up
   ```

5. **启动服务**
   ```bash
   # 启动所有服务
   make run-all
   
   # 或单独启动某个服务
   go run cmd/user/main.go
   ```

### 构建

```bash
make build
```

### 测试

```bash
make test
```

## API文档

完整API文档请参考 [API.md](../tohome-docs/API.md)

## 核心功能

- **用户端**: 用户注册登录、服务浏览、下单支付、订单跟踪、达人评价
- **达人端**: 达人注册审核、接单管理、订单状态流转、收入统计、定位打卡
- **管理后台**: 数据概览、订单管理、达人管理、用户管理、支付配置、地图配置、达人审核、虚拟电话配置
- **调度系统**: 智能派单、超时检查、距离计算、就近匹配

## 部署

### Docker

```bash
docker build -t miaoda-backend:latest .
docker run -d --name miaoda-backend miaoda-backend:latest
```

### Kubernetes

```bash
kubectl apply -f deploy/k8s/
```

## License

MIT
