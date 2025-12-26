import styles from './Header.module.css';

export default function Header({ currentUser, onLogout }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <h1 className={styles.logo}>💪 FitTrack</h1>

        {currentUser && (
          <div className={styles.userSection}>
            <span className={styles.userName}>
              {currentUser.displayName || currentUser.email}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className={styles.logoutButton}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
