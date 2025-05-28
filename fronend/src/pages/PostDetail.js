import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import LetterAvatar from '../components/LetterAvatar';

function PostDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [commentUsers, setCommentUsers] = useState({});
  const backendUrl = "http://localhost:5117";

  // Fetch post and related data
  useEffect(() => {
    const fetchPostData = async () => {
      try {
        // Fetch the post
        const postRes = await axios.get(`${backendUrl}/api/posts/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!postRes.data) {
          throw new Error('Post not found');
        }
        
        setPost(postRes.data);
        
        // Fetch post author
        const userRes = await axios.get(`${backendUrl}/api/user/${postRes.data.user_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userRes.data);
        
        // Fetch comments
        const commentsRes = await axios.get(`${backendUrl}/api/posts/${id}/comments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setComments(commentsRes.data);
        setCommentCount(commentsRes.data.length);
        
        // Fetch comment user info
        const commentUserIds = [...new Set(commentsRes.data.map(comment => comment.user_id))];
        await fetchCommentUsers(commentUserIds);
        
        // Fetch like status and counts
        const [likesRes, sharesRes, likedRes] = await Promise.all([
          axios.post(`${backendUrl}/api/posts/likes-count`, { ids: [id] }, { 
            headers: { Authorization: `Bearer ${token}` } 
          }),
          axios.post(`${backendUrl}/api/posts/shares-count`, { ids: [id] }, { 
            headers: { Authorization: `Bearer ${token}` } 
          }),
          axios.post(`${backendUrl}/api/posts/liked`, { ids: [id] }, { 
            headers: { Authorization: `Bearer ${token}` } 
          }),
        ]);
        
        setLikeCount(likesRes.data[id] || 0);
        setShareCount(sharesRes.data[id] || 0);
        setIsLiked(likedRes.data[id] || false);
        
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('Post not found or you do not have permission to view it.');
        // Navigate back if post doesn't exist
        if (err.response && err.response.status === 404) {
          setTimeout(() => navigate('/posts'), 3000);
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (token && id) {
      fetchPostData();
    }
  }, [token, id, navigate]);

  // Fetch user details for commenters
  const fetchCommentUsers = async (userIds) => {
    const users = { ...commentUsers };
    
    for (const userId of userIds) {
      if (!users[userId]) {
        try {
          const res = await axios.get(`${backendUrl}/api/user/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          users[userId] = res.data;
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          users[userId] = { name: `User ${userId}`, profile_picture: null };
        }
      }
    }
    
    setCommentUsers(users);
  };

  // Like post
  const handleLike = async () => {
    if (liking) return;
    
    setLiking(true);
    try {
      await axios.post(`${backendUrl}/api/posts/${id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLikeCount(prev => prev + 1);
      setIsLiked(true);
    } catch (err) {
      setError('Failed to like post.');
    } finally {
      setLiking(false);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    
    try {
      const res = await axios.post(`${backendUrl}/api/posts/${id}/comment`, 
        { content: commentInput }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Get current user info for the new comment
      if (!commentUsers[res.data.user_id]) {
        await fetchCommentUsers([res.data.user_id]);
      }
      
      setComments(prev => [...prev, res.data]);
      setCommentInput('');
      setCommentCount(prev => prev + 1);
    } catch (err) {
      setError('Failed to add comment.');
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

  if (loading) {
    return <div className="loading">Loading post...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!post) {
    return <div className="error-message">Post not found</div>;
  }

  return (
    <div>
      <div className="post-detail-header">
        <Link to="/posts" className="back-link">
          &larr; Back to Feed
        </Link>
        <h2>Post</h2>
      </div>
      
      <div className="post post-detail">
        <div className="post-header">
          {user?.profile_picture ? (
            <img 
              src={user.profile_picture.startsWith('http') ? user.profile_picture : `${backendUrl}${user.profile_picture}`} 
              alt="User" 
              className="post-avatar" 
            />
          ) : (
            <LetterAvatar name={user?.name || `User ${post.user_id}`} />
          )}
          <div className="post-user-info">
            <div className="post-username">
              <Link to={`/user/${post.user_id}`}>
                {user?.name || `User ${post.user_id}`}
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
            onClick={handleLike}
            disabled={liking || isLiked}
            className={`post-action ${isLiked ? 'liked' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>{likeCount}</span>
          </button>
          
          <button className="post-action">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span>{commentCount}</span>
          </button>
        </div>
        
        <div className="comments-section">
          <h3 className="comments-header">Comments</h3>
          
          {comments.length === 0 ? (
            <div className="no-comments">No comments yet. Be the first to comment!</div>
          ) : (
            comments.map(comment => {
              const commentUser = commentUsers[comment.user_id] || { name: `User ${comment.user_id}` };
              return (
                <div key={comment.id} className="comment">
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
                    <Link to={`/user/${comment.user_id}`} className="comment-user">
                      {commentUser.name}
                    </Link>
                  </div>
                  <div className="comment-content">
                    {comment.content}
                  </div>
                </div>
              );
            })
          )}
          
          <div className="comment-input">
            <input
              type="text"
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              placeholder="Add a comment..."
            />
            <button onClick={handleAddComment}>Comment</button>
          </div>
        </div>
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

export default PostDetail;

 