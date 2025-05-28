import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [searchHobby, setSearchHobby] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followLoading, setFollowLoading] = useState({});
  const [followingDetails, setFollowingDetails] = useState([]);
  const [followers, setFollowers] = useState([]);
  const fileInputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    axios.get('http://localhost:5117/api/user/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setProfile(res.data);
        setName(res.data.name);
        setProfilePicture(res.data.profile_picture || '');
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load profile.');
        setLoading(false);
      });
    // Fetch following list (IDs)
    fetchFollowing(token);
    // Fetch following details
    axios.get('http://localhost:5117/api/social/following/details', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setFollowingDetails(res.data)).catch(() => setFollowingDetails([]));
    // Fetch followers
    axios.get('http://localhost:5117/api/social/followers/details', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setFollowers(res.data)).catch(() => setFollowers([]));
  }, [navigate]);

  const fetchFollowing = async (token) => {
    try {
      const res = await axios.get('http://localhost:5117/api/social/following', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(res.data);
    } catch {
      setFollowing([]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      const res = await axios.put('http://localhost:5117/api/user/me', {
        name,
        profile_picture: profilePicture
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setSuccess('Profile updated!');
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setSuccess('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('http://localhost:5117/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfilePicture(res.data.url);
      setSuccess('Image uploaded!');
    } catch (err) {
      setError('Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setFoundUsers([]);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`http://localhost:5117/api/user/find?hobby=${encodeURIComponent(searchHobby)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFoundUsers(res.data);
    } catch {
      setError('Failed to search users.');
    }
  };

  const handleFollow = async (userId) => {
    setFollowLoading(fl => ({ ...fl, [userId]: true }));
    const token = localStorage.getItem('token');
    try {
      await axios.post(`http://localhost:5117/api/social/follow/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(f => [...f, userId]);
    } catch {}
    setFollowLoading(fl => ({ ...fl, [userId]: false }));
  };

  const handleUnfollow = async (userId) => {
    setFollowLoading(fl => ({ ...fl, [userId]: true }));
    const token = localStorage.getItem('token');
    try {
      await axios.post(`http://localhost:5117/api/social/unfollow/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(f => f.filter(id => id !== userId));
    } catch {}
    setFollowLoading(fl => ({ ...fl, [userId]: false }));
  };

  if (loading) return <div className="loading">Loading profile...</div>;

  return (
    <div>
      <h2>Profile</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {/* Profile Edit Form */}
      {profile && (
        <div className="post-creator">
          <div className="post-creator-header">Edit Profile</div>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Name:</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                className="text-input"
              />
            </div>
            
            <div className="form-group">
              <label>Profile Picture:</label>
              <input 
                type="text" 
                value={profilePicture} 
                onChange={e => setProfilePicture(e.target.value)} 
                placeholder="Paste image URL or upload below" 
                className="text-input"
              />
            </div>
            
            <div className="form-group profile-image-upload">
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
              {profilePicture && (
                <img 
                  src={profilePicture} 
                  alt="Profile" 
                  className="profile-image-preview" 
                />
              )}
            </div>
            
            <button type="submit" className="post-creator-submit">Save Profile</button>
          </form>
        </div>
      )}

      {/* Find Users by Hobby */}
      <div className="widget">
        <h3 className="widget-header">Find Users by Hobby</h3>
        <form onSubmit={handleSearch} className="search-form">
          <input 
            type="text" 
            value={searchHobby} 
            onChange={e => setSearchHobby(e.target.value)} 
            placeholder="e.g. chess" 
          />
          <button type="submit" className="post-creator-submit">Search</button>
        </form>
        
        {foundUsers.length > 0 && (
          <div className="user-list">
            <h4>Users with hobby "{searchHobby}"</h4>
            {foundUsers.map(user => (
              <div key={user.id} className="user-item">
                <img 
                  src={user.profile_picture || 'https://i.pravatar.cc/150?img=1'} 
                  alt="Profile" 
                  className="user-avatar" 
                />
                <span className="user-name">{user.name}</span>
                {following.includes(user.id) ? (
                  <button 
                    onClick={() => handleUnfollow(user.id)} 
                    disabled={followLoading[user.id]}
                    className="follow-button following"
                  >
                    Unfollow
                  </button>
                ) : (
                  <button 
                    onClick={() => handleFollow(user.id)} 
                    disabled={followLoading[user.id]}
                    className="follow-button"
                  >
                    Follow
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Following & Followers */}
      <div className="connections-container">
        <div className="widget">
          <h3 className="widget-header">Following</h3>
          {followingDetails.length === 0 ? (
            <div className="empty-state">You are not following anyone.</div>
          ) : (
            <div className="user-list">
              {followingDetails.map(u => (
                <div key={u.id} className="user-item">
                  <img 
                    src={u.profile_picture || 'https://i.pravatar.cc/150?img=2'} 
                    alt="Profile" 
                    className="user-avatar" 
                  />
                  <Link to={`/user/${u.id}`} className="user-name">{u.name}</Link>
                  <button 
                    onClick={() => handleUnfollow(u.id)} 
                    disabled={followLoading[u.id]}
                    className="follow-button following"
                  >
                    Unfollow
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="widget">
          <h3 className="widget-header">Followers</h3>
          {followers.length === 0 ? (
            <div className="empty-state">You have no followers yet.</div>
          ) : (
            <div className="user-list">
              {followers.map(u => (
                <div key={u.id} className="user-item">
                  <img 
                    src={u.profile_picture || 'https://i.pravatar.cc/150?img=3'} 
                    alt="Profile" 
                    className="user-avatar" 
                  />
                  <Link to={`/user/${u.id}`} className="user-name">{u.name}</Link>
                  {following.includes(u.id) ? (
                    <button 
                      onClick={() => handleUnfollow(u.id)} 
                      disabled={followLoading[u.id]}
                      className="follow-button following"
                    >
                      Unfollow
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleFollow(u.id)} 
                      disabled={followLoading[u.id]}
                      className="follow-button"
                    >
                      Follow
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile; 