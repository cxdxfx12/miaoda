-- 达人表
CREATE TABLE IF NOT EXISTS technicians (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    real_name VARCHAR(50) NOT NULL,
    id_card VARCHAR(20),
    gender SMALLINT NOT NULL,
    birthday DATE,
    avatar VARCHAR(500),
    phone VARCHAR(20) NOT NULL UNIQUE,
    emergency_contact VARCHAR(50),
    emergency_phone VARCHAR(20),
    skills JSONB DEFAULT '[]',
    certificates JSONB DEFAULT '[]',
    service_city VARCHAR(50),
    life_photos JSONB DEFAULT '[]',
    art_photos JSONB DEFAULT '[]',
    service_districts JSONB DEFAULT '[]',
    rating DECIMAL(3,2) DEFAULT 5.00,
    service_count INTEGER DEFAULT 0,
    positive_rate DECIMAL(5,2) DEFAULT 100.00,
    balance DECIMAL(10,2) DEFAULT 0.00,
    total_income DECIMAL(10,2) DEFAULT 0.00,
    status SMALLINT DEFAULT 0,
    work_status SMALLINT DEFAULT 0,
    current_lat DECIMAL(10,7),
    current_lng DECIMAL(10,7),
    location_updated_at TIMESTAMP,
    introduction TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_technicians_phone ON technicians(phone);
CREATE INDEX idx_technicians_user_id ON technicians(user_id);
CREATE INDEX idx_technicians_status ON technicians(status);
CREATE INDEX idx_technicians_work_status ON technicians(work_status);
CREATE INDEX idx_technicians_service_city ON technicians(service_city);
CREATE INDEX idx_technicians_rating ON technicians(rating DESC);
CREATE INDEX idx_technicians_deleted_at ON technicians(deleted_at);

COMMENT ON TABLE technicians IS '达人表';
COMMENT ON COLUMN technicians.status IS '0:待审核 1:正常 2:冻结 3:已拒绝';
COMMENT ON COLUMN technicians.work_status IS '0:离线 1:接单中 2:休息';
