import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import LetterAvatar from '../components/LetterAvatar';

function Profile() {
  const { refreshUserStats } = useAuth();
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
  const [hobbies, setHobbies] = useState([]);
  const [newHobby, setNewHobby] = useState('');
  const fileInputRef = useRef();
  const navigate = useNavigate();
  const backendUrl = "http://localhost:5117";

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    axios.get(`${backendUrl}/api/user/me`, {
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
    axios.get(`${backendUrl}/api/social/following/details`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setFollowingDetails(res.data)).catch(() => setFollowingDetails([]));
    // Fetch followers
    axios.get(`${backendUrl}/api/social/followers/details`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setFollowers(res.data)).catch(() => setFollowers([]));
    // Fetch hobbies
    axios.get(`${backendUrl}/api/user/me/hobbies`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setHobbies(res.data))
      .catch(() => setHobbies([]));
  }, [navigate, backendUrl]);

  const fetchFollowing = async (token) => {
    try {
      const res = await axios.get(`${backendUrl}/api/social/following`, {
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
      const res = await axios.put(`${backendUrl}/api/user/me`, {
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
      const res = await axios.post(`${backendUrl}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfilePicture(res.data.url.startsWith('http') ? res.data.url : backendUrl + res.data.url);
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
      const res = await axios.get(`${backendUrl}/api/user/find?hobby=${encodeURIComponent(searchHobby)}`, {
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
      await axios.post(`${backendUrl}/api/social/follow/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(f => [...f, userId]);
      // Refresh user stats to update following count
      refreshUserStats();
    } catch {}
    setFollowLoading(fl => ({ ...fl, [userId]: false }));
  };

  const handleUnfollow = async (userId) => {
    setFollowLoading(fl => ({ ...fl, [userId]: true }));
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${backendUrl}/api/social/unfollow/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(f => f.filter(id => id !== userId));
      // Refresh user stats to update following count
      refreshUserStats();
    } catch {}
    setFollowLoading(fl => ({ ...fl, [userId]: false }));
  };

  const handleAddHobby = async (e) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    if (!newHobby.trim()) return;
    try {
      const res = await axios.post(`${backendUrl}/api/user/me/hobbies`, { hobby: newHobby.trim() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHobbies(res.data);
      setNewHobby('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add hobby.');
    }
  };

  const handleRemoveHobby = async (hobby) => {
    setError('');
    const token = localStorage.getItem('token');
    try {
      const res = await axios.delete(`${backendUrl}/api/user/me/hobbies`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { hobby }
      });
      setHobbies(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove hobby.');
    }
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
                  src={profilePicture.startsWith('http') ? profilePicture : backendUrl + profilePicture} 
                  alt="Profile" 
                  className="profile-image-preview" 
                />
              )}
            </div>
            
            <button type="submit" className="post-creator-submit">Save Profile</button>
          </form>
        </div>
      )}

      {/* Hobbies management */}
      <div className="widget">
        <h3 className="widget-header">Your Hobbies</h3>
        {hobbies.length === 0 ? (
          <div className="empty-state">You have not added any hobbies yet.</div>
        ) : (
          <div className="user-list">
            {hobbies.map(hobby => (
              <div key={hobby} className="user-item">
                <span className="hobby-tag">#{hobby}</span>
                <button 
                  type="button" 
                  onClick={() => handleRemoveHobby(hobby)}
                  className="follow-button following"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        
        <form onSubmit={handleAddHobby} className="search-form" style={{marginTop: '15px'}}>
          <input 
            type="text" 
            value={newHobby} 
            onChange={e => setNewHobby(e.target.value)} 
            placeholder="Add a new hobby" 
            className="text-input"
          />
          <button type="submit" className="post-creator-submit">Add Hobby</button>
        </form>
      </div>

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
                <Link to={`/user/${user.id}`} className="user-name" style={{display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit'}}>
                  {user.profile_picture ? (
                    <img 
                      src={user.profile_picture.startsWith('http') ? user.profile_picture : backendUrl + user.profile_picture} 
                      alt="Profile" 
                      className="user-avatar" 
                    />
                  ) : (
                    <LetterAvatar name={user.name} size="40px" textSize="18px" />
                  )}
                  <span>{user.name}</span>
                </Link>
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
                  {u.profile_picture ? (
                    <img 
                      src={u.profile_picture.startsWith('http') ? u.profile_picture : backendUrl + u.profile_picture} 
                      alt="Profile" 
                      className="user-avatar" 
                    />
                  ) : (
                    <LetterAvatar name={u.name} size="40px" textSize="18px" />
                  )}
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
                  {u.profile_picture ? (
                    <img 
                      src={u.profile_picture.startsWith('http') ? u.profile_picture : backendUrl + u.profile_picture} 
                      alt="Profile" 
                      className="user-avatar" 
                    />
                  ) : (
                    <LetterAvatar name={u.name} size="40px" textSize="18px" />
                  )}
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