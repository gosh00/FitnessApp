import { useState } from 'react';
import api from '../api';
import styles from './FoodCaloriePage.module.css';
import sharedStyles from '../styles/shared.module.css';

export default function FoodCaloriePage() {
  const [query, setQuery] = useState('');
  const [foodResult, setFoodResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearchFood = async () => {
    setErrorMsg('');
    setFoodResult(null);

    if (!query.trim()) {
      alert('Enter something like "100g chicken breast" or "1 banana"');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get('/foodinfo', { params: { query } });
      setFoodResult(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error loading food info');
    }
    setLoading(false);
  };

  const renderFoodCard = () => {
    if (!foodResult || !Array.isArray(foodResult) || foodResult.length === 0) {
      return <div className={styles.emptyState}>No results found.</div>;
    }

    const item = foodResult[0];

    const {
      name,
      serving_size_g,
      calories,
      protein_g,
      carbohydrates_total_g,
      fat_total_g,
      sugar_g,
      fiber_g,
    } = item;

    return (
      <div className={styles.foodCard}>
        <h4 className={styles.foodName}>
          {name} ({serving_size_g} g)
        </h4>
        <div className={styles.nutritionGrid}>
          <div className={styles.nutritionItem}>
            <span className={styles.nutritionLabel}>Calories:</span>
            <span className={styles.nutritionValue}>{calories}</span>
          </div>
          <div className={styles.nutritionItem}>
            <span className={styles.nutritionLabel}>Protein:</span>
            <span className={styles.nutritionValue}>{protein_g} g</span>
          </div>
          <div className={styles.nutritionItem}>
            <span className={styles.nutritionLabel}>Carbs:</span>
            <span className={styles.nutritionValue}>{carbohydrates_total_g} g</span>
          </div>
          <div className={styles.nutritionItem}>
            <span className={styles.nutritionLabel}>Fat:</span>
            <span className={styles.nutritionValue}>{fat_total_g} g</span>
          </div>
          <div className={styles.nutritionItem}>
            <span className={styles.nutritionLabel}>Sugar:</span>
            <span className={styles.nutritionValue}>{sugar_g} g</span>
          </div>
          <div className={styles.nutritionItem}>
            <span className={styles.nutritionLabel}>Fiber:</span>
            <span className={styles.nutritionValue}>{fiber_g} g</span>
          </div>
        </div>

        <details className={styles.detailsToggle}>
          <summary className={styles.detailsSummary}>Show raw API response</summary>
          <pre className={styles.detailsContent}>
            {JSON.stringify(item, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  return (
    <div className={sharedStyles.card}>
      <h2 className={styles.title}>Food Calories</h2>

      <div className={styles.searchSection}>
        <h3 className={styles.sectionTitle}>Food calories lookup (API Ninjas)</h3>
        
        <div className={styles.searchForm}>
          <input
            className={`${sharedStyles.input} ${styles.searchInput}`}
            placeholder='e.g. "100g rice" or "1 banana"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={handleSearchFood} className={sharedStyles.primaryButton}>
            Search
          </button>
        </div>

        {loading && <div className={sharedStyles.loading}>Loading...</div>}
        {errorMsg && <div className={sharedStyles.errorMessage}>{errorMsg}</div>}

        {!loading && !errorMsg && foodResult && renderFoodCard()}
      </div>
    </div>
  );
}
