import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Posts from './pages/Posts';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';
import UserProfile from './pages/UserProfile';

// Auth context
const AuthContext = createContext();
export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const handleStorage = () => {
      setToken(localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function NavBar({ token }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <nav>
      <Link to="/">Home</Link> |{' '}
      {token ? (
        <>
          <Link to="/posts">Posts</Link> |{' '}
          <Link to="/profile">Profile</Link> |{' '}
          <Link to="/notifications">Notifications</Link> |{' '}
          <button onClick={handleLogout} style={{background:'none',color:'#2563eb',border:'none',cursor:'pointer',padding:0}}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link> |{' '}
          <Link to="/signup">Sign Up</Link>
        </>
      )}
    </nav>
  );
}

function AppRoutes() {
  const { token } = useAuth();
  return (
    <Routes>
      {token ? (
        <>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </>
      ) : (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthConsumerNavBarAndRoutes />
      </Router>
    </AuthProvider>
  );
}

function AuthConsumerNavBarAndRoutes() {
  const { token } = useAuth();
  return <>
    <NavBar token={token} />
    <AppRoutes />
  </>;
}

export default App;
