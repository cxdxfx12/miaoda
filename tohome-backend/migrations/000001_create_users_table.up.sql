-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    nickname VARCHAR(50),
    avatar VARCHAR(500),
    gender SMALLINT DEFAULT 0,
    birthday DATE,
    email VARCHAR(100),
    member_level SMALLINT DEFAULT 0,
    member_points INTEGER DEFAULT 0,
    member_expire_at TIMESTAMP,
    status SMALLINT DEFAULT 1,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.gender IS '0:未知 1:男 2:女';
COMMENT ON COLUMN users.status IS '0:禁用 1:正常';
COMMENT ON COLUMN users.member_level IS '0:普通 1:白银 2:黄金 3:钻石';
