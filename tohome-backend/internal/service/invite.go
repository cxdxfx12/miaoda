package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/miaoda/backend/pkg/database"
	"github.com/miaoda/backend/pkg/logger"
)

const (
	inviteeCouponValue = 20.0
	inviterCouponValue = 10.0
	inviterPoints      = 1000
)

type InviteInfo struct {
	InviteCode  string                   `json:"invite_code"`
	InviteURL   string                   `json:"invite_url"`
	Stats       map[string]interface{}   `json:"stats"`
	Records     []map[string]interface{} `json:"records"`
	RewardRules []string                 `json:"reward_rules"`
}

func normalizeInviteCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

func generateInviteCode(userID int64) string {
	return fmt.Sprintf("MD%06d%02d", userID%1000000, rand.Intn(100))
}

func EnsureInviteCode(ctx context.Context, userID int64) (string, error) {
	db := database.Database()
	var code string
	if err := db.GetContext(ctx, &code, `SELECT invite_code FROM user_invite_codes WHERE user_id = $1`, userID); err == nil {
		return code, nil
	}
	for i := 0; i < 5; i++ {
		code = generateInviteCode(userID)
		err := db.QueryRowxContext(ctx, `
			INSERT INTO user_invite_codes (user_id, invite_code, created_at, updated_at)
			VALUES ($1, $2, NOW(), NOW())
			ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
			RETURNING invite_code`, userID, code).Scan(&code)
		if err == nil {
			return code, nil
		}
	}
	return "", errors.New("生成邀请码失败")
}

func BindInviteOnRegister(ctx context.Context, inviteeID int64, inviteCode string) error {
	code := normalizeInviteCode(inviteCode)
	if code == "" {
		return nil
	}
	db := database.Database()
	var inviterID int64
	if err := db.GetContext(ctx, &inviterID, `SELECT user_id FROM user_invite_codes WHERE invite_code = $1`, code); err != nil {
		return nil
	}
	if inviterID == inviteeID {
		return nil
	}
	var exists int
	_ = db.GetContext(ctx, &exists, `SELECT COUNT(*) FROM user_invites WHERE invitee_id = $1`, inviteeID)
	if exists > 0 {
		return nil
	}
	_, err := db.ExecContext(ctx, `
		INSERT INTO user_invites (inviter_id, invitee_id, invite_code, status, registered_at, created_at, updated_at)
		VALUES ($1, $2, $3, 0, NOW(), NOW(), NOW())`, inviterID, inviteeID, code)
	if err != nil {
		logger.Error("绑定邀请关系失败: invitee=%d code=%s err=%v", inviteeID, code, err)
	}
	return err
}

func GetInviteInfo(ctx context.Context, userID int64, origin string) (*InviteInfo, error) {
	code, err := EnsureInviteCode(ctx, userID)
	if err != nil {
		return nil, err
	}
	db := database.Database()
	var total, pending, rewarded, points int
	var rewardAmount float64
	_ = db.GetContext(ctx, &total, `SELECT COUNT(*) FROM user_invites WHERE inviter_id = $1`, userID)
	_ = db.GetContext(ctx, &pending, `SELECT COUNT(*) FROM user_invites WHERE inviter_id = $1 AND status IN (0, 1)`, userID)
	_ = db.GetContext(ctx, &rewarded, `SELECT COUNT(*) FROM user_invites WHERE inviter_id = $1 AND status = 2`, userID)
	_ = db.GetContext(ctx, &rewardAmount, `SELECT COALESCE(SUM(reward_value), 0) FROM user_invite_rewards WHERE user_id = $1 AND reward_type IN ('inviter_points', 'inviter_coupon')`, userID)
	_ = db.GetContext(ctx, &points, `SELECT COALESCE(member_points, 0) FROM users WHERE id = $1`, userID)
	stats := map[string]interface{}{"total": total, "pending": pending, "rewarded": rewarded, "reward_amount": rewardAmount, "points": points}

	rows := []struct {
		ID           int64          `db:"id"`
		Nickname     sql.NullString `db:"nickname"`
		Phone        sql.NullString `db:"phone"`
		Status       int            `db:"status"`
		RegisteredAt time.Time      `db:"registered_at"`
		RewardedAt   sql.NullTime   `db:"rewarded_at"`
	}{}
	_ = db.SelectContext(ctx, &rows, `
		SELECT i.id, u.nickname, u.phone, i.status, i.registered_at, i.rewarded_at
		FROM user_invites i
		LEFT JOIN users u ON u.id = i.invitee_id
		WHERE i.inviter_id = $1
		ORDER BY i.created_at DESC
		LIMIT 50`, userID)
	records := make([]map[string]interface{}, 0, len(rows))
	for _, r := range rows {
		statusText := "已注册"
		if r.Status == 1 {
			statusText = "首单完成"
		} else if r.Status == 2 {
			statusText = "奖励已发放"
		}
		phone := r.Phone.String
		if len(phone) == 11 {
			phone = phone[:3] + "****" + phone[7:]
		}
		records = append(records, map[string]interface{}{
			"id": r.ID, "nickname": r.Nickname.String, "phone": phone, "status": r.Status,
			"status_text": statusText, "registered_at": r.RegisteredAt, "rewarded_at": r.RewardedAt.Time,
		})
	}
	if origin == "" {
		origin = "https://mm.hbdxm.com"
	}
	return &InviteInfo{
		InviteCode: code,
		InviteURL:  strings.TrimRight(origin, "/") + "/invite?code=" + code,
		Stats:      stats,
		Records:    records,
		RewardRules: []string{
			"好友通过你的邀请链接首次登录后绑定邀请关系",
			"好友完成首单后，你获得10元奖励券和1000积分",
			"好友完成首单后，好友获得20元新人券",
		},
	}, nil
}

