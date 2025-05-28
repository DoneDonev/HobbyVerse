import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
  const backendUrl = "http://localhost:5000";

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    axios.get('http://localhost:5000/api/user/me', {
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
    axios.get('http://localhost:5000/api/social/following/details', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setFollowingDetails(res.data)).catch(() => setFollowingDetails([]));
    // Fetch followers
    axios.get('http://localhost:5000/api/social/followers/details', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setFollowers(res.data)).catch(() => setFollowers([]));
  }, [navigate]);

  const fetchFollowing = async (token) => {
    try {
      const res = await axios.get('http://localhost:5000/api/social/following', {
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
      const res = await axios.put('http://localhost:5000/api/user/me', {
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
      const res = await axios.post('http://localhost:5000/api/upload', formData, {
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
      const res = await axios.get(`http://localhost:5000/api/user/find?hobby=${encodeURIComponent(searchHobby)}`, {
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
      await axios.post(`http://localhost:5000/api/social/follow/${userId}`, {}, {
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
      await axios.post(`http://localhost:5000/api/social/unfollow/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(f => f.filter(id => id !== userId));
    } catch {}
    setFollowLoading(fl => ({ ...fl, [userId]: false }));
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h2>Profile</h2>
      {error && <div style={{color: 'red', marginBottom: '1rem'}}>{error}</div>}
      {success && <div style={{color: 'green', marginBottom: '1rem'}}>{success}</div>}
      {profile && (
        <form onSubmit={handleSave}>
          <div>
            <label>Name:</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label>Profile Picture:</label>
            <input type="text" value={profilePicture} onChange={e => setProfilePicture(e.target.value)} placeholder="Paste image URL or upload below" />
          </div>
          <div style={{marginBottom: '1rem'}}>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button type="button" onClick={() => fileInputRef.current.click()} disabled={uploading} style={{marginRight: 8}}>
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
            {profilePicture && (
              <img src={profilePicture.startsWith('http') ? profilePicture : backendUrl + profilePicture} alt="Profile" style={{width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', verticalAlign: 'middle'}} />
            )}
          </div>
          <button type="submit">Save</button>
        </form>
      )}
      <hr style={{margin: '2rem 0'}} />
      <h3>Find Users by Hobby</h3>
      <form onSubmit={handleSearch} style={{marginBottom: '1rem'}}>
        <input type="text" value={searchHobby} onChange={e => setSearchHobby(e.target.value)} placeholder="e.g. chess" />
        <button type="submit" style={{marginLeft:8}}>Search</button>
      </form>
      {foundUsers.length > 0 && (
        <div style={{marginBottom:'2rem'}}>
          <h4>Users with hobby "{searchHobby}"</h4>
          {foundUsers.map(user => (
            <div key={user.id} style={{display:'flex',alignItems:'center',marginBottom:8}}>
              <img src={user.profile_picture ? (user.profile_picture.startsWith('http') ? user.profile_picture : backendUrl + user.profile_picture) : 'https://via.placeholder.com/40'} alt="Profile" style={{width:40,height:40,borderRadius:'50%',objectFit:'cover',marginRight:8}} />
              <span style={{marginRight:8}}>{user.name}</span>
              {following.includes(user.id) ? (
                <button onClick={() => handleUnfollow(user.id)} disabled={followLoading[user.id]}>Unfollow</button>
              ) : (
                <button onClick={() => handleFollow(user.id)} disabled={followLoading[user.id]}>Follow</button>
              )}
            </div>
          ))}
        </div>
      )}
      <h3>Following</h3>
      {followingDetails.length === 0 ? <div>You are not following anyone.</div> : (
        <ul style={{listStyle:'none',padding:0}}>
          {followingDetails.map(u => (
            <li key={u.id} style={{display:'flex',alignItems:'center',marginBottom:8}}>
              <img src={u.profile_picture ? (u.profile_picture.startsWith('http') ? u.profile_picture : backendUrl + u.profile_picture) : 'https://via.placeholder.com/32'} alt="Profile" style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',marginRight:8}} />
              <a href={`#/user/${u.id}`} style={{marginRight:8, color:'#2563eb', textDecoration:'underline'}}>{u.name}</a>
              <button onClick={() => handleUnfollow(u.id)} disabled={followLoading[u.id]}>Unfollow</button>
            </li>
          ))}
        </ul>
      )}
      <h3>Followers</h3>
      {followers.length === 0 ? <div>You have no followers yet.</div> : (
        <ul style={{listStyle:'none',padding:0}}>
          {followers.map(u => (
            <li key={u.id} style={{display:'flex',alignItems:'center',marginBottom:8}}>
              <img src={u.profile_picture ? (u.profile_picture.startsWith('http') ? u.profile_picture : backendUrl + u.profile_picture) : 'https://via.placeholder.com/32'} alt="Profile" style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',marginRight:8}} />
              <a href={`#/user/${u.id}`} style={{marginRight:8, color:'#2563eb', textDecoration:'underline'}}>{u.name}</a>
              {following.includes(u.id) ? (
                <button onClick={() => handleUnfollow(u.id)} disabled={followLoading[u.id]}>Unfollow</button>
              ) : (
                <button onClick={() => handleFollow(u.id)} disabled={followLoading[u.id]}>Follow</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Profile; 