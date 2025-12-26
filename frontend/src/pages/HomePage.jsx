import { useEffect, useState } from 'react';
import api from '../api';
import styles from './HomePage.module.css';
import sharedStyles from '../styles/shared.module.css';

export default function HomePage() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        setStatus(res.data);
      } catch (err) {
        console.error(err);
        setStatus({ error: 'Backend not reachable' });
      }
    };
    checkHealth();
  }, []);

  return (
    <div>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Welcome to FitTrack 💪</h1>
        <p className={styles.heroSubtitle}>
          Your personal fitness companion for tracking workouts and reaching your goals
        </p>
      </div>

      <div className={styles.featureGrid}>
        <div className={sharedStyles.card}>
          <div className={styles.featureIcon}>📊</div>
          <h3 className={styles.featureTitle}>Track Progress</h3>
          <p className={styles.featureDescription}>
            Monitor your workouts and see your improvements over time
          </p>
        </div>

        <div className={sharedStyles.card}>
          <div className={styles.featureIcon}>🏋️</div>
          <h3 className={styles.featureTitle}>Log Workouts</h3>
          <p className={styles.featureDescription}>
            Record your exercises, sets, and reps with ease
          </p>
        </div>

        <div className={sharedStyles.card}>
          <div className={styles.featureIcon}>🔥</div>
          <h3 className={styles.featureTitle}>Calculate Calories</h3>
          <p className={styles.featureDescription}>
            Find out your daily calorie needs and track nutrition
          </p>
        </div>
      </div>

      {status && (
        <div className={`${sharedStyles.card} ${styles.statusSection}`}>
          <h3 className={styles.statusTitle}>System Status</h3>
          <pre className={styles.statusPre}>
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}