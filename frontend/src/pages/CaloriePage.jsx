import { useState } from 'react';
import styles from './CaloriePage.module.css';
import sharedStyles from '../styles/shared.module.css';

export default function CaloriePage() {
  const [unitSystem, setUnitSystem] = useState('metric');
  const [sex, setSex] = useState('male');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [activity, setActivity] = useState('moderate');
  const [bmr, setBmr] = useState(null);
  const [tdee, setTdee] = useState(null);

  const handleCalculateBmr = () => {
    if (!age) {
      alert('Please enter age');
      return;
    }

    let heightInCm;
    let weightInKg;

    if (unitSystem === 'metric') {
      if (!heightCm || !weightKg) {
        alert('Please fill height and weight');
        return;
      }
      heightInCm = Number(heightCm);
      weightInKg = Number(weightKg);
    } else {
      if (!heightFt || heightIn === '' || !weightLbs) {
        alert('Please fill feet, inches and weight');
        return;
      }
      const totalInches = Number(heightFt) * 12 + Number(heightIn);
      heightInCm = totalInches * 2.54;
      weightInKg = Number(weightLbs) * 0.45359237;
    }

    const ageNum = Number(age);

    let bmrValue;
    if (sex === 'male') {
      bmrValue = 10 * weightInKg + 6.25 * heightInCm - 5 * ageNum + 5;
    } else {
      bmrValue = 10 * weightInKg + 6.25 * heightInCm - 5 * ageNum - 161;
    }

    let multiplier = 1.2;
    if (activity === 'light') multiplier = 1.375;
    if (activity === 'moderate') multiplier = 1.55;
    if (activity === 'active') multiplier = 1.725;
    if (activity === 'very_active') multiplier = 1.9;

    const tdeeValue = bmrValue * multiplier;

    setBmr(Math.round(bmrValue));
    setTdee(Math.round(tdeeValue));
  };

  const goals =
    tdee !== null
      ? [
          {
            group: 'neutral',
            label: 'Maintain weight',
            kcal: tdee,
            percent: 100,
            subtitle: '',
          },
          {
            group: 'loss',
            label: 'Mild weight loss',
            kcal: Math.round(tdee * 0.93),
            percent: 93,
            subtitle: '≈0.25 kg/week',
          },
          {
            group: 'loss',
            label: 'Weight loss',
            kcal: Math.round(tdee * 0.85),
            percent: 85,
            subtitle: '≈0.5 kg/week',
          },
          {
            group: 'loss',
            label: 'Extreme weight loss',
            kcal: Math.round(tdee * 0.7),
            percent: 70,
            subtitle: '≈1 kg/week (short term only)',
          },
          {
            group: 'gain',
            label: 'Mild weight gain',
            kcal: Math.round(tdee * 1.07),
            percent: 107,
            subtitle: '≈0.25 kg/week',
          },
          {
            group: 'gain',
            label: 'Weight gain',
            kcal: Math.round(tdee * 1.15),
            percent: 115,
            subtitle: '≈0.5 kg/week',
          },
          {
            group: 'gain',
            label: 'Fast weight gain',
            kcal: Math.round(tdee * 1.3),
            percent: 130,
            subtitle: 'up to ≈1 kg/week (bulking)',
          },
        ]
      : [];

  return (
    <div className={sharedStyles.card}>
      <h2 className={styles.title}>Calorie Calculator</h2>

      <div className={styles.calculatorSection}>
        <h3 className={styles.sectionTitle}>Daily calorie needs (BMR & TDEE)</h3>

        <div className={styles.formRow}>
          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Units</label>
            <select
              value={unitSystem}
              onChange={(e) => setUnitSystem(e.target.value)}
              className={sharedStyles.select}
            >
              <option value="metric">Metric (cm, kg)</option>
              <option value="imperial">Imperial (ft/in, lbs)</option>
            </select>
          </div>

          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Sex</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className={sharedStyles.select}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        <div className={styles.formRowSingle}>
          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className={sharedStyles.input}
              placeholder="Enter your age"
            />
          </div>
        </div>

        {unitSystem === 'metric' ? (
          <div className={styles.formRow}>
            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.formLabel}>Height (cm)</label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className={sharedStyles.input}
                placeholder="e.g. 175"
              />
            </div>
            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.formLabel}>Weight (kg)</label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className={sharedStyles.input}
                placeholder="e.g. 70"
              />
            </div>
          </div>
        ) : (
          <>
            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.formLabel}>Height</label>
              <div className={styles.heightInputs}>
                <input
                  type="number"
                  placeholder="Feet"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  className={`${sharedStyles.input} ${styles.heightInputSmall}`}
                />
                <input
                  type="number"
                  placeholder="Inches"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  className={`${sharedStyles.input} ${styles.heightInputSmall}`}
                />
              </div>
            </div>
            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.formLabel}>Weight (lbs)</label>
              <input
                type="number"
                value={weightLbs}
                onChange={(e) => setWeightLbs(e.target.value)}
                className={sharedStyles.input}
                placeholder="e.g. 154"
              />
            </div>
          </>
        )}

        <div className={styles.formRowSingle}>
          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Activity level</label>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className={sharedStyles.select}
            >
              <option value="sedentary">Sedentary (little or no exercise)</option>
              <option value="light">Light (1-3 days/week)</option>
              <option value="moderate">Moderate (3-5 days/week)</option>
              <option value="active">Active (6-7 days/week)</option>
              <option value="very_active">Very active (hard exercise)</option>
            </select>
          </div>
        </div>

        <button onClick={handleCalculateBmr} className={sharedStyles.primaryButton}>
          Calculate daily calories
        </button>

        {bmr !== null && tdee !== null && (
          <div className={styles.results}>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>BMR:</span> {bmr} kcal/day (at rest)
            </div>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>Maintenance (TDEE):</span> {tdee} kcal/day
            </div>
          </div>
        )}
      </div>

      {goals.length > 0 && (
        <div className={styles.goalsSection}>
          <h3 className={styles.sectionTitle}>Your calorie goals</h3>
          {goals.map((g) => (
            <div
              key={g.label}
              className={`${styles.goalCard} ${
                g.group === 'loss'
                  ? styles.goalCardLoss
                  : g.group === 'gain'
                  ? styles.goalCardGain
                  : styles.goalCardNeutral
              }`}
            >
              <div className={styles.goalInfo}>
                <div className={styles.goalLabel}>{g.label}</div>
                {g.subtitle && <div className={styles.goalSubtitle}>{g.subtitle}</div>}
              </div>
              <div className={styles.goalCalories}>
                <div className={styles.goalCaloriesNumber}>
                  {g.kcal.toLocaleString()}
                </div>
                <div className={styles.goalCaloriesLabel}>
                  Calories/day · {g.percent}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}