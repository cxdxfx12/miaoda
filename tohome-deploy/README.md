# 部署指南 - 喵搭 O2O 平台

## 目录结构

```
tohome-deploy/
├── nginx/                  # Nginx 反向代理配置
│   ├── nginx.conf
│   └── conf.d/
│       └── default.conf
├── prometheus/             # Prometheus 监控配置
│   └── prometheus.yml
├── centrifugo/             # Centrifugo WebSocket 配置
│   └── config.json
└── k8s/                    # Kubernetes 部署清单(待补充)
```

## 部署架构

```
                    ┌──────────────┐
                    │   Nginx 80   │
                    │  (反向代理)  │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
       ┌────▼────┐   ┌─────▼─────┐   ┌────▼────┐
       │  Admin  │   │  Gateway  │   │Centrifugo│
       │  :3000  │   │   :8080   │   │  :8000   │
       └─────────┘   └─────┬─────┘   └─────────┘
                           │
         ┌────────┬────────┼────────┬────────┐
         │        │        │        │        │
     ┌───▼──┐ ┌──▼──┐ ┌───▼──┐ ┌───▼──┐ ┌───▼──┐
     │ User │ │Order│ │Talent│ │Pay   │ │Disp  │
     │ 8081 │ │ 8082│ │ 8083 │ │ 8084 │ │ 8085 │
     └──┬───┘ └──┬──┘ └──┬───┘ └──┬───┘ └──┬───┘
        │        │       │        │        │
        └────────┴───────┴────────┴────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
   ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
   │Postgres │ │  Redis  │ │RabbitMQ │
   │  :5432  │ │  :6379  │ │  :5672  │
   └─────────┘ └─────────┘ └─────────┘
```

## 一键部署

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看特定服务日志
docker-compose logs -f gateway

# 停止所有服务
docker-compose down

# 完全清理(含数据卷)
docker-compose down -v
```

## HTTPS 配置

1. 将 SSL 证书放入 `nginx/ssl/` 目录:
   - `miaoda.cn.crt`
   - `miaoda.cn.key`

2. 修改 `nginx/conf.d/default.conf` 添加:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name api.miaoda.cn admin.miaoda.cn;

       ssl_certificate     /etc/nginx/ssl/miaoda.cn.crt;
       ssl_certificate_key /etc/nginx/ssl/miaoda.cn.key;

       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;
       ssl_session_cache shared:SSL:10m;
       ssl_session_timeout 10m;

       # 通用配置同 80 端口
   }
   ```

3. 重启 Nginx:
   ```bash
   docker-compose restart nginx
   ```

## 数据库迁移

```bash
# 手动执行迁移
docker-compose exec postgres psql -U miaoda -d miaoda -f /docker-entrypoint-initdb.d/000001_create_users_table.up.sql

# 或使用 migrate 工具
docker run --rm -v $(pwd)/miaoda-backend/migrations:/migrations \
    migrate/migrate \
    -path=/migrations/ \
    -database "postgresql://miaoda:miaoda123@postgres:5432/miaoda?sslmode=disable" up
```

## 监控告警

- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- 预置仪表盘: 系统状态、订单量、响应时间、错误率

## 性能调优

### PostgreSQL
```sql
-- 关键索引
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_talents_location ON talents USING gist(location);
```

### Redis
```
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### Nginx
```
worker_processes auto;
worker_connections 4096;
keepalive_timeout 65;
```

## 灾备建议

1. **数据库**: 每日全量备份 + 每小时增量
   ```bash
   docker-compose exec postgres pg_dump -U miaoda miaoda > backup.sql
   ```

2. **文件存储**: 七牛云/OSS 异地容灾

3. **日志收集**: ELK / Loki 集中存储

4. **多可用区**: 数据库主从 + 读写分离
