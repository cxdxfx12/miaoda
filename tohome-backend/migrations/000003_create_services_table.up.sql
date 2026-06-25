-- 服务分类表
CREATE TABLE IF NOT EXISTS service_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_service_categories_status ON service_categories(status);
CREATE INDEX idx_service_categories_sort ON service_categories(sort_order);

COMMENT ON TABLE service_categories IS '服务分类表';

-- 服务项目表
CREATE TABLE IF NOT EXISTS services (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_image VARCHAR(500),
    images JSONB DEFAULT '[]',
    category_id BIGINT REFERENCES service_categories(id),
    base_price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    specs JSONB DEFAULT '[]',
    status SMALLINT DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_sort ON services(sort_order);
CREATE INDEX idx_services_deleted_at ON services(deleted_at);

COMMENT ON TABLE services IS '服务项目表';
COMMENT ON COLUMN services.specs IS '服务规格JSON: [{"name":"60分钟","price":299,"duration":60}]';

-- 插入默认服务分类
INSERT INTO service_categories (name, icon, sort_order, status) VALUES
('全身按摩', '/icons/body-massage.svg', 1, 1),
('足疗保健', '/icons/foot-massage.svg', 2, 1),
('中医理疗', '/icons/tcm-therapy.svg', 3, 1),
('SPA美容', '/icons/spa.svg', 4, 1),
('肩颈调理', '/icons/shoulder-massage.svg', 5, 1),
('推拿艾灸', '/icons/tuina.svg', 6, 1);
