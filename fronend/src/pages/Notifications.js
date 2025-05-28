import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import LetterAvatar from '../components/LetterAvatar';

function Notifications() {
  const { token, refreshUserStats } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState([]);
  const [userCache, setUserCache] = useState({});
  const [followLoading, setFollowLoading] = useState({});
  const backendUrl = "http://localhost:5117";

  useEffect(() => {
    fetchNotifications();
    // Fetch following list for follow-back logic
    const fetchFollowing = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/social/following`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFollowing(res.data);
      } catch {
        setFollowing([]);
      }
    };
    if (token) fetchFollowing();
    // eslint-disable-next-line
  }, [token, backendUrl]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/social/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
      
      // Pre-fetch user data for all notifications
      const userIds = res.data
        .filter(notif => notif.type === 'follow' && notif.data?.from)
        .map(notif => notif.data.from);
      
      // Deduplicate user IDs
      const uniqueUserIds = [...new Set(userIds)];
      
      // Fetch user data for all unique user IDs
      await Promise.all(uniqueUserIds.map(fetchUser));
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load notifications.');
      setLoading(false);
    }
  };

  const fetchUser = async (userId) => {
    if (userCache[userId]) return userCache[userId];
    try {
      const res = await axios.get(`${backendUrl}/api/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserCache(cache => ({ ...cache, [userId]: res.data }));
      return res.data;
    } catch (err) {
      console.error(`Error fetching user ${userId}:`, err);
      return null;
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await axios.post(`${backendUrl}/api/social/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(n => n.map(notif => notif.id === id ? { ...notif, is_read: true } : notif));
    } catch (err) {
      setError('Failed to mark as read.');
    }
  };

  const handleFollowBack = async (userId) => {
    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    try {
      await axios.post(`${backendUrl}/api/social/follow/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(f => [...f, userId]);
      // Refresh user stats
      refreshUserStats();
    } catch (err) {
      setError('Failed to follow user.');
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUnfollow = async (userId) => {
    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    try {
      await axios.post(`${backendUrl}/api/social/unfollow/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(f => f.filter(id => id !== userId));
      // Refresh user stats
      refreshUserStats();
    } catch (err) {
      setError('Failed to unfollow user.');
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const renderNotification = (notif) => {
    if (notif.type === 'like' && notif.data?.postId) {
      return (
        <div className="notification-content">
          <div className="notification-text">
            <span className="notification-action">Someone liked your post</span>
            <Link to={`/posts/${notif.data.postId}`} className="notification-link">
              View post
            </Link>
          </div>
        </div>
      );
    }
    
    if (notif.type === 'comment' && notif.data?.postId) {
      return (
        <div className="notification-content">
          <div className="notification-text">
            <span className="notification-action">Someone commented on your post</span>
            <Link to={`/posts/${notif.data.postId}`} className="notification-link">
              View post
            </Link>
          </div>
        </div>
      );
    }
    
    if (notif.type === 'follow' && notif.data?.from) {
      const userId = notif.data.from;
      const user = userCache[userId];
      
      if (user) {
        const isFollowing = following.includes(userId);
        const isLoading = followLoading[userId] || false;
        
        return (
          <div className="notification-content">
            <div className="notification-user">
              {user.profile_picture ? (
                <img 
                  src={user.profile_picture.startsWith('http') ? user.profile_picture : `${backendUrl}${user.profile_picture}`}
                  alt={user.name}
                  className="notification-avatar"
                />
              ) : (
                <div className="notification-avatar-container">
                  <LetterAvatar name={user.name} />
                </div>
              )}
              <div className="notification-details">
                <div className="notification-text">
                  <Link to={`/user/${userId}`} className="notification-username">
                    {user.name}
                  </Link>
                  <span className="notification-action"> started following you</span>
                </div>
                
                <div className="notification-actions">
                  <Link to={`/user/${userId}`} className="notification-link">
                    View profile
                  </Link>
                  
                  {isFollowing ? (
                    <button 
                      onClick={() => handleUnfollow(userId)}
                      disabled={isLoading}
                      className="follow-button following"
                    >
                      {isLoading ? 'Loading...' : 'Unfollow'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleFollowBack(userId)}
                      disabled={isLoading}
                      className="follow-button"
                    >
                      {isLoading ? 'Loading...' : 'Follow back'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        // If user data isn't loaded yet
        return (
          <div className="notification-content">
            <div className="notification-text">
              <span className="notification-action">Someone followed you</span>
            </div>
          </div>
        );
      }
    }
    
    return (
      <div className="notification-content">
        <div className="notification-text">
          <span className="notification-action">{notif.type}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2>Notifications</h2>
      {error && <div className="error-message">{error}</div>}
      
      <div className="notifications-container">
        {loading ? (
          <div className="loading">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">You have no notifications.</div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className={`notification ${notif.is_read ? 'read' : 'unread'}`}
            >
              {renderNotification(notif)}
              
              <div className="notification-footer">
                <div className="notification-time">
                  {new Date(notif.created_at).toLocaleString()}
                </div>
                
                {!notif.is_read && (
                  <button 
                    className="mark-read-button"
                    onClick={() => handleMarkRead(notif.id)}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Notifications; 