import { useState } from 'react';
import { supabase } from '../supabaseClient';
import api from '../api';
import styles from './AuthPage.module.css';
import sharedStyles from '../styles/shared.module.css';

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      let data, error;

      if (mode === 'signup') {
        const res = await supabase.auth.signUp({ email, password });
        data = res.data;
        error = res.error;
      } else {
        const res = await supabase.auth.signInWithPassword({ email, password });
        data = res.data;
        error = res.error;
      }

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (!user) {
        setErrorMsg('No user returned from Supabase');
        setLoading(false);
        return;
      }

      const resProfile = await api.post('/auth/sync', {
        auth_id: user.id,
        email: user.email,
      });

      const profile = resProfile.data;

      const mergedUser = {
        authId: user.id,
        email: user.email,
        appUserId: user.id,
        role: profile.role,
        displayName: profile.display_name,
      };

      onLogin(mergedUser);
    } catch (err) {
      console.error('Auth error:', err);
      if (err.response && err.response.data) {
        const backendMsg =
          err.response.data.error || JSON.stringify(err.response.data);
        setErrorMsg(`Backend error: ${backendMsg}`);
      } else if (err.message) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Unexpected error during auth');
      }
    }
    setLoading(false);
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.modeButtons}>
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`${styles.modeButton} ${mode === 'login' ? styles.modeButtonActive : ''}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`${styles.modeButton} ${mode === 'signup' ? styles.modeButtonActive : ''}`}
        >
          Sign Up
        </button>
      </div>

      <h2 className={styles.title}>
        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
      </h2>

      <div>
        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={sharedStyles.input}
          />
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={sharedStyles.input}
          />
        </div>

        {errorMsg && (
          <div className={sharedStyles.errorMessage}>{errorMsg}</div>
        )}

        <button 
          type="button"
          disabled={loading}
          className={sharedStyles.primaryButton}
          style={{ width: '100%' }}
          onClick={handleSubmit}
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign Up'}
        </button>
      </div>
    </div>
  );
}