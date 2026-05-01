const express = require("express");

const db = require("../data/db");
const cache = require("../data/cache");
const { verifyJWT } = require("../middleware/auth");

const router = express.Router();

function getUserId(req) {
  return req.user?.userId ?? req.user?.user_id ?? req.user?.id ?? null;
}

router.get("/", verifyJWT, async (req, res) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(Math.max(Number(req.query?.limit || 20), 1), 100);
    const unreadOnly =
      String(req.query?.unread || "false").toLowerCase() === "true";

    const cacheKey = `notifications:${userId}:limit:${limit}:unread:${unreadOnly}`;
    const cached = await cache.getCache(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const values = [userId, limit];

    const result = await db.query(
      `
      SELECT notification_id, type, title, body, route, is_read, created_at
      FROM notifications
      WHERE user_id = $1
        ${unreadOnly ? "AND is_read = FALSE" : ""}
      ORDER BY created_at DESC, notification_id DESC
      LIMIT $2
      `,
      values,
    );

    const unread = await db.query(
      `
      SELECT COUNT(*)::int AS unread_count
      FROM notifications
      WHERE user_id = $1
        AND is_read = FALSE
      `,
      [userId],
    );

    const payload = {
      notifications: result.rows,
      unreadCount: Number(unread.rows[0]?.unread_count || 0),
    };

    await cache.setCache(cacheKey, payload, 30);

    return res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
});

router.patch("/:id/read", verifyJWT, async (req, res) => {
  try {
    const userId = getUserId(req);
    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const result = await db.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE notification_id = $1
        AND user_id = $2
      RETURNING notification_id, is_read
      `,
      [notificationId, userId],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Notification not found" });
    }
    await cache.delCache(`notifications:${userId}:limit:20:unread:false`);
    await cache.delCache(`notifications:${userId}:limit:20:unread:true`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

router.patch("/read-all", verifyJWT, async (req, res) => {
  try {
    const userId = getUserId(req);
    const type = req.body?.type ? String(req.body.type) : null;
    const values = [userId];
    let filter = "";

    if (type) {
      values.push(type);
      filter = `AND type = $${values.length}`;
    }

    await db.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
        AND is_read = FALSE
        ${filter}
      `,
      values,
    );
    await cache.delCache(`notifications:${userId}:limit:20:unread:false`);
    await cache.delCache(`notifications:${userId}:limit:20:unread:true`);
    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update notifications" });
  }
});

module.exports = router;
