const express = require('express');
const pool = require('./db');
const { authenticateToken } = require('./middleware');

const router = express.Router();

// Follow a user
router.post('/follow/:id', authenticateToken, async (req, res) => {
  const followingId = req.params.id;
  try {
    await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, followingId]);
    // Notification for followed user
    if (parseInt(followingId) !== req.user.id) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, data) VALUES ($1, $2, $3)',
        [followingId, 'follow', JSON.stringify({ from: req.user.id })]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Unfollow a user
router.post('/unfollow/:id', authenticateToken, async (req, res) => {
  const followingId = req.params.id;
  try {
    await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, followingId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(notifications.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Mark notification as read
router.post('/notifications/:id/read', authenticateToken, async (req, res) => {
  const notificationId = req.params.id;
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [notificationId, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get list of user IDs the current user is following
router.get('/following', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT following_id FROM follows WHERE follower_id = $1', [req.user.id]);
    res.json(result.rows.map(r => r.following_id));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get list of users the current user is following (detailed)
router.get('/following/details', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.profile_picture FROM users u
       JOIN follows f ON u.id = f.following_id
       WHERE f.follower_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get list of users who follow the current user (followers, detailed)
router.get('/followers/details', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.profile_picture FROM users u
       JOIN follows f ON u.id = f.follower_id
       WHERE f.following_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router; 