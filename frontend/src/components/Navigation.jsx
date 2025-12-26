import styles from './Navigation.module.css';

export default function Navigation({ page, setPage }) {
  const pages = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'exercises', label: 'Exercises', icon: '🏋️' },
    { id: 'log', label: 'Log Workout', icon: '📝' },
    { id: 'workouts', label: 'Feed', icon: '📱' },
    { id: 'calories', label: 'Calories', icon: '🔥' },
    { id: 'food', label: 'Food Info', icon: '🍎' },
  ];

  return (
    <nav className={styles.navigation}>
      <div className={styles.navContent}>
        {pages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPage(p.id)}
            className={`${styles.navButton} ${
              page === p.id ? styles.navButtonActive : ''
            }`}
          >
            <span className={styles.icon}>{p.icon}</span>
            <span className={styles.label}>{p.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
