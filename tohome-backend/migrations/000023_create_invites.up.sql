CREATE TABLE IF NOT EXISTS user_invite_codes (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    invite_code VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invite_codes_user_id ON user_invite_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_invite_codes_code ON user_invite_codes(invite_code);

CREATE TABLE IF NOT EXISTS user_invites (
    id BIGSERIAL PRIMARY KEY,
    inviter_id BIGINT NOT NULL REFERENCES users(id),
    invitee_id BIGINT NOT NULL REFERENCES users(id),
    invite_code VARCHAR(32) NOT NULL,
    status SMALLINT DEFAULT 0,
    reward_order_id BIGINT,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_order_at TIMESTAMP,
    rewarded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invites_invitee_id ON user_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_inviter_id ON user_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_status ON user_invites(status);

CREATE TABLE IF NOT EXISTS user_invite_rewards (
    id BIGSERIAL PRIMARY KEY,
    invite_id BIGINT NOT NULL REFERENCES user_invites(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    reward_type VARCHAR(32) NOT NULL,
    reward_value DECIMAL(10,2) DEFAULT 0,
    coupon_id BIGINT,
    order_id BIGINT,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_invite_rewards_invite_id ON user_invite_rewards(invite_id);
CREATE INDEX IF NOT EXISTS idx_user_invite_rewards_user_id ON user_invite_rewards(user_id);

COMMENT ON TABLE user_invite_codes IS '用户专属邀请码';
COMMENT ON TABLE user_invites IS '用户邀请关系';
COMMENT ON COLUMN user_invites.status IS '0:已注册 1:首单完成 2:奖励已发放';
COMMENT ON TABLE user_invite_rewards IS '邀请奖励流水';
