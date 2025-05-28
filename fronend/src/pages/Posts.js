import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';

function Posts() {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showComments, setShowComments] = useState({});
  const [comments, setComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [liking, setLiking] = useState({});
  const [sharing, setSharing] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [shareCounts, setShareCounts] = useState({});
  const [likedPosts, setLikedPosts] = useState({});
  const [filterHobby, setFilterHobby] = useState('');
  const [searchHobby, setSearchHobby] = useState('');
  const fileInputRef = useRef();

  // Fetch posts and counts
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line
  }, [token, filterHobby]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = filterHobby ? { hobby: filterHobby } : {};
      const res = await axios.get('http://localhost:5001/api/posts', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setPosts(res.data);
      // Fetch counts for all posts
      const ids = res.data.map(p => p.id);
      if (ids.length) {
        const [likesRes, commentsRes, sharesRes, likedRes] = await Promise.all([
          axios.post('http://localhost:5117/api/posts/likes-count', { ids }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post('http://localhost:5117/api/posts/comments-count', { ids }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post('http://localhost:5117/api/posts/shares-count', { ids }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post('http://localhost:5117/api/posts/liked', { ids }, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setLikeCounts(likesRes.data);
        setCommentCounts(commentsRes.data);
        setShareCounts(sharesRes.data);
        setLikedPosts(likedRes.data);
      } else {
        setLikeCounts({});
        setCommentCounts({});
        setShareCounts({});
        setLikedPosts({});
      }
      setLoading(false);
    } catch {
      setError('Failed to load posts.');
      setLoading(false);
    }
  };

  // Create post
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:5117/api/posts', {
        content,
        image,
        hobbies: hobbies.split(',').map(h => h.trim()).filter(Boolean)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts([res.data, ...posts]);
      setContent('');
      setImage('');
      setHobbies('');
      fetchPosts();
    } catch (err) {
      setError('Failed to create post.');
    } finally {
      setCreating(false);
    }
  };

  // Image upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('http://localhost:5117/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImage(res.data.url);
    } catch (err) {
      setError('Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Like post
  const handleLike = async (postId) => {
    setLiking(l => ({ ...l, [postId]: true }));
    try {
      await axios.post(`http://localhost:5117/api/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLikeCounts(c => ({ ...c, [postId]: (c[postId] || 0) + 1 }));
      setLikedPosts(lp => ({ ...lp, [postId]: true }));
    } catch (err) {
      setError('Failed to like post.');
    } finally {
      setLiking(l => ({ ...l, [postId]: false }));
    }
  };

  // Toggle comments
  const handleToggleComments = async (postId) => {
    setShowComments(sc => ({ ...sc, [postId]: !sc[postId] }));
    if (!comments[postId]) {
      try {
        const res = await axios.get(`http://localhost:5117/api/posts/${postId}/comments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setComments(c => ({ ...c, [postId]: res.data }));
        setCommentCounts(cc => ({ ...cc, [postId]: res.data.length }));
      } catch (err) {
        setError('Failed to load comments.');
      }
    }
  };

  // Add comment
  const handleAddComment = async (postId) => {
    const comment = commentInputs[postId];
    if (!comment) return;
    try {
      const res = await axios.post(`http://localhost:5117/api/posts/${postId}/comment`, { content: comment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(c => ({ ...c, [postId]: [...(c[postId] || []), res.data] }));
      setCommentInputs(ci => ({ ...ci, [postId]: '' }));
      setCommentCounts(cc => ({ ...cc, [postId]: (cc[postId] || 0) + 1 }));
    } catch (err) {
      setError('Failed to add comment.');
    }
  };

  // Share post
  const handleShare = async (postId) => {
    setSharing(s => ({ ...s, [postId]: true }));
    try {
      const res = await axios.post(`http://localhost:5117/api/posts/${postId}/share`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts([res.data, ...posts]);
      setShareCounts(sc => ({ ...sc, [postId]: (sc[postId] || 0) + 1 }));
    } catch (err) {
      setError('Failed to share post.');
    } finally {
      setSharing(s => ({ ...s, [postId]: false }));
    }
  };

  return (
    <div>
      <h2>What's happening?</h2>
      {error && <div className="error-message">{error}</div>}
      
      {/* Hobby Filter */}
      <div className="post-creator">
        <form onSubmit={e => { e.preventDefault(); setFilterHobby(searchHobby); }} className="search-form">
          <input
            type="text"
            value={searchHobby}
            onChange={e => setSearchHobby(e.target.value)}
            placeholder="Filter by hobby (e.g. chess)"
          />
          <button type="submit" className="post-creator-submit">Search</button>
          {filterHobby && (
            <button 
              type="button" 
              onClick={() => { setFilterHobby(''); setSearchHobby(''); }}
              className="post-creator-submit"
            >
              Clear
            </button>
          )}
        </form>
      </div>
      
      {/* Post Creator */}
      <div className="post-creator">
        <div className="post-creator-header">Create Post</div>
        <form onSubmit={handleCreate}>
          <textarea 
            value={content} 
            onChange={e => setContent(e.target.value)} 
            required 
            rows={3} 
            placeholder="What's on your mind?"
          />
          
          <input 
            type="text" 
            value={hobbies} 
            onChange={e => setHobbies(e.target.value)} 
            placeholder="Hobbies (comma separated, e.g. chess, painting)"
            className="hobby-input"
          />
          
          <div className="post-creator-actions">
            <div className="post-creator-tools">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current.click()} 
                disabled={uploading}
                className="tool-button"
              >
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
              {image && (
                <img src={image} alt="Post" className="image-preview" />
              )}
            </div>
            <button 
              type="submit" 
              disabled={creating} 
              className="post-creator-submit"
            >
              {creating ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Posts Feed */}
      <div className="feed">
        {loading ? (
          <div className="loading">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="no-posts">No posts yet.</div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post">
              <div className="post-header">
                <img 
                  src={`https://i.pravatar.cc/150?u=${post.user_id}`} 
                  alt="User" 
                  className="post-avatar" 
                />
                <div className="post-user-info">
                  <div className="post-username">
                    <Link to={`/user/${post.user_id}`}>
                      User {post.user_id}
                    </Link>
                  </div>
                  <div className="post-timestamp">
                    {new Date(post.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="post-content">{post.content}</div>
              
              {post.image && (
                <img src={post.image} alt="Post" className="post-image" />
              )}
              
              {post.hobbies && post.hobbies.length > 0 && (
                <div className="post-hobbies">
                  {post.hobbies.map(hobby => (
                    <span key={hobby} className="hobby-tag">
                      #{hobby}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="post-actions">
                <button
                  onClick={() => handleLike(post.id)}
                  disabled={liking[post.id]}
                  className={`post-action ${likedPosts[post.id] ? 'liked' : ''}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={likedPosts[post.id] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  <span>{likeCounts[post.id] || 0}</span>
                </button>
                
                <button 
                  onClick={() => handleToggleComments(post.id)}
                  className="post-action"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                  <span>{commentCounts[post.id] || 0}</span>
                </button>
                
                <button
                  onClick={() => handleShare(post.id)}
                  disabled={sharing[post.id]}
                  className="post-action"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                  <span>{shareCounts[post.id] || 0}</span>
                </button>
              </div>
              
              {showComments[post.id] && (
                <div className="comments-section">
                  {(comments[post.id] || []).map(c => (
                    <div key={c.id} className="comment">
                      <strong>{c.user_name || `User ${c.user_id}`}:</strong> {c.content}
                    </div>
                  ))}
                  
                  <div className="comment-input">
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={e => setCommentInputs({...commentInputs, [post.id]: e.target.value})}
                      placeholder="Add a comment..."
                    />
                    <button onClick={() => handleAddComment(post.id)}>Comment</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Posts; 