-- 用户表添加微信OAuth字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS openid VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS unionid VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid);
CREATE INDEX IF NOT EXISTS idx_users_unionid ON users(unionid);

COMMENT ON COLUMN users.openid IS '微信公众号openid';
COMMENT ON COLUMN users.unionid IS '微信开放平台unionid';

-- 插入微信服务号默认配置
INSERT INTO system_configs (group_name, key, value, remark) VALUES
('wechat_mp', 'app_id', '', '公众号AppID'),
('wechat_mp', 'app_secret', '', '公众号AppSecret'),
('wechat_mp', 'token', '', '公众号消息校验Token'),
('wechat_mp', 'encoding_aes_key', '', '消息加解密密钥'),
('wechat_mp', 'redirect_uri', 'https://api.miaoda.cn/api/v1/auth/wechat/callback', 'OAuth回调地址'),
('wechat_mp', 'enabled', 'false', '是否启用微信登录')
ON CONFLICT (group_name, key) DO NOTHING;
