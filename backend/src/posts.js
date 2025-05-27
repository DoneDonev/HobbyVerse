const express = require('express');
const pool = require('./db');
const { authenticateToken } = require('./middleware');

const router = express.Router();

// Create a post
router.post('/', authenticateToken, async (req, res) => {
  const { content, image, hobbies } = req.body; // hobbies: array of hobby names
  try {
    const postResult = await pool.query(
      'INSERT INTO posts (user_id, content, image) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, content, image]
    );
    const post = postResult.rows[0];
    if (Array.isArray(hobbies)) {
      for (const hobbyName of hobbies) {
        let hobby = await pool.query('SELECT id FROM hobbies WHERE name = $1', [hobbyName]);
        if (hobby.rows.length === 0) {
          hobby = await pool.query('INSERT INTO hobbies (name) VALUES ($1) RETURNING id', [hobbyName]);
        }
        await pool.query('INSERT INTO post_hobbies (post_id, hobby_id) VALUES ($1, $2)', [post.id, hobby.rows[0].id]);
      }
    }
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get all posts, optionally filter by hobby or user_id
router.get('/', authenticateToken, async (req, res) => {
  const { hobby, user_id } = req.query;
  try {
    let posts;
    if (user_id) {
      posts = await pool.query('SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);
    } else if (hobby) {
      posts = await pool.query(
        `SELECT p.* FROM posts p
         JOIN post_hobbies ph ON p.id = ph.post_id
         JOIN hobbies h ON ph.hobby_id = h.id
         WHERE h.name = $1
         ORDER BY p.created_at DESC`,
        [hobby]
      );
    } else {
      posts = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
    }
    res.json(posts.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Like a post
router.post('/:id/like', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  try {
    await pool.query('INSERT INTO likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [postId, req.user.id]);
    // Notification for post owner
    const post = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (post.rows.length && post.rows[0].user_id !== req.user.id) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, data) VALUES ($1, $2, $3)',
        [post.rows[0].user_id, 'like', JSON.stringify({ postId, from: req.user.id })]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Comment on a post
router.post('/:id/comment', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;
  try {
    const comment = await pool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, req.user.id, content]
    );
    // Notification for post owner
    const post = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
    if (post.rows.length && post.rows[0].user_id !== req.user.id) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, data) VALUES ($1, $2, $3)',
        [post.rows[0].user_id, 'comment', JSON.stringify({ postId, from: req.user.id })]
      );
    }
    res.status(201).json(comment.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Share a post (create a new post referencing the original)
router.post('/:id/share', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  try {
    const original = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);
    if (!original.rows.length) return res.status(404).json({ error: 'Post not found.' });
    const shared = await pool.query(
      'INSERT INTO posts (user_id, content, image) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, original.rows[0].content, original.rows[0].image]
    );
    // Copy hobbies
    const hobbies = await pool.query('SELECT hobby_id FROM post_hobbies WHERE post_id = $1', [postId]);
    for (const h of hobbies.rows) {
      await pool.query('INSERT INTO post_hobbies (post_id, hobby_id) VALUES ($1, $2)', [shared.rows[0].id, h.hobby_id]);
    }
    res.status(201).json(shared.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get comments for a post
router.get('/:id/comments', authenticateToken, async (req, res) => {
  const postId = req.params.id;
  try {
    const comments = await pool.query(
      'SELECT c.*, u.name, u.profile_picture FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at ASC',
      [postId]
    );
    res.json(comments.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get like counts for multiple posts
router.post('/likes-count', authenticateToken, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.json({});
  try {
    const result = await pool.query(
      'SELECT post_id, COUNT(*) as count FROM likes WHERE post_id = ANY($1) GROUP BY post_id',
      [ids]
    );
    const counts = {};
    result.rows.forEach(r => { counts[r.post_id] = parseInt(r.count); });
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get comment counts for multiple posts
router.post('/comments-count', authenticateToken, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.json({});
  try {
    const result = await pool.query(
      'SELECT post_id, COUNT(*) as count FROM comments WHERE post_id = ANY($1) GROUP BY post_id',
      [ids]
    );
    const counts = {};
    result.rows.forEach(r => { counts[r.post_id] = parseInt(r.count); });
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get share counts for multiple posts
router.post('/shares-count', authenticateToken, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.json({});
  try {
    // A share is a post with the same content and image as another post, but a different user
    const result = await pool.query(
      `SELECT original.id as post_id, COUNT(shared.id) as count
       FROM posts original
       LEFT JOIN posts shared ON shared.content = original.content AND shared.image = original.image AND shared.id != original.id
       WHERE original.id = ANY($1)
       GROUP BY original.id`,
      [ids]
    );
    const counts = {};
    result.rows.forEach(r => { counts[r.post_id] = parseInt(r.count); });
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get liked status for current user for multiple posts
router.post('/liked', authenticateToken, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.json({});
  try {
    const result = await pool.query(
      'SELECT post_id FROM likes WHERE post_id = ANY($1) AND user_id = $2',
      [ids, req.user.id]
    );
    const liked = {};
    ids.forEach(id => { liked[id] = false; });
    result.rows.forEach(r => { liked[r.post_id] = true; });
    res.json(liked);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router; 