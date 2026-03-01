import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import styles from "./LogWorkoutPage.module.css";
import sharedStyles from "../styles/shared.module.css";
import ExercisePicker from "../components/ExercisePicker";

function getLocalDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function LogWorkoutPage() {
  const [workoutName, setWorkoutName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [exerciseBlocks, setExerciseBlocks] = useState([
    { exercise: null, sets: [{ reps: "", weight: "", unit: "kg" }] },
  ]);

  const [saving, setSaving] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);
  const [pageError, setPageError] = useState("");

  const [appUserId, setAppUserId] = useState(null);
  const [muscleOptions, setMuscleOptions] = useState([]);

  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadInit = async () => {
      setLoadingInit(true);
      setPageError("");

      try {
        const { data: authRes, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!authRes?.user) throw new Error("Няма влязъл потребител.");

        const authId = authRes.user.id;
        const authEmail = authRes.user.email ?? "";

        const { data: existing, error: userErr } = await supabase
          .from("Users")
          .select("id, auth_id, email")
          .eq("auth_id", authId)
          .maybeSingle();

        if (userErr) throw userErr;

        let userRow = existing;

        if (!userRow) {
          const defaultName = authEmail ? authEmail.split("@")[0] : "Потребител";

          const { data: inserted, error: insErr } = await supabase
            .from("Users")
            .insert({
              auth_id: authId,
              email: authEmail,
              display_name: defaultName,
              goal: "Maintain Weight",
            })
            .select("id, auth_id, email")
            .single();

          if (insErr) throw insErr;
          userRow = inserted;
        }

        const { data: mgRows, error: mgErr } = await supabase
          .from("Exercises")
          .select("muscle_group")
          .not("muscle_group", "is", null);

        if (mgErr) throw mgErr;

        const uniq = Array.from(new Set((mgRows || []).map((r) => r.muscle_group))).sort();

        if (!isMounted) return;

        setAppUserId(userRow.id);
        setMuscleOptions(uniq);
      } catch (e) {
        if (!isMounted) return;
        setPageError(e?.message || "Неуспешна инициализация на страницата.");
      } finally {
        if (isMounted) setLoadingInit(false);
      }
    };

    loadInit();
    return () => {
      isMounted = false;
    };
  }, []);

  const addExerciseBlock = () => {
    setExerciseBlocks((prev) => [
      ...prev,
      { exercise: null, sets: [{ reps: "", weight: "", unit: "kg" }] },
    ]);
  };

  const removeExerciseBlock = (index) => {
    setExerciseBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const changeExercise = (index, exObj) => {
    setExerciseBlocks((prev) =>
      prev.map((block, i) => (i === index ? { ...block, exercise: exObj } : block))
    );
  };

  const addSetToBlock = (blockIndex) => {
    setExerciseBlocks((prev) =>
      prev.map((block, i) =>
        i === blockIndex
          ? { ...block, sets: [...block.sets, { reps: "", weight: "", unit: "kg" }] }
          : block
      )
    );
  };

  const removeSetFromBlock = (blockIndex, setIndex) => {
    setExerciseBlocks((prev) =>
      prev.map((block, i) =>
        i === blockIndex
          ? { ...block, sets: block.sets.filter((_, si) => si !== setIndex) }
          : block
      )
    );
  };

  const changeSetField = (blockIndex, setIndex, field, value) => {
    setExerciseBlocks((prev) =>
      prev.map((block, i) =>
        i === blockIndex
          ? {
              ...block,
              sets: block.sets.map((set, si) =>
                si === setIndex ? { ...set, [field]: value } : set
              ),
            }
          : block
      )
    );
  };

  const handleSaveWorkout = async () => {
    setPageError("");

    if (!appUserId) {
      setPageError("Не е намерен потребителски профил. Моля, влез отново.");
      return;
    }

    if (!workoutName.trim()) {
      setPageError("Моля, въведи име на тренировката.");
      return;
    }

    const cleanedExercises = exerciseBlocks
      .filter((b) => b.exercise?.id)
      .map((b) => ({
        exercise_id: Number(b.exercise.id),
        exercise_name: b.exercise.name,
        muscle_group: b.exercise.muscle_group ?? null,
        sets: b.sets
          .filter((s) => s.reps && s.weight)
          .map((s) => ({
            reps: Number(s.reps),
            weight: Number(s.weight),
            unit: s.unit,
          })),
      }))
      .filter((b) => b.sets.length > 0);

    if (cleanedExercises.length === 0) {
      setPageError("Добави поне едно упражнение с поне една серия.");
      return;
    }

    setSaving(true);

    try {
      const workoutData = {
        exercises: cleanedExercises,
        createdAt: new Date().toISOString(),
      };

      const { error: wErr } = await supabase.from("Workouts").insert({
        user_id: appUserId,
        name: workoutName.trim(),
        data: workoutData,
        is_public: isPublic,
      });

      if (wErr) throw wErr;

      const todayKey = getLocalDateKey();

      const logRows = [];
      for (const ex of cleanedExercises) {
        for (const s of ex.sets) {
          logRows.push({
            user_id: appUserId,
            exercise_id: ex.exercise_id,
            date: todayKey,
            sets: 1,
            reps: s.reps,
            weight: s.weight,
          });
        }
      }

      const { error: logErr } = await supabase.from("ExerciseLog").insert(logRows);
      if (logErr) throw logErr;

      setShowSavedToast(true);
      window.dispatchEvent(new Event("workout_saved"));
      setTimeout(() => setShowSavedToast(false), 2000);

      setWorkoutName("");
      setIsPublic(false);
      setExerciseBlocks([{ exercise: null, sets: [{ reps: "", weight: "", unit: "kg" }] }]);
    } catch (err) {
      console.error(err);
      setPageError(err?.message || "Грешка при запазване на тренировката.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2 className={styles.title}>Създай тренировка</h2>

        {pageError && <div className={styles.error}>{pageError}</div>}

        <div className={styles.workoutHeader}>
          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Име на тренировка</label>
            <input
              className={sharedStyles.input}
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="напр. Push ден, Leg ден, Цяло тяло"
            />
          </div>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Направи тренировката публична (видима за други потребители)
          </label>
        </div>

        {loadingInit && <div className={sharedStyles.loading}>Зареждане…</div>}

        {exerciseBlocks.map((block, i) => (
          <div key={i} className={styles.exerciseBlock}>
            <div className={styles.exerciseHeader}>
              <ExercisePicker
                valueExercise={block.exercise}
                onPickExercise={(ex) => changeExercise(i, ex)}
                disabled={loadingInit}
                muscleOptions={muscleOptions}
              />

              {exerciseBlocks.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExerciseBlock(i)}
                  className={styles.removeButton}
                >
                  Премахни упражнение
                </button>
              )}
            </div>

            <div>
              {block.sets.map((set, si) => (
                <div key={si} className={styles.setRow}>
                  <span className={styles.setLabel}>Серия {si + 1}:</span>

                  <input
                    type="number"
                    placeholder="Повт."
                    className={`${sharedStyles.input} ${styles.smallInput}`}
                    value={set.reps}
                    onChange={(e) => changeSetField(i, si, "reps", e.target.value)}
                  />

                  <input
                    type="number"
                    placeholder="Тежест"
                    className={`${sharedStyles.input} ${styles.smallInput}`}
                    value={set.weight}
                    onChange={(e) => changeSetField(i, si, "weight", e.target.value)}
                  />

                  <select
                    value={set.unit}
                    onChange={(e) => changeSetField(i, si, "unit", e.target.value)}
                    className={`${sharedStyles.select} ${styles.smallSelect}`}
                  >
                    <option value="kg">кг</option>
                    <option value="lb">lb</option>
                  </select>

                  {block.sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSetFromBlock(i, si)}
                      className={styles.removeButton}
                    >
                      Премахни
                    </button>
                  )}
                </div>
              ))}

              <button type="button" onClick={() => addSetToBlock(i)} className={styles.addButton}>
                + Добави серия
              </button>
            </div>
          </div>
        ))}

        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={addExerciseBlock}
            className={`${sharedStyles.secondaryButton} ${styles.secondaryBtn}`}
          >
            + Добави упражнение
          </button>

          <button
            type="button"
            onClick={handleSaveWorkout}
            disabled={saving || loadingInit}
            className={`${sharedStyles.primaryButton} ${styles.primaryBtn}`}
          >
            {saving ? "Запазване…" : "Запази тренировката"}
          </button>
        </div>
      </div>

      {showSavedToast && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span className={styles.toastIcon}>✅</span>
          <span className={styles.toastText}>Тренировката е запазена!</span>
        </div>
      )}
    </div>
  );
}