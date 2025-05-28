import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';

function Notifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState([]);
  const [userCache, setUserCache] = useState({});

  useEffect(() => {
    fetchNotifications();
    // Fetch following list for follow-back logic
    const fetchFollowing = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/social/following', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFollowing(res.data);
      } catch {
        setFollowing([]);
      }
    };
    if (token) fetchFollowing();
    // eslint-disable-next-line
  }, [token]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5117/api/social/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
      setLoading(false);
    } catch {
      setError('Failed to load notifications.');
      setLoading(false);
    }
  };

  const fetchUser = async (userId) => {
    if (userCache[userId]) return userCache[userId];
    try {
      const res = await axios.get(`http://localhost:5000/api/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserCache(cache => ({ ...cache, [userId]: res.data }));
      return res.data;
    } catch {
      return null;
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await axios.post(`http://localhost:5117/api/social/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(n => n.map(notif => notif.id === id ? { ...notif, is_read: true } : notif));
    } catch {
      setError('Failed to mark as read.');
    }
  };

  const handleFollowBack = async (userId) => {
    try {
      await axios.post(`http://localhost:5000/api/social/follow/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(f => [...f, userId]);
    } catch {}
  };

  const renderText = (notif) => {
    if (notif.type === 'like') return `Someone liked your post (ID: ${notif.data?.postId})`;
    if (notif.type === 'comment') return `Someone commented on your post (ID: ${notif.data?.postId})`;
    if (notif.type === 'follow' && notif.data?.from) {
      const userId = notif.data.from;
      const user = userCache[userId];
      if (user) {
        return (
          <>
            <span>
              <Link to={`/user/${user.id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
                {user.name}
              </Link> followed you.
            </span>
            {!following.includes(user.id) && (
              <button style={{marginLeft:8}} onClick={() => handleFollowBack(user.id)}>Follow back</button>
            )}
          </>
        );
      } else {
        // If not loaded yet, trigger fetch
        fetchUser(userId);
        return 'Someone followed you!';
      }
    }
    if (notif.type === 'follow') return `Someone followed you!`;
    return notif.type;
  };

  return (
    <div className="container">
      <h2>Notifications</h2>
      {error && <div style={{color: 'red', marginBottom: '1rem'}}>{error}</div>}
      {loading ? <div>Loading...</div> : (
        <div>
          {notifications.length === 0 ? <div>No notifications.</div> : (
            notifications.map(notif => (
              <div
                key={notif.id}
                style={{
                  background: notif.is_read ? '#f7f7f7' : '#e0e7ff',
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: '1rem',
                  marginBottom: '1rem',
                  opacity: notif.is_read ? 0.7 : 1
                }}
              >
                <div>{renderText(notif)}</div>
                <div style={{fontSize:12, color:'#888'}}>{new Date(notif.created_at).toLocaleString()}</div>
                {!notif.is_read && (
                  <button style={{marginTop:8}} onClick={() => handleMarkRead(notif.id)}>Mark as read</button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Notifications; 