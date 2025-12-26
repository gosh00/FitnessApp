import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <h3 className={styles.footerTitle}>
          💪 FitTrack – Your Fitness Journey
        </h3>
        <p className={styles.footerText}>
          © 2024 FitTrack. Track, train, transform.
        </p>
      </div>
    </footer>
  );
}
