# 后端微服务基础镜像 - 多阶段构建
FROM golang:1.22-alpine AS builder

# 安装基础依赖
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# 复制 go.mod 和 go.sum 优先下载依赖(缓存优化)
ENV GOPROXY=https://goproxy.cn,direct
COPY go.mod go.sum* ./
RUN go mod download

# 复制源码
COPY . .

# 构建参数: SERVICE 指定要构建的微服务名
ARG SERVICE=gateway
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" \
    -o /build/bin/${SERVICE} \
    ./cmd/${SERVICE}

# 运行阶段
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata curl postgresql-client \
    && update-ca-certificates

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -sf /usr/share/zoneinfo/${TZ} /etc/localtime \
    && echo ${TZ} > /etc/timezone

WORKDIR /app

# 从构建阶段复制二进制
ARG SERVICE=gateway
COPY --from=builder /build/bin/${SERVICE} /app/server
COPY --from=builder /build/configs /app/configs
COPY --from=builder /build/migrations /app/migrations

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

ENTRYPOINT ["/app/server"]
