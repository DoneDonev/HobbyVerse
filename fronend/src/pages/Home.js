import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="container">
      <h1>Welcome to Hobby Social!</h1>
      <nav>
        <Link to="/login">Login</Link> |{' '}
        <Link to="/signup">Sign Up</Link> |{' '}
        <Link to="/posts">Posts</Link> |{' '}
        <Link to="/profile">Profile</Link>
      </nav>
    </div>
  );
}

export default Home; 