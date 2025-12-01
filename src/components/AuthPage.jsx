
import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setMessage(error.message);
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Check your email for a confirmation link!');
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setMessage('Enter your email first, then click Forgot Password');
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for a password reset link!');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>🌱 Gratitude Garden</h1>
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="enter password"
              minLength={6}
            />
          </div>

          {message && <p className="auth-message">{message}</p>}

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        {isLogin && (
          <button onClick={handleResetPassword} className="link-button">
            Forgot Password?
          </button>
        )}

        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setMessage('');
          }} 
          className="link-button"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </button>
      </div>
    </div>
  );
}