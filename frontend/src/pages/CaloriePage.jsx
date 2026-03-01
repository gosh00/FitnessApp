import { useState } from "react";
import styles from "./CaloriePage.module.css";
import sharedStyles from "../styles/shared.module.css";

export default function CaloriePage() {
  const [unitSystem, setUnitSystem] = useState("metric");
  const [sex, setSex] = useState("male");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [activity, setActivity] = useState("moderate");
  const [bmr, setBmr] = useState(null);
  const [tdee, setTdee] = useState(null);

  const handleCalculateBmr = () => {
    if (!age) {
      alert("Моля, въведи възраст");
      return;
    }

    let heightInCm;
    let weightInKg;

    if (unitSystem === "metric") {
      if (!heightCm || !weightKg) {
        alert("Моля, попълни ръст и тегло");
        return;
      }
      heightInCm = Number(heightCm);
      weightInKg = Number(weightKg);
    } else {
      if (!heightFt || heightIn === "" || !weightLbs) {
        alert("Моля, попълни футове, инчове и тегло");
        return;
      }
      const totalInches = Number(heightFt) * 12 + Number(heightIn);
      heightInCm = totalInches * 2.54;
      weightInKg = Number(weightLbs) * 0.45359237;
    }

    const ageNum = Number(age);

    let bmrValue;
    if (sex === "male") {
      bmrValue = 10 * weightInKg + 6.25 * heightInCm - 5 * ageNum + 5;
    } else {
      bmrValue = 10 * weightInKg + 6.25 * heightInCm - 5 * ageNum - 161;
    }

    let multiplier = 1.2;
    if (activity === "light") multiplier = 1.375;
    if (activity === "moderate") multiplier = 1.55;
    if (activity === "active") multiplier = 1.725;
    if (activity === "very_active") multiplier = 1.9;

    const tdeeValue = bmrValue * multiplier;

    setBmr(Math.round(bmrValue));
    setTdee(Math.round(tdeeValue));
  };

  const goals =
    tdee !== null
      ? [
          { group: "neutral", label: "Поддържане на тегло", kcal: tdee, percent: 100, subtitle: "" },
          { group: "loss", label: "Леко отслабване", kcal: Math.round(tdee * 0.93), percent: 93, subtitle: "≈0.25 кг/седмица" },
          { group: "loss", label: "Отслабване", kcal: Math.round(tdee * 0.85), percent: 85, subtitle: "≈0.5 кг/седмица" },
          { group: "loss", label: "По-агресивно отслабване", kcal: Math.round(tdee * 0.7), percent: 70, subtitle: "≈1 кг/седмица (само краткосрочно)" },
          { group: "gain", label: "Леко покачване", kcal: Math.round(tdee * 1.07), percent: 107, subtitle: "≈0.25 кг/седмица" },
          { group: "gain", label: "Покачване", kcal: Math.round(tdee * 1.15), percent: 115, subtitle: "≈0.5 кг/седмица" },
          { group: "gain", label: "Бързо покачване", kcal: Math.round(tdee * 1.3), percent: 130, subtitle: "до ≈1 кг/седмица (масов период)" },
        ]
      : [];

  return (
    <div className={`${sharedStyles.card} ${styles.page}`}>
      <h2 className={styles.title}>Калориен калкулатор</h2>

      <div className={styles.calculatorSection}>
        <h3 className={styles.sectionTitle}>Дневни калорийни нужди (BMR и TDEE)</h3>

        <div className={styles.formRow}>
          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Единици</label>
            <select value={unitSystem} onChange={(e) => setUnitSystem(e.target.value)} className={sharedStyles.select}>
              <option value="metric">Метрична (см, кг)</option>
              <option value="imperial">Имперска (ft/in, lbs)</option>
            </select>
          </div>

          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Пол</label>
            <select value={sex} onChange={(e) => setSex(e.target.value)} className={sharedStyles.select}>
              <option value="male">Мъж</option>
              <option value="female">Жена</option>
            </select>
          </div>
        </div>

        <div className={styles.formRowSingle}>
          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Възраст</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className={sharedStyles.input}
              placeholder="Въведи възраст"
            />
          </div>
        </div>

        {unitSystem === "metric" ? (
          <div className={styles.formRow}>
            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.formLabel}>Ръст (см)</label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className={sharedStyles.input}
                placeholder="напр. 175"
              />
            </div>
            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.formLabel}>Тегло (кг)</label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className={sharedStyles.input}
                placeholder="напр. 70"
              />
            </div>
          </div>
        ) : (
          <>
            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.formLabel}>Ръст</label>
              <div className={styles.heightInputs}>
                <input
                  type="number"
                  placeholder="Футове"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  className={`${sharedStyles.input} ${styles.heightInputSmall}`}
                />
                <input
                  type="number"
                  placeholder="Инчове"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  className={`${sharedStyles.input} ${styles.heightInputSmall}`}
                />
              </div>
            </div>
            <div className={sharedStyles.formGroup}>
              <label className={sharedStyles.formLabel}>Тегло (lbs)</label>
              <input
                type="number"
                value={weightLbs}
                onChange={(e) => setWeightLbs(e.target.value)}
                className={sharedStyles.input}
                placeholder="напр. 154"
              />
            </div>
          </>
        )}

        <div className={styles.formRowSingle}>
          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Ниво на активност</label>
            <select value={activity} onChange={(e) => setActivity(e.target.value)} className={sharedStyles.select}>
              <option value="sedentary">Заседнал</option>
              <option value="light">Лека активност</option>
              <option value="moderate">Умерена активност</option>
              <option value="active">Висока активност</option>
              <option value="very_active">Много висока активност</option>
            </select>
          </div>
        </div>

        <button onClick={handleCalculateBmr} className={sharedStyles.primaryButton}>
          Изчисли дневните калории
        </button>

        {bmr !== null && tdee !== null && (
          <div className={styles.results}>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>BMR:</span> {bmr} ккал/ден
            </div>
            <div className={styles.resultItem}>
              <span className={styles.resultLabel}>Поддържане (TDEE):</span> {tdee} ккал/ден
            </div>
          </div>
        )}

        {goals.length > 0 && (
          <div className={styles.goalsSection}>
            <h3 className={styles.sectionTitle}>Варианти за калориен прием</h3>
            <div className={styles.goalsList}>
              {goals.map((g) => (
                <div key={g.label} className={styles.goalItem}>
                  <div className={styles.goalLabel}>{g.label}</div>
                  <div className={styles.goalKcal}>{g.kcal} ккал</div>
                  {g.subtitle && <div className={styles.goalSubtitle}>{g.subtitle}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}