-- =============================================
-- 修复脚本：更新分类 + 创建规格表 + 写入规格数据
-- =============================================

-- ① 清空并重新写入 4 个分类（匹配前端 CATEGORY_MAP）
TRUNCATE service_categories RESTART IDENTITY CASCADE;
INSERT INTO service_categories (id, name, icon, sort_order, status) VALUES
(1,'休闲陪伴','🎱',1,1),
(2,'娱乐陪伴','🎮',2,1),
(3,'按摩服务','💆',3,1),
(4,'影院陪伴','🎬',4,1);

-- ② 创建 service_specs 表（如果不存在）
CREATE TABLE IF NOT EXISTS service_specs (
    id BIGSERIAL PRIMARY KEY,
    service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    duration INTEGER NOT NULL DEFAULT 60,
    sort_order INTEGER DEFAULT 1,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ③ 写入 26 个规格
INSERT INTO service_specs (service_id, name, price, duration, sort_order, status) VALUES
(101,'1小时',88,60,1,1),(102,'1场',68,120,1,1),(103,'2小时',128,120,1,1),(104,'半天',158,240,1,1),
(105,'2小时',98,120,1,1),(106,'1餐',128,90,1,1),(107,'2小时',108,120,1,1),(108,'2小时',78,120,1,1),
(201,'1小时',88,60,1,1),(202,'3小时',168,180,1,1),(203,'1场',288,180,1,1),(204,'1天',328,480,1,1),
(205,'1-3天',688,1440,1,1),(206,'2小时',128,120,1,1),(301,'60分钟',168,60,1,1),(302,'90分钟',238,90,1,1),
(303,'90分钟',298,90,1,1),(304,'60分钟',128,60,1,1),(305,'60分钟',198,60,1,1),(306,'80分钟',218,80,1,1),
(401,'2小时',198,120,1,1),(402,'3小时',298,180,1,1),(403,'4小时',398,240,1,1),(404,'2小时',128,120,1,1);

-- ④ 同时把规格写入 services.specs JSONB 字段（供前端直接读取）
UPDATE services SET specs = CASE id
  WHEN 101 THEN '[{"name":"1小时","price":88,"duration":60}]'
  WHEN 102 THEN '[{"name":"1场","price":68,"duration":120}]'
  WHEN 103 THEN '[{"name":"2小时","price":128,"duration":120}]'
  WHEN 104 THEN '[{"name":"半天","price":158,"duration":240}]'
  WHEN 105 THEN '[{"name":"2小时","price":98,"duration":120}]'
  WHEN 106 THEN '[{"name":"1餐","price":128,"duration":90}]'
  WHEN 107 THEN '[{"name":"2小时","price":108,"duration":120}]'
  WHEN 108 THEN '[{"name":"2小时","price":78,"duration":120}]'
  WHEN 201 THEN '[{"name":"1小时","price":88,"duration":60}]'
  WHEN 202 THEN '[{"name":"3小时","price":168,"duration":180}]'
  WHEN 203 THEN '[{"name":"1场","price":288,"duration":180}]'
  WHEN 204 THEN '[{"name":"1天","price":328,"duration":480}]'
  WHEN 205 THEN '[{"name":"1-3天","price":688,"duration":1440}]'
  WHEN 206 THEN '[{"name":"2小时","price":128,"duration":120}]'
  WHEN 301 THEN '[{"name":"60分钟","price":168,"duration":60}]'
  WHEN 302 THEN '[{"name":"90分钟","price":238,"duration":90}]'
  WHEN 303 THEN '[{"name":"90分钟","price":298,"duration":90}]'
  WHEN 304 THEN '[{"name":"60分钟","price":128,"duration":60}]'
  WHEN 305 THEN '[{"name":"60分钟","price":198,"duration":60}]'
  WHEN 306 THEN '[{"name":"80分钟","price":218,"duration":80}]'
  WHEN 401 THEN '[{"name":"2小时","price":198,"duration":120}]'
  WHEN 402 THEN '[{"name":"3小时","price":298,"duration":180}]'
  WHEN 403 THEN '[{"name":"4小时","price":398,"duration":240}]'
  WHEN 404 THEN '[{"name":"2小时","price":128,"duration":120}]'
END WHERE id IN (101,102,103,104,105,106,107,108,201,202,203,204,205,206,301,302,303,304,305,306,401,402,403,404);
