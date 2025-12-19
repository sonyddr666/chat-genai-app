import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Only used for Sign Up
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign Up Logic
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // Check if email confirmation is required
          if (data.session) {
            onLoginSuccess(data.user);
          } else {
            setMessage('Account created! Please check your email to confirm your registration before logging in.');
            setIsSignUp(false); // Switch back to login view
          }
        }
      } else {
        // Sign In Logic
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          onLoginSuccess(data.user);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      // Handle specific email not confirmed error
      if (err.message && (err.message.includes("Email not confirmed") || err.message.includes("Email link is invalid"))) {
        setError("Your email address has not been confirmed yet. Please check your inbox.");
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
      padding: '16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#16213e',
        padding: '32px',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #e94560 0%, #ff6b9d 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            G3
          </h1>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
            {isSignUp ? 'Create an account' : 'Sign in to Flash'}
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            {isSignUp ? 'Join the Gemini 3 Flash experience' : 'Experience the speed of Gemini 3 Flash'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#e5e7eb', marginBottom: '8px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f0f1e',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#e5e7eb', marginBottom: '8px' }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: '#0f0f1e',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#e5e7eb', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: '#0f0f1e',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              padding: '12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid #22c55e',
              borderRadius: '8px',
              color: '#86efac',
              fontSize: '14px'
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #e94560 0%, #ff6b9d 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#9ca3af' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setMessage('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#e94560',
              fontWeight: '600',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;