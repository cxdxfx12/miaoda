-- =============================================
-- 修复脚本 V2：恢复 services + 创建 specs + 写入规格
-- 注意：categories 已正确(4条)，不再操作
-- =============================================

-- ① 恢复 24 个服务项目（被 CASCADE 级联删除的）
INSERT INTO services (id, category_id, name, description, base_price, original_price, status, sort_order, order_count, view_count, created_at, updated_at) VALUES
(101,1,'台球陪练','专业台球陪练技术指导+对打练习',88,128,1,1,326,1200,NOW(),NOW()),
(102,1,'观影陪伴','陪你看电影聊剧情分享感悟',68,0,1,2,512,2100,NOW(),NOW()),
(103,1,'茶艺品鉴','专业茶艺师带你品味各类名茶',128,168,1,3,189,980,NOW(),NOW()),
(104,1,'爬山徒步','户外爬山徒步沿途赏景拍照',158,0,1,4,257,850,NOW(),NOW()),
(105,1,'麻将陪玩','麻将搭子陪玩技术水平在线',98,0,1,5,445,1600,NOW(),NOW()),
(106,1,'吃饭陪伴','陪你吃饭聊天探店网红餐厅',128,0,1,6,623,2300,NOW(),NOW()),
(107,1,'逛街陪伴','专业逛街搭子帮你搭配参考意见',108,0,1,7,378,1400,NOW(),NOW()),
(108,1,'桌游陪玩','狼人杀剧本杀三国杀各种桌游陪玩',78,0,1,8,534,1900,NOW(),NOW()),
(201,2,'电竞游戏','LOL王者吃鸡PUBG陪玩大神带你飞',88,108,1,1,892,3500,NOW(),NOW()),
(202,2,'K歌微醺','KTV包厢陪同欢唱气氛担当',168,0,1,2,456,2100,NOW(),NOW()),
(203,2,'商务酒局','商务宴请陪同出席专业礼仪得体应酬',288,0,1,3,134,780,NOW(),NOW()),
(204,2,'同城旅游','同城景点一日游网红打卡小众秘境',328,0,1,4,298,1200,NOW(),NOW()),
(205,2,'异地旅游','周边城市短期旅行陪伴行程规划全程陪同',688,0,1,5,87,560,NOW(),NOW()),
(206,2,'密室逃脱','密室剧本杀队友智商在线演技在线',128,0,1,6,367,1500,NOW(),NOW()),
(301,3,'中式按摩','传统中式推拿手法舒筋活络缓解疲劳',168,218,1,1,1205,5200,NOW(),NOW()),
(302,3,'泰式SPA','正宗泰式拉伸按摩配合精油SPA深层放松',238,0,1,2,876,3800,NOW(),NOW()),
(303,3,'扶阳SPA','中医扶阳理论温灸经络疏通提升阳气',298,398,1,3,654,2900,NOW(),NOW()),
(304,3,'足疗保健','足底穴位按摩中药泡脚疏通反射区',128,0,1,4,1023,4400,NOW(),NOW()),
(305,3,'精油推背','植物精油推背SPA舒缓肌肉紧张改善睡眠',198,0,1,5,745,3100,NOW(),NOW()),
(306,3,'经络疏通','经络刮痧穴位点压拔罐疏通经络排除湿气',218,0,1,6,567,2400,NOW(),NOW()),
(401,4,'情窦初开','私人影院双人观影温馨氛围轻松愉悦',198,258,1,1,423,1800,NOW(),NOW()),
(402,4,'情难自控','沉浸式影院体验亲密陪伴私享二人世界',298,0,1,2,356,1500,NOW(),NOW()),
(403,4,'共度今宵','高端私人影院包场精致布置香槟小食',398,0,1,3,187,920,NOW(),NOW()),
(404,4,'经典观影','经典影片重温专业解说陪伴解读电影美学',128,0,1,4,289,1100,NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

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

-- ③ 写入 26 个规格（每个服务对应一个默认规格）
INSERT INTO service_specs (service_id, name, price, duration, sort_order, status) VALUES
(101,'1小时',88,60,1,1),(102,'1场',68,120,1,1),(103,'2小时',128,120,1,1),(104,'半天',158,240,1,1),
(105,'2小时',98,120,1,1),(106,'1餐',128,90,1,1),(107,'2小时',108,120,1,1),(108,'2小时',78,120,1,1),
(201,'1小时',88,60,1,1),(202,'3小时',168,180,1,1),(203,'1场',288,180,1,1),(204,'1天',328,480,1,1),
(205,'1-3天',688,1440,1,1),(206,'2小时',128,120,1,1),(301,'60分钟',168,60,1,1),(302,'90分钟',238,90,1,1),
(303,'90分钟',298,90,1,1),(304,'60分钟',128,60,1,1),(305,'60分钟',198,60,1,1),(306,'80分钟',218,80,1,1),
(401,'2小时',198,120,1,1),(402,'3小时',298,180,1,1),(403,'4小时',398,240,1,1),(404,'2小时',128,120,1,1)
ON CONFLICT (id) DO NOTHING;

-- ④ 更新 services.specs JSONB 字段（供前端直接读取展示）
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
