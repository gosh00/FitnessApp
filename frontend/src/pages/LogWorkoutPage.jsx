import { useEffect, useState } from "react";
import styles from "./LogWorkoutPage.module.css";
import sharedStyles from "../styles/shared.module.css";
import { supabase } from "../supabaseClient";
import ExercisePicker from "../components/ExercisePicker";

function getLocalDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`; // YYYY-MM-DD (local)
}

export default function LogWorkoutPage() {
  const [workoutName, setWorkoutName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // store full exercise object instead of id
  const [exerciseBlocks, setExerciseBlocks] = useState([
    { exercise: null, sets: [{ reps: "", weight: "", unit: "kg" }] },
  ]);

  const [saving, setSaving] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);
  const [pageError, setPageError] = useState("");

  const [appUserId, setAppUserId] = useState(null);
  const [muscleOptions, setMuscleOptions] = useState([]);

  // toast instead of alert
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadInit = async () => {
      setLoadingInit(true);
      setPageError("");

      try {
        // 1) auth user
        const { data: authRes, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!authRes?.user) throw new Error("No logged-in user.");

        const authId = authRes.user.id;
        const authEmail = authRes.user.email ?? "";

        // 2) ensure Users row exists, get Users.id
        const { data: existing, error: userErr } = await supabase
          .from("Users")
          .select("id, auth_id, email")
          .eq("auth_id", authId)
          .maybeSingle();

        if (userErr) throw userErr;

        let userRow = existing;

        if (!userRow) {
          const defaultName = authEmail ? authEmail.split("@")[0] : "User";

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

        // 3) load muscle groups only
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
        setPageError(e?.message || "Failed to initialize page.");
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
      setPageError("No user profile found. Please re-login.");
      return;
    }

    if (!workoutName.trim()) {
      setPageError("Please enter a workout name.");
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
      setPageError("Add at least one exercise with one set.");
      return;
    }

    setSaving(true);

    try {
      // 1) Workouts jsonb
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

      // 2) ExerciseLog (1 row per set) with LOCAL date key
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

      // ✅ Toast + refresh header
      setShowSavedToast(true);
      window.dispatchEvent(new Event("workout_saved"));
      setTimeout(() => setShowSavedToast(false), 2000);

      // reset
      setWorkoutName("");
      setIsPublic(false);
      setExerciseBlocks([{ exercise: null, sets: [{ reps: "", weight: "", unit: "kg" }] }]);
    } catch (err) {
      console.error(err);
      setPageError(err?.message || "Error saving workout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={sharedStyles.card}>
      <h2 className={styles.title}>Create Workout</h2>

      {pageError && <div style={{ color: "red", marginBottom: 10 }}>{pageError}</div>}

      <div className={styles.workoutHeader}>
        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Workout name</label>
          <input
            className={sharedStyles.input}
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="e.g. Push day, Leg day, Full body"
          />
        </div>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Make this workout public (visible to other users)
        </label>
      </div>

      {loadingInit && <div className={sharedStyles.loading}>Loading...</div>}

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
                Remove exercise
              </button>
            )}
          </div>

          <div>
            {block.sets.map((set, si) => (
              <div key={si} className={styles.setRow}>
                <span className={styles.setLabel}>Set {si + 1}:</span>

                <input
                  type="number"
                  placeholder="Reps"
                  className={`${sharedStyles.input} ${styles.smallInput}`}
                  value={set.reps}
                  onChange={(e) => changeSetField(i, si, "reps", e.target.value)}
                />

                <input
                  type="number"
                  placeholder="Weight"
                  className={`${sharedStyles.input} ${styles.smallInput}`}
                  value={set.weight}
                  onChange={(e) => changeSetField(i, si, "weight", e.target.value)}
                />

                <select
                  value={set.unit}
                  onChange={(e) => changeSetField(i, si, "unit", e.target.value)}
                  className={`${sharedStyles.select} ${styles.smallSelect}`}
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>

                {block.sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSetFromBlock(i, si)}
                    className={styles.removeButton}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => addSetToBlock(i)}
              className={styles.addButton}
            >
              + Add set
            </button>
          </div>
        </div>
      ))}

      <div className={styles.actionButtons}>
        <button type="button" onClick={addExerciseBlock} className={sharedStyles.secondaryButton}>
          + Add exercise
        </button>

        <button
          type="button"
          onClick={handleSaveWorkout}
          disabled={saving || loadingInit}
          className={sharedStyles.primaryButton}
        >
          {saving ? "Saving..." : "Save workout"}
        </button>
      </div>

      {/* ✅ Toast (no alert) */}
{showSavedToast && (
  <div
    style={{
      position: "fixed",
      top: 16,
      left: "50%",
      transform: "translateX(-50%)", // ✅ keep centering always
      background: "#0f172a",
      color: "white",
      padding: "16px 26px",
      borderRadius: 16,
      boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
      fontSize: 17,
      fontWeight: 700,
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      gap: 12,
      border: "1px solid rgba(255,255,255,0.15)",
      minWidth: 320,
      justifyContent: "center",

      animation: "toastSlideDown 0.35s ease-out",
    }}
  >
    <span style={{ fontSize: 22 }}>✅</span>
    <span>Workout saved!</span>

    <style>{`
      @keyframes toastSlideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-12px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `}</style>
  </div>
)}

    </div>
  );
}