func ensureCouponTx(ctx context.Context, tx *sqlx.Tx, name string, value float64) (int64, error) {
	var id int64
	if err := tx.GetContext(ctx, &id, `SELECT id FROM coupons WHERE name = $1 ORDER BY id DESC LIMIT 1`, name); err == nil {
		return id, nil
	}
	err := tx.QueryRowxContext(ctx, `
		INSERT INTO coupons (name, type, value, min_amount, total_count, receive_count, per_limit, start_time, end_time, status, created_at, updated_at)
		VALUES ($1, 3, $2, 0, 999999, 0, 999999, NOW(), NOW() + INTERVAL '365 days', 1, NOW(), NOW())
		RETURNING id`, name, value).Scan(&id)
	return id, err
}

func grantCouponTx(ctx context.Context, tx *sqlx.Tx, userID, couponID int64) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO user_coupons (user_id, coupon_id, status, expire_at, created_at, updated_at)
		VALUES ($1, $2, 0, NOW() + INTERVAL '90 days', NOW(), NOW())`, userID, couponID)
	if err == nil {
		_, _ = tx.ExecContext(ctx, `UPDATE coupons SET receive_count = receive_count + 1 WHERE id = $1`, couponID)
	}
	return err
}

func ProcessInviteReward(ctx context.Context, inviteeID, orderID int64) error {
	db := database.Database()
	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var inv struct {
		ID        int64 `db:"id"`
		InviterID int64 `db:"inviter_id"`
		InviteeID int64 `db:"invitee_id"`
		Status    int   `db:"status"`
	}
	if err := tx.GetContext(ctx, &inv, `SELECT id, inviter_id, invitee_id, status FROM user_invites WHERE invitee_id = $1 FOR UPDATE`, inviteeID); err != nil {
		return nil
	}
	if inv.Status == 2 {
		return nil
	}
	var completedCount int
	_ = tx.GetContext(ctx, &completedCount, `SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = 4`, inviteeID)
	if completedCount > 1 {
		_, _ = tx.ExecContext(ctx, `UPDATE user_invites SET status = 1, first_order_at = COALESCE(first_order_at, NOW()), reward_order_id = COALESCE(reward_order_id, $2), updated_at = NOW() WHERE id = $1 AND status = 0`, inv.ID, orderID)
		return tx.Commit()
	}

	inviterCouponID, err := ensureCouponTx(ctx, tx, "邀请奖励10元券", inviterCouponValue)
	if err != nil {
		return err
	}
	inviteeCouponID, err := ensureCouponTx(ctx, tx, "邀请好友新人20元券", inviteeCouponValue)
	if err != nil {
		return err
	}
	if err := grantCouponTx(ctx, tx, inv.InviterID, inviterCouponID); err != nil {
		return err
	}
	if err := grantCouponTx(ctx, tx, inviteeID, inviteeCouponID); err != nil {
		return err
	}
	_, _ = tx.ExecContext(ctx, `UPDATE users SET member_points = COALESCE(member_points, 0) + $1, updated_at = NOW() WHERE id = $2`, inviterPoints, inv.InviterID)
	_, _ = tx.ExecContext(ctx, `
		INSERT INTO user_invite_rewards (invite_id, user_id, reward_type, reward_value, coupon_id, order_id, status, created_at, updated_at)
		VALUES ($1, $2, 'inviter_points', $3, NULL, $4, 1, NOW(), NOW()),
		       ($1, $2, 'inviter_coupon', $5, $6, $4, 1, NOW(), NOW()),
		       ($1, $7, 'invitee_coupon', $8, $9, $4, 1, NOW(), NOW())`,
		inv.ID, inv.InviterID, float64(inviterPoints)/100, orderID, inviterCouponValue, inviterCouponID, inviteeID, inviteeCouponValue, inviteeCouponID)
	_, err = tx.ExecContext(ctx, `UPDATE user_invites SET status = 2, first_order_at = COALESCE(first_order_at, NOW()), rewarded_at = NOW(), reward_order_id = $2, updated_at = NOW() WHERE id = $1`, inv.ID, orderID)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func AdminListInvites(ctx context.Context, page, pageSize, status int, keyword string) (map[string]interface{}, error) {
	db := database.Database()
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}
	args := []interface{}{}
	where := "1=1"
	if status >= 0 {
		args = append(args, status)
		where += fmt.Sprintf(" AND i.status = $%d", len(args))
	}
	if keyword = strings.TrimSpace(keyword); keyword != "" {
		args = append(args, "%"+keyword+"%")
		where += fmt.Sprintf(" AND (inviter.nickname ILIKE $%d OR invitee.nickname ILIKE $%d OR inviter.phone ILIKE $%d OR invitee.phone ILIKE $%d OR i.invite_code ILIKE $%d)", len(args), len(args), len(args), len(args), len(args))
	}
	var total int64
	_ = db.GetContext(ctx, &total, fmt.Sprintf(`SELECT COUNT(*) FROM user_invites i LEFT JOIN users inviter ON inviter.id=i.inviter_id LEFT JOIN users invitee ON invitee.id=i.invitee_id WHERE %s`, where), args...)
	args = append(args, pageSize, (page-1)*pageSize)
	rows := []struct {
		ID            int64          `db:"id"`
		InviteCode    string         `db:"invite_code"`
		Status        int            `db:"status"`
		RegisteredAt  time.Time      `db:"registered_at"`
		RewardedAt    sql.NullTime   `db:"rewarded_at"`
		RewardOrderID sql.NullInt64  `db:"reward_order_id"`
		InviterName   sql.NullString `db:"inviter_name"`
		InviterPhone  sql.NullString `db:"inviter_phone"`
		InviteeName   sql.NullString `db:"invitee_name"`
		InviteePhone  sql.NullString `db:"invitee_phone"`
	}{}
	query := fmt.Sprintf(`
		SELECT i.id, i.invite_code, i.status, i.registered_at, i.rewarded_at, i.reward_order_id,
		       inviter.nickname AS inviter_name, inviter.phone AS inviter_phone,
		       invitee.nickname AS invitee_name, invitee.phone AS invitee_phone
		FROM user_invites i
		LEFT JOIN users inviter ON inviter.id = i.inviter_id
		LEFT JOIN users invitee ON invitee.id = i.invitee_id
		WHERE %s
		ORDER BY i.created_at DESC
		LIMIT $%d OFFSET $%d`, where, len(args)-1, len(args))
	if err := db.SelectContext(ctx, &rows, query, args...); err != nil {
		return nil, err
	}
	list := make([]map[string]interface{}, 0, len(rows))
	for _, r := range rows {
		statusText := "已注册"
		if r.Status == 1 {
			statusText = "首单完成"
		} else if r.Status == 2 {
			statusText = "奖励已发放"
		}
		list = append(list, map[string]interface{}{
			"id": r.ID, "invite_code": r.InviteCode, "status": r.Status, "status_text": statusText,
			"registered_at": r.RegisteredAt, "rewarded_at": r.RewardedAt.Time, "reward_order_id": r.RewardOrderID.Int64,
			"inviter_name": r.InviterName.String, "inviter_phone": r.InviterPhone.String,
			"invitee_name": r.InviteeName.String, "invitee_phone": r.InviteePhone.String,
		})
	}
	var totalAll, rewardedAll, pendingAll int
	_ = db.GetContext(ctx, &totalAll, `SELECT COUNT(*) FROM user_invites`)
	_ = db.GetContext(ctx, &rewardedAll, `SELECT COUNT(*) FROM user_invites WHERE status = 2`)
	_ = db.GetContext(ctx, &pendingAll, `SELECT COUNT(*) FROM user_invites WHERE status IN (0,1)`)
	overview := map[string]interface{}{"total": totalAll, "rewarded": rewardedAll, "pending": pendingAll}
	return map[string]interface{}{"list": list, "total": total, "page": page, "page_size": pageSize, "overview": overview}, nil
}
