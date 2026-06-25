-- 用户地址表
CREATE TABLE IF NOT EXISTS user_addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    contact_name VARCHAR(50) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    province VARCHAR(50),
    city VARCHAR(50),
    district VARCHAR(50),
    detail VARCHAR(200),
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    is_default SMALLINT DEFAULT 0,
    tag VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_deleted_at ON user_addresses(deleted_at);

COMMENT ON TABLE user_addresses IS '用户地址表';
COMMENT ON COLUMN user_addresses.tag IS '地址标签：家、公司、学校等';

-- 技师位置轨迹表
CREATE TABLE IF NOT EXISTS technician_tracks (
    id BIGSERIAL PRIMARY KEY,
    technician_id BIGINT NOT NULL REFERENCES technicians(id),
    order_id BIGINT REFERENCES orders(id),
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    status SMALLINT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracks_technician_id ON technician_tracks(technician_id);
CREATE INDEX idx_tracks_order_id ON technician_tracks(order_id);
CREATE INDEX idx_tracks_recorded_at ON technician_tracks(recorded_at);

COMMENT ON TABLE technician_tracks IS '技师位置轨迹表';

-- 收藏表
CREATE TABLE IF NOT EXISTS user_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    target_type SMALLINT NOT NULL,
    target_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_target ON user_favorites(target_type, target_id);

COMMENT ON TABLE user_favorites IS '用户收藏表';
COMMENT ON COLUMN user_favorites.target_type IS '1:技师 2:服务';

-- 提现记录表
CREATE TABLE IF NOT EXISTS withdraws (
    id BIGSERIAL PRIMARY KEY,
    withdraw_no VARCHAR(32) NOT NULL UNIQUE,
    technician_id BIGINT NOT NULL REFERENCES technicians(id),
    amount DECIMAL(10,2) NOT NULL,
    bank_name VARCHAR(50),
    bank_account VARCHAR(50),
    account_name VARCHAR(50),
    status SMALLINT DEFAULT 0,
    reject_reason VARCHAR(255),
    processed_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdraws_technician_id ON withdraws(technician_id);
CREATE INDEX idx_withdraws_status ON withdraws(status);
CREATE INDEX idx_withdraws_withdraw_no ON withdraws(withdraw_no);

COMMENT ON TABLE withdraws IS '提现记录表';
COMMENT ON COLUMN withdraws.status IS '0:待审核 1:已审核 2:已拒绝 3:已打款';

-- 通知消息表
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    user_type SMALLINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    data JSONB DEFAULT '{}',
    is_read SMALLINT DEFAULT 0,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, user_type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

COMMENT ON TABLE notifications IS '通知消息表';
COMMENT ON COLUMN notifications.user_type IS '1:用户 2:技师 3:管理员';
COMMENT ON COLUMN notifications.is_read IS '0:未读 1:已读';

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar VARCHAR(500),
    email VARCHAR(100),
    phone VARCHAR(20),
    role_id BIGINT,
    status SMALLINT DEFAULT 1,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_deleted_at ON admins(deleted_at);

COMMENT ON TABLE admins IS '管理员表';

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    permissions JSONB DEFAULT '[]',
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_code ON roles(code);
CREATE INDEX idx_roles_status ON roles(status);

COMMENT ON TABLE roles IS '角色表';

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    user_type SMALLINT,
    username VARCHAR(50),
    module VARCHAR(50),
    action VARCHAR(50),
    description TEXT,
    request_data JSONB,
    response_data JSONB,
    ip VARCHAR(50),
    user_agent VARCHAR(500),
    duration INTEGER,
    status SMALLINT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX idx_operation_logs_module ON operation_logs(module);
CREATE INDEX idx_operation_logs_created_at ON operation_logs(created_at);

COMMENT ON TABLE operation_logs IS '操作日志表';

-- 插入默认数据
INSERT INTO roles (name, code, description, permissions) VALUES
('超级管理员', 'super_admin', '拥有所有权限', '["*"]'),
('运营管理员', 'operator', '运营管理', '["order:*", "user:*", "technician:read", "marketing:*"]'),
('客服', 'customer_service', '客服人员', '["order:read", "order:update", "user:read", "review:*"]'),
('财务', 'finance', '财务人员', '["payment:*", "refund:*", "withdraw:*", "settlement:*"]');

-- 插入默认管理员（密码: admin123）
INSERT INTO admins (username, password_hash, nickname, email, role_id, status) VALUES
('admin', '$2a$10$DYM75e5YmVeH8ERAkPdf/OthTYqed.qDFndna.9J44H1mF6.6/GBy', '超级管理员', 'admin@tohome.com', 1, 1);
