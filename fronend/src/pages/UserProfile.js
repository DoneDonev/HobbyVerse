import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LetterAvatar from '../components/LetterAvatar';

function UserProfile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const navigate = useNavigate();
  const backendUrl = "http://localhost:5117";

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    // Fetch user info
    axios.get(`${backendUrl}/api/user/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load user.');
        setLoading(false);
      });
    // Check if following
    axios.get(`${backendUrl}/api/social/following`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setFollowing(res.data.includes(Number(id)));
      })
      .catch(() => setFollowing(false));
    // Fetch user's posts
    setPostsLoading(true);
    axios.get(`${backendUrl}/api/posts?user_id=${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setPosts(res.data);
        setPostsLoading(false);
      })
      .catch(() => {
        setPostsError('Failed to load posts.');
        setPostsLoading(false);
      });
  }, [id, navigate]);

  const handleFollow = async () => {
    setFollowLoading(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${backendUrl}/api/social/follow/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(true);
    } catch {}
    setFollowLoading(false);
  };

  const handleUnfollow = async () => {
    setFollowLoading(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${backendUrl}/api/social/unfollow/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(false);
    } catch {}
    setFollowLoading(false);
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      {error && <div style={{color: 'red', marginBottom: '1rem'}}>{error}</div>}
      {user && (
        <>
          <h2>{user.name}</h2>
          {user.profile_picture ? (
            <img 
              src={user.profile_picture.startsWith('http') ? user.profile_picture : `${backendUrl}${user.profile_picture}`} 
              alt="Profile" 
              style={{width:80,height:80,borderRadius:'50%',objectFit:'cover',marginBottom:16}} 
            />
          ) : (
            <div style={{marginBottom:16}}>
              <LetterAvatar name={user.name} size="80px" textSize="32px" />
            </div>
          )}
          <div style={{marginBottom:16}}>
            {following ? (
              <button onClick={handleUnfollow} disabled={followLoading} className="follow-button following profile-unfollow-btn">Unfollow</button>
            ) : (
              <button onClick={handleFollow} disabled={followLoading} className="follow-button">Follow</button>
            )}
          </div>
          <hr style={{margin:'2rem 0'}} />
          <h3>{user.name}'s Posts</h3>
          {postsLoading ? <div>Loading posts...</div> : postsError ? <div style={{color:'red'}}>{postsError}</div> : (
            posts.length === 0 ? <div>No posts yet.</div> : (
              posts.map(post => (
                <div key={post.id} style={{border:'1px solid #eee',borderRadius:8,padding:'1rem',marginBottom:'1rem',background:'#fafbfc'}}>
                  <div style={{fontWeight:600,marginBottom:4}}>{post.content}</div>
                  {post.image && <img src={post.image.startsWith('http') ? post.image : `${backendUrl}${post.image}`} alt="Post" style={{width: '100%', maxWidth: 320, borderRadius: 8, marginBottom: 8, marginTop: 8}} />}
                  <div style={{fontSize:12, color:'#888'}}>Posted on {new Date(post.created_at).toLocaleString()}</div>
                </div>
              ))
            )
          )}
        </>
      )}
    </div>
  );
}

export default UserProfile; 