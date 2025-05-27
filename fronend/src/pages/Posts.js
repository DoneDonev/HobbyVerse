import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../App';

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
      const res = await axios.get('http://localhost:5000/api/posts', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setPosts(res.data);
      // Fetch counts for all posts
      const ids = res.data.map(p => p.id);
      if (ids.length) {
        const [likesRes, commentsRes, sharesRes, likedRes] = await Promise.all([
          axios.post('http://localhost:5000/api/posts/likes-count', { ids }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post('http://localhost:5000/api/posts/comments-count', { ids }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post('http://localhost:5000/api/posts/shares-count', { ids }, { headers: { Authorization: `Bearer ${token}` } }),
          axios.post('http://localhost:5000/api/posts/liked', { ids }, { headers: { Authorization: `Bearer ${token}` } }),
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
      const res = await axios.post('http://localhost:5000/api/posts', {
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
      const res = await axios.post('http://localhost:5000/api/upload', formData, {
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
      await axios.post(`http://localhost:5000/api/posts/${postId}/like`, {}, {
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
        const res = await axios.get(`http://localhost:5000/api/posts/${postId}/comments`, {
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
      const res = await axios.post(`http://localhost:5000/api/posts/${postId}/comment`, { content: comment }, {
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
      const res = await axios.post(`http://localhost:5000/api/posts/${postId}/share`, {}, {
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
    <div className="container">
      <h2>Posts</h2>
      {/* Filter/Search by Hobby */}
      <form onSubmit={e => { e.preventDefault(); setFilterHobby(searchHobby); }} style={{marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:8}}>
        <input
          type="text"
          value={searchHobby}
          onChange={e => setSearchHobby(e.target.value)}
          placeholder="Filter by hobby (e.g. chess)"
          style={{flex:1}}
        />
        <button type="submit">Search</button>
        {filterHobby && <button type="button" onClick={() => { setFilterHobby(''); setSearchHobby(''); }}>Clear</button>}
      </form>
      {error && <div style={{color: 'red', marginBottom: '1rem'}}>{error}</div>}
      <form onSubmit={handleCreate} style={{marginBottom: '2rem'}}>
        <div>
          <label>Content:</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} required rows={3} style={{width:'100%'}} />
        </div>
        <div>
          <label>Image:</label>
          <input type="text" value={image} onChange={e => setImage(e.target.value)} placeholder="Paste image URL or upload below" />
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
          {image && (
            <img src={image} alt="Post" style={{width: 80, height: 80, borderRadius: 8, objectFit: 'cover', verticalAlign: 'middle'}} />
          )}
        </div>
        <div>
          <label>Hobbies (comma separated):</label>
          <input type="text" value={hobbies} onChange={e => setHobbies(e.target.value)} placeholder="e.g. chess, painting" />
        </div>
        <button type="submit" disabled={creating}>{creating ? 'Posting...' : 'Create Post'}</button>
      </form>
      {loading ? <div>Loading posts...</div> : (
        <div>
          {posts.length === 0 ? <div>No posts yet.</div> : (
            posts.map(post => (
              <div key={post.id} style={{border:'1px solid #eee',borderRadius:8,padding:'1rem',marginBottom:'1rem',background:'#fafbfc'}}>
                <div style={{fontWeight:600,marginBottom:4}}>{post.content}</div>
                {post.image && <img src={post.image} alt="Post" style={{width: '100%', maxWidth: 320, borderRadius: 8, marginBottom: 8, marginTop: 8}} />}
                <div style={{fontSize:12, color:'#888'}}>Posted on {new Date(post.created_at).toLocaleString()}</div>
                <div style={{marginTop:8, display:'flex', alignItems:'center', gap:8}}>
                  <button
                    onClick={() => handleLike(post.id)}
                    disabled={liking[post.id]}
                    style={{background: likedPosts[post.id] ? '#2563eb' : undefined, color: likedPosts[post.id] ? '#fff' : undefined}}
                  >
                    Like{likeCounts[post.id] ? ` (${likeCounts[post.id]})` : ''}
                  </button>
                  <button onClick={() => handleToggleComments(post.id)}>
                    {showComments[post.id] ? 'Hide' : 'Show'} Comments{commentCounts[post.id] ? ` (${commentCounts[post.id]})` : ''}
                  </button>
                  <button onClick={() => handleShare(post.id)} disabled={sharing[post.id]}>
                    {sharing[post.id] ? 'Sharing...' : 'Share'}{shareCounts[post.id] ? ` (${shareCounts[post.id]})` : ''}
                  </button>
                </div>
                {showComments[post.id] && (
                  <div style={{marginTop:12}}>
                    <div>
                      {(comments[post.id] || []).map(c => (
                        <div key={c.id} style={{borderBottom:'1px solid #eee',padding:'4px 0'}}>
                          <span style={{fontWeight:500}}>{c.name || 'User'}:</span> {c.content}
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:8}}>
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={e => setCommentInputs(ci => ({ ...ci, [post.id]: e.target.value }))}
                        placeholder="Add a comment..."
                        style={{width:'80%'}}
                      />
                      <button onClick={() => handleAddComment(post.id)} style={{marginLeft:8}}>Comment</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Posts; 