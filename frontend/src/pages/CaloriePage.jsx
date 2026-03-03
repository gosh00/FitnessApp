import { useMemo, useState } from "react";
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

  // ✅ NEW: контролира дали показваме формата или резултатите
  const [showResults, setShowResults] = useState(false);

  const handleCalculateBmr = () => {
    if (!age) {
      alert("Моля, въведи възраст");
      return;
    }

    let heightInCmVal;
    let weightInKgVal;

    if (unitSystem === "metric") {
      if (!heightCm || !weightKg) {
        alert("Моля, попълни ръст и тегло");
        return;
      }
      heightInCmVal = Number(heightCm);
      weightInKgVal = Number(weightKg);
    } else {
      if (!heightFt || heightIn === "" || !weightLbs) {
        alert("Моля, попълни футове, инчове и тегло");
        return;
      }
      const totalInches = Number(heightFt) * 12 + Number(heightIn);
      heightInCmVal = totalInches * 2.54;
      weightInKgVal = Number(weightLbs) * 0.45359237;
    }

    const ageNum = Number(age);

    let bmrValue;
    if (sex === "male") {
      bmrValue = 10 * weightInKgVal + 6.25 * heightInCmVal - 5 * ageNum + 5;
    } else {
      bmrValue = 10 * weightInKgVal + 6.25 * heightInCmVal - 5 * ageNum - 161;
    }

    let multiplier = 1.2;
    if (activity === "light") multiplier = 1.375;
    if (activity === "moderate") multiplier = 1.55;
    if (activity === "active") multiplier = 1.725;
    if (activity === "very_active") multiplier = 1.9;

    const tdeeValue = bmrValue * multiplier;

    setBmr(Math.round(bmrValue));
    setTdee(Math.round(tdeeValue));

    // ✅ скриваме полетата, показваме картите
    setShowResults(true);
  };

  const goals = useMemo(() => {
    if (tdee === null) return [];
    const list = [
      { group: "neutral", label: "Поддържане на тегло", kcal: tdee, percent: 100, subtitle: "" },
      { group: "loss", label: "Леко отслабване", kcal: Math.round(tdee * 0.93), percent: 93, subtitle: "≈0.25 кг/седмица" },
      { group: "loss", label: "Отслабване", kcal: Math.round(tdee * 0.85), percent: 85, subtitle: "≈0.5 кг/седмица" },
      { group: "loss", label: "По-агресивно отслабване", kcal: Math.round(tdee * 0.7), percent: 70, subtitle: "≈1 кг/седмица (само краткосрочно)" },
      { group: "gain", label: "Леко покачване", kcal: Math.round(tdee * 1.07), percent: 107, subtitle: "≈0.25 кг/седмица" },
      { group: "gain", label: "Покачване", kcal: Math.round(tdee * 1.15), percent: 115, subtitle: "≈0.5 кг/седмица" },
      { group: "gain", label: "Бързо покачване", kcal: Math.round(tdee * 1.3), percent: 130, subtitle: "до ≈1 кг/седмица (масов период)" },
    ];

    const order = { loss: 0, neutral: 1, gain: 2 };
    return list.sort((a, b) => order[a.group] - order[b.group]);
  }, [tdee]);

  const handleNewMeasures = () => {
    // показваме формата отново
    setShowResults(false);

    // по желание: да нулираме резултатите
    setBmr(null);
    setTdee(null);

    // ако искаш да се запазят последните въведени данни — махни редовете горе
    // и остави само setShowResults(false)
  };

  return (
    <div className={`${sharedStyles.card} ${styles.page}`}>
      <h2 className={styles.title}>Калориен калкулатор</h2>

      <div className={styles.calculatorSection}>
        {!showResults ? (
          <>
            <h3 className={styles.sectionTitle}>Дневни калорийни нужди (BMR и TDEE)</h3>

            <div className={styles.formRow}>
              <div className={sharedStyles.formGroup}>
                <label className={sharedStyles.formLabel}>Единици</label>
                <select
                  value={unitSystem}
                  onChange={(e) => setUnitSystem(e.target.value)}
                  className={sharedStyles.select}
                >
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
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className={sharedStyles.select}
                >
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
          </>
        ) : (
          <>
            <div className={styles.resultsHeader}>
              <div>
                <h3 className={styles.sectionTitle} style={{ marginBottom: 6 }}>
                  Резултати
                </h3>
                <div className={styles.resultsHint}>На база на въведените данни</div>
              </div>

              <button onClick={handleNewMeasures} className={`${sharedStyles.secondaryButton} ${styles.backBtn}`}>
                Въведи нови данни
              </button>
            </div>

            {bmr !== null && (
              <div className={styles.resultsCard}>
                <div className={styles.resultRow}>
                  <span className={styles.resultKey}>BMR</span>
                  <span className={styles.resultVal}>
                    {bmr} <span className={styles.unit}>ккал/ден</span>
                  </span>
                </div>
                <div className={styles.resultRow}>
                  <span className={styles.resultKey}>Поддържане (TDEE)</span>
                  <span className={styles.resultVal}>
                    {tdee} <span className={styles.unit}>ккал/ден</span>
                  </span>
                </div>
              </div>
            )}

            {goals.length > 0 && (
              <div className={styles.goalsSection}>
                <h3 className={styles.sectionTitle}>Варианти за калориен прием</h3>

                <div className={styles.goalsGrid}>
                  {goals.map((g) => (
                    <div key={g.label} className={styles.goalCard} data-group={g.group}>
                      <div className={styles.goalTop}>
                        <div className={styles.goalLabel}>{g.label}</div>
                        <div className={styles.badge}>
                          {g.group === "loss" ? "Отслабване" : g.group === "gain" ? "Покачване" : "Поддържане"}
                        </div>
                      </div>

                      <div className={styles.goalKcal}>
                        {g.kcal} <span className={styles.unit}>ккал</span>
                      </div>

                      {g.subtitle ? (
                        <div className={styles.goalSubtitle}>{g.subtitle}</div>
                      ) : (
                        <div className={styles.goalSubtitle} style={{ opacity: 0.55 }}>
                          —
                        </div>
                      )}

                      <div className={styles.goalMeta}>
                        <span className={styles.metaItem}>{g.percent}% от TDEE</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}