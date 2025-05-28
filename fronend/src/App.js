import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Posts from './pages/Posts';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';
import UserProfile from './pages/UserProfile';
import PostDetail from './pages/PostDetail';
import LetterAvatar from './components/LetterAvatar';
import './styles.css';

// Auth context
const AuthContext = createContext();
export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [userStats, setUserStats] = useState({ followers: 0, following: 0, posts: 0 });
  const backendUrl = "http://localhost:5117"; // Replace with your actual backend URL

  useEffect(() => {
    const handleStorage = () => {
      setToken(localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    // Initialize from localStorage first (for faster loading)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setCurrentUser({
          id: userData.id,
          name: userData.name,
          username: `@${userData.name.toLowerCase().replace(/\s+/g, '')}`,
          avatar: userData.profile_picture || 'https://i.pravatar.cc/150?u=default',
        });
      } catch (error) {
        console.error('Error parsing stored user data:', error);
      }
    }

    // Fetch user data when token exists
    if (token) {
      fetchUserData();
      fetchUserStats();
    } else {
      setCurrentUser(null);
      setUserStats({ followers: 0, following: 0, posts: 0 });
      localStorage.removeItem('user');
    }
  }, [token]);
  
  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = response.data;
      const userObj = {
        id: userData.id,
        name: userData.name,
        username: `@${userData.name.toLowerCase().replace(/\s+/g, '')}`,
        avatar: userData.profile_picture || 'https://i.pravatar.cc/150?u=default',
      };
      
      setCurrentUser(userObj);
      
      // Update localStorage with latest user data
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };
  
  const fetchUserStats = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/user/me/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUserStats({
        followers: response.data.followers,
        following: response.data.following,
        posts: response.data.posts
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setCurrentUser(null);
    setUserStats({ followers: 0, following: 0, posts: 0 });
  };

  // Function to refresh user stats (called after actions that change stats)
  const refreshUserStats = () => {
    if (token) {
      fetchUserStats();
    }
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      currentUser, 
      userStats, 
      login, 
      logout, 
      refreshUserStats 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function NavBar() {
  const { token, logout, currentUser } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <div className="navbar">
      <div className="navbar-content">
        <Link to="/posts" className="navbar-brand">HobbyVerse</Link>
        <div className="navbar-links">
          {token ? (
            <>
              <Link to="/posts">Posts</Link>
              <Link to="/profile">Profile</Link>
              <Link to="/notifications">Notifications</Link>
              {currentUser && <span className="navbar-user-name">Hi, {currentUser.name}</span>}
              <button onClick={handleLogout} className="navbar-button">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-nav">
        <Link to="/posts" className="sidebar-link">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          <span>Feed</span>
        </Link>
        <Link to="/notifications" className="sidebar-link">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span>Notifications</span>
        </Link>
        <Link to="/profile" className="sidebar-link">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Profile</span>
        </Link>
      </div>
    </div>
  );
}

function ProfileWidget() {
  const { currentUser, userStats } = useAuth();
  const backendUrl = "http://localhost:5117";
  
  if (!currentUser) return null;
  
  return (
    <div className="widget profile-widget">
      {currentUser.avatar && currentUser.avatar !== 'https://i.pravatar.cc/150?u=default' ? (
        <img src={currentUser.avatar} alt="Profile" className="profile-avatar" />
      ) : (
        <div className="profile-avatar-container">
          <LetterAvatar name={currentUser.name} size="80px" textSize="32px" />
        </div>
      )}
      <div className="profile-name">{currentUser.name}</div>
      <div className="profile-username">{currentUser.username}</div>
      <div className="profile-stats">
        <div className="profile-stat">
          <div className="profile-stat-value">{userStats.posts}</div>
          <div className="profile-stat-label">Posts</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-value">{userStats.following}</div>
          <div className="profile-stat-label">Following</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-value">{userStats.followers}</div>
          <div className="profile-stat-label">Followers</div>
        </div>
      </div>
    </div>
  );
}

function AppLayout({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  
  if (!token && !isAuthPage) {
    return children;
  }
  
  if (isAuthPage) {
    return children;
  }
  
  return (
    <>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          {children}
        </div>
        <div className="widgets">
          <ProfileWidget />
          <div className="widget">
            <h3 className="widget-header">Trending Hobbies</h3>
            <div>
              <div>#painting</div>
              <div>#chess</div>
              <div>#gardening</div>
              <div>#cooking</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  
  return (
    <>
      {!isAuthPage && <NavBar />}
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/posts" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/posts" element={<ProtectedRoute><Posts /></ProtectedRoute>} />
          <Route path="/posts/:id" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/user/:id" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </>
  );
}

export default App;
