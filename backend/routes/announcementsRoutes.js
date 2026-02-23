const express = require("express");
const router = express.Router();
const db = require("../data/db");

const { verifyJWT, adminOnly } = require("../middleware/auth");

/*
PUBLIC (Authenticated) – Get Published Announcements
*/
router.get("/", verifyJWT, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT 
        announcement_id,
        title,
        body,
        created_at
      FROM announcements
      WHERE is_published = TRUE
      ORDER BY created_at DESC
      `,
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Get announcements error:", err);
    res.status(500).json({ message: "Failed to fetch announcements" });
  }
});

/*
ADMIN – Get ALL Announcements (including unpublished)
*/
router.get("/all", verifyJWT, adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT 
        announcement_id,
        title,
        body,
        created_by,
        is_published,
        created_at,
        updated_at
      FROM announcements
      ORDER BY created_at DESC
      `,
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Admin get announcements error:", err);
    res.status(500).json({ message: "Failed to fetch announcements" });
  }
});

/*
ADMIN – Create Announcement
*/
router.post("/", verifyJWT, adminOnly, async (req, res) => {
  try {
    const { title, body, is_published = true } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: "Title and body are required" });
    }

    const createdBy = req.user.user_id;

    const result = await db.query(
      `
      INSERT INTO announcements (title, body, created_by, is_published)
      VALUES ($1, $2, $3, $4)
      RETURNING announcement_id, title, body, created_by, is_published, created_at
      `,
      [title, body, createdBy, !!is_published],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create announcement error:", err);
    res.status(500).json({ message: "Failed to create announcement" });
  }
});

/*
ADMIN – Update Announcement
*/
router.put("/:id", verifyJWT, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, is_published } = req.body;

    const fields = [];
    const values = [];
    let index = 1;

    if (title !== undefined) {
      fields.push(`title = $${index++}`);
      values.push(title);
    }

    if (body !== undefined) {
      fields.push(`body = $${index++}`);
      values.push(body);
    }

    if (is_published !== undefined) {
      fields.push(`is_published = $${index++}`);
      values.push(!!is_published);
    }

    if (!fields.length) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    values.push(id);

    const result = await db.query(
      `
      UPDATE announcements
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE announcement_id = $${index}
      RETURNING *
      `,
      values,
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update announcement error:", err);
    res.status(500).json({ message: "Failed to update announcement" });
  }
});

/*
ADMIN – Delete Announcement
*/
router.delete("/:id", verifyJWT, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      DELETE FROM announcements
      WHERE announcement_id = $1
      RETURNING announcement_id
      `,
      [id],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("Delete announcement error:", err);
    res.status(500).json({ message: "Failed to delete announcement" });
  }
});

module.exports = router;
