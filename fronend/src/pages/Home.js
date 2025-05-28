import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

function Home() {
  const { token } = useAuth();
  return (
    <div className="container">
      <h1>Welcome to Hobby Social!</h1>
      <nav>
        {!token && <><Link to="/login">Login</Link> |{' '}<Link to="/signup">Sign Up</Link> |{' '}</>}
        <Link to="/posts">Posts</Link> |{' '}
        <Link to="/profile">Profile</Link>
      </nav>
    </div>
  );
}

export default Home; 