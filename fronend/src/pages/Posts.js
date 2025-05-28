import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import LetterAvatar from '../components/LetterAvatar';

function Posts() {
  const { token, refreshUserStats } = useAuth();
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
  const backendUrl = "http://localhost:5117";
  const [modalImage, setModalImage] = useState(null);
  const [users, setUsers] = useState({});

  // Fetch posts and counts
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line
  }, [token, filterHobby]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let url = `${backendUrl}/api/posts`;
      if (filterHobby) {
        url += `?hobby=${encodeURIComponent(filterHobby)}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(res.data);
      
      // Fetch user information for each post
      const userIds = [...new Set(res.data.map(post => post.user_id))];
      await fetchUserDetails(userIds);
      
      // Fetch counts for all posts
      const ids = res.data.map(p => p.id);
      if (ids.length) {
        const [likesRes, commentsRes, sharesRes, likedRes] = await Promise.all([
          axios.post(`${backendUrl}/api/posts/likes-count`, { ids }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post(`${backendUrl}/api/posts/comments-count`, { ids }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post(`${backendUrl}/api/posts/shares-count`, { ids }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post(`${backendUrl}/api/posts/liked`, { ids }, { headers: { Authorization: `Bearer ${token}` } }),
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
    } catch (err) {
      setError('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user details for posts
  const fetchUserDetails = async (userIds) => {
    const userInfo = { ...users };
    
    for (const userId of userIds) {
      if (!userInfo[userId]) {
        try {
          const res = await axios.get(`${backendUrl}/api/user/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          userInfo[userId] = res.data;
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          userInfo[userId] = { name: `User ${userId}`, profile_picture: null };
        }
      }
    }
    
    setUsers(userInfo);
  };

  // Fetch single user details
  const fetchUser = async (userId) => {
    await fetchUserDetails([userId]);
  };

  // Create post
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await axios.post(`${backendUrl}/api/posts`, {
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
      // Refresh user stats to update post count
      refreshUserStats();
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
      const res = await axios.post(`${backendUrl}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImage(res.data.url.startsWith('http') ? res.data.url : backendUrl + res.data.url);
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
      await axios.post(`${backendUrl}/api/posts/${postId}/like`, {}, {
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
        const res = await axios.get(`${backendUrl}/api/posts/${postId}/comments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setComments(c => ({ ...c, [postId]: res.data }));
        setCommentCounts(cc => ({ ...cc, [postId]: res.data.length }));
        
        // Fetch user details for commenters
        const commentUserIds = [...new Set(res.data.map(comment => comment.user_id))];
        await fetchUserDetails(commentUserIds);
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
      const res = await axios.post(`${backendUrl}/api/posts/${postId}/comment`, { content: comment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Make sure we have the current user info
      const currentUserId = res.data.user_id;
      if (!users[currentUserId]) {
        await fetchUser(currentUserId);
      }
      
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
      const res = await axios.post(`${backendUrl}/api/posts/${postId}/share`, {}, {
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

  // Function to open the image modal
  const openImageModal = (imageUrl) => {
    setModalImage(imageUrl);
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
  };

  // Function to close the image modal
  const closeImageModal = () => {
    setModalImage(null);
    document.body.style.overflow = 'auto'; // Restore scrolling
  };

  // Handle clicking outside the modal to close it
  const handleModalClick = (e) => {
    if (e.target.classList.contains('image-modal')) {
      closeImageModal();
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
          posts.map(post => {
            const user = users[post.user_id] || { name: `User ${post.user_id}`, profile_picture: null };
            return (
              <div key={post.id} className="post">
                <div className="post-header">
                  {user.profile_picture ? (
                    <img 
                      src={user.profile_picture.startsWith('http') ? user.profile_picture : `${backendUrl}${user.profile_picture}`} 
                      alt="User" 
                      className="post-avatar" 
                    />
                  ) : (
                    <LetterAvatar name={user.name} />
                  )}
                  <div className="post-user-info">
                    <div className="post-username">
                      <Link to={`/user/${post.user_id}`}>
                        {user.name}
                      </Link>
                    </div>
                    <div className="post-timestamp">
                      {new Date(post.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="post-content">{post.content}</div>
                
                {post.image && (
                  <div className="post-image-container" onClick={() => openImageModal(post.image)}>
                    <div className="post-image-aspect-ratio">
                      <img src={post.image} alt="Post" className="post-image" />
                    </div>
                  </div>
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
                    {(comments[post.id] || []).map(c => {
                      const commentUser = users[c.user_id] || { name: `User ${c.user_id}` };
                      return (
                        <div key={c.id} className="comment">
                          <div className="comment-header">
                            {commentUser.profile_picture ? (
                              <img 
                                src={commentUser.profile_picture.startsWith('http') ? commentUser.profile_picture : `${backendUrl}${commentUser.profile_picture}`}
                                alt={commentUser.name}
                                className="comment-avatar"
                              />
                            ) : (
                              <LetterAvatar name={commentUser.name} size="32px" textSize="14px" />
                            )}
                            <Link to={`/user/${c.user_id}`} className="comment-user">
                              {commentUser.name}
                            </Link>
                          </div>
                          <div className="comment-content">
                            {c.content}
                          </div>
                        </div>
                      );
                    })}
                    
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
            );
          })
        )}
      </div>
      
      {/* Image Modal */}
      {modalImage && (
        <div className="image-modal" onClick={handleModalClick}>
          <div className="image-modal-content">
            <span className="image-modal-close" onClick={closeImageModal}>&times;</span>
            <img src={modalImage} alt="Full size" className="image-modal-img" />
          </div>
        </div>
      )}
    </div>
  );
}

export default Posts; 