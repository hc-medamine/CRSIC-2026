import { query } from "@/lib/db";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  read_at: Date | null;
  created_at: Date;
};

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  linkPath?: string | null;
}) {
  await query(
    `INSERT INTO notifications (user_id, type, title, body, link_path)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.userId,
      input.type,
      input.title,
      input.body ?? null,
      input.linkPath ?? null,
    ],
  );
}

export async function listNotificationsForUser(userId: string, limit = 50) {
  const result = await query<NotificationRow>(
    `SELECT id, type, title, body, link_path, read_at, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
}

export async function countUnread(userId: string) {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await query(
    `UPDATE notifications SET read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [notificationId, userId],
  );
}

export async function markAllNotificationsRead(userId: string) {
  await query(
    `UPDATE notifications SET read_at = NOW()
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
}
