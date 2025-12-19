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
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-dark-800 p-8 rounded-2xl shadow-xl border border-gray-800">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-gradient-to-tr from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl mb-4">
            G3
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {isSignUp ? 'Create an account' : 'Sign in to Flash'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {isSignUp ? 'Join the Gemini 3 Flash experience' : 'Experience the speed of Gemini 3 Flash'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="name" className="sr-only">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required={isSignUp}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-700 placeholder-gray-500 text-gray-100 rounded-lg bg-dark-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm transition-colors"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-700 placeholder-gray-500 text-gray-100 rounded-lg bg-dark-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                className="appearance-none relative block w-full px-3 py-3 border border-gray-700 placeholder-gray-500 text-gray-100 rounded-lg bg-dark-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}
          
          {message && (
             <div className="text-green-500 text-sm text-center bg-green-500/10 py-2 rounded-lg border border-green-500/20">
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white 
                ${isLoading ? 'bg-brand-600/70 cursor-wait' : 'bg-brand-600 hover:bg-brand-500'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 focus:ring-offset-dark-900 transition-all transform active:scale-[0.98]
              `}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                isSignUp ? 'Sign Up' : 'Sign In'
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
           <p className="text-sm text-gray-400">
             {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
             <button 
               onClick={() => {
                 setIsSignUp(!isSignUp);
                 setError('');
                 setMessage('');
               }} 
               className="font-medium text-brand-500 hover:text-brand-400 focus:outline-none underline"
             >
               {isSignUp ? 'Sign In' : 'Sign Up'}
             </button>
           </p>
        </div>
      </div>
    </div>
  );
};

export default Login;