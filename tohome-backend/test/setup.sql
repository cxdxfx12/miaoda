-- ============================================================
-- 喵搭端到端测试 种子数据
-- 运行: psql -U mydda -d mydda -h 127.0.0.1 -f test/setup.sql
-- ============================================================

-- 管理员用户 (password_hash 请先通过 Go 程序或 bcrypt 工具生成)
-- 密码: admin123
-- 生成方式: cd tohome-backend && go run test/bcrypt_gen/main.go admin123
INSERT INTO users (phone, password_hash, nickname, avatar, member_level, status, created_at, updated_at) VALUES
('admin', '-- 请替换为 bcrypt hash --', '管理员', '', 3, 1, NOW(), NOW())
ON CONFLICT (phone) DO UPDATE SET member_level = 3, status = 1;

-- 服务类别
INSERT INTO service_categories (name, icon, sort_order, status, created_at, updated_at) 
SELECT * FROM (VALUES
    ('全身按摩', 'spa', 1, 1, NOW(), NOW()),
    ('足疗养生', 'foot', 2, 1, NOW(), NOW()),
    ('推拿正骨', 'bone', 3, 1, NOW(), NOW()),
    ('精油SPA', 'oil', 4, 1, NOW(), NOW()),
    ('艾灸理疗', 'moxa', 5, 1, NOW(), NOW())
) AS t(name, icon, sort_order, status, created_at, updated_at)
WHERE NOT EXISTS (SELECT 1 FROM service_categories LIMIT 1);

-- 服务项目
INSERT INTO services (name, description, cover_image, category_id, base_price, original_price, specs, status, sort_order, created_at, updated_at) 
VALUES
(
    '经典全身按摩',
    '60分钟专业全身放松按摩，缓解疲劳，舒筋活络',
    'https://img.mydda.cn/service/fullbody.jpg',
    1, 198.00, 258.00,
    '[{"name":"标准60分钟","price":198,"duration":60},{"name":"尊享90分钟","price":298,"duration":90},{"name":"豪华120分钟","price":398,"duration":120}]'::jsonb,
    1, 1, NOW(), NOW()
),
(
    '足疗养生',
    '专业足部穴位按摩 + 中药泡脚，促进血液循环',
    'https://img.mydda.cn/service/foot.jpg',
    2, 128.00, 168.00,
    '[{"name":"标准45分钟","price":128,"duration":45},{"name":"深度60分钟","price":188,"duration":60}]'::jsonb,
    1, 2, NOW(), NOW()
),
(
    '精油SPA',
    '使用天然精油进行全身按摩，芳香疗法放松身心',
    'https://img.mydda.cn/service/spa.jpg',
    4, 298.00, 398.00,
    '[{"name":"瑞典式60分钟","price":298,"duration":60},{"name":"泰式90分钟","price":398,"duration":90}]'::jsonb,
    1, 3, NOW(), NOW()
)
ON CONFLICT DO NOTHING;
