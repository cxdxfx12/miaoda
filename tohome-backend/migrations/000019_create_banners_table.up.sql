CREATE TABLE IF NOT EXISTS banners (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(255) DEFAULT '',
    image_url VARCHAR(500) DEFAULT '',
    link_url VARCHAR(500) DEFAULT '',
    sort INT DEFAULT 99,
    status INT DEFAULT 1,
    theme_color VARCHAR(255) DEFAULT '',
    icon VARCHAR(32) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_banners_status_sort ON banners(status, sort);
CREATE INDEX IF NOT EXISTS idx_banners_deleted_at ON banners(deleted_at);

COMMENT ON TABLE banners IS '首页轮播图表';
COMMENT ON COLUMN banners.status IS '0:停用 1:启用';

INSERT INTO banners (title, subtitle, image_url, link_url, sort, status, theme_color, icon, created_at, updated_at)
SELECT title, subtitle, image_url, link_url, sort, status, theme_color, icon, NOW(), NOW()
FROM (VALUES
    ('首单立减50元', '休闲·娱乐·按摩·影院', '', '/invite', 1, 1, 'linear-gradient(135deg, #FF6B9D 0%, #C44DFF 100%)', '🎁'),
    ('新人大礼包', '注册即送188元券包', '', '/coupons', 2, 1, 'linear-gradient(135deg, #7C5CFC 0%, #6366F1 100%)', '🧧'),
    ('真人认证', '100%真人·不满意可退款', '', '/about', 3, 1, 'linear-gradient(135deg, #34D399 0%, #06B6D4 100%)', '🛡️'),
    ('限时特惠', '休闲约会只要88元起', '', '/services?sort=price_asc', 4, 1, 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)', '🔥')
) AS seed(title, subtitle, image_url, link_url, sort, status, theme_color, icon)
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE deleted_at IS NULL);
