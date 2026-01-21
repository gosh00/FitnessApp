import { useEffect, useMemo, useState } from "react";
import styles from "./LogWorkoutPage.module.css";
import sharedStyles from "../styles/shared.module.css";
import { supabase } from "../supabaseClient"; // ако е в src/lib -> "../lib/supabaseClient"

export default function LogWorkoutPage() {
  const [exercises, setExercises] = useState([]);
  const [workoutName, setWorkoutName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [exerciseBlocks, setExerciseBlocks] = useState([
    { exercise_id: "", sets: [{ reps: "", weight: "", unit: "kg" }] },
  ]);

  const [saving, setSaving] = useState(false);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [pageError, setPageError] = useState("");

  // keep cached app user id (Users.id)
  const [appUserId, setAppUserId] = useState(null);

  // quick lookup for exercise name by id (for workout json)
  const exById = useMemo(() => {
    const m = new Map();
    for (const ex of exercises) m.set(String(ex.id), ex);
    return m;
  }, [exercises]);

  useEffect(() => {
    let isMounted = true;

    const loadInit = async () => {
      setLoadingExercises(true);
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
          // create if missing
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

        // 3) load exercises from DB
        const { data: exRows, error: exErr } = await supabase
          .from("Exercises")
          .select("id, name, muscle_group")
          .order("name", { ascending: true });

        if (exErr) throw exErr;

        if (!isMounted) return;

        setAppUserId(userRow.id);
        setExercises(exRows ?? []);
      } catch (e) {
        if (!isMounted) return;
        setPageError(e?.message || "Failed to load exercises.");
      } finally {
        if (isMounted) setLoadingExercises(false);
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
      { exercise_id: "", sets: [{ reps: "", weight: "", unit: "kg" }] },
    ]);
  };

  const removeExerciseBlock = (index) => {
    setExerciseBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const changeExerciseId = (index, value) => {
    setExerciseBlocks((prev) =>
      prev.map((block, i) => (i === index ? { ...block, exercise_id: value } : block))
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
              sets: block.sets.map((set, si) => (si === setIndex ? { ...set, [field]: value } : set)),
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
      alert("Please enter a workout name");
      return;
    }

    // Build cleaned structure
    const cleanedExercises = exerciseBlocks
      .filter((b) => b.exercise_id)
      .map((b) => ({
        exercise_id: Number(b.exercise_id),
        exercise_name: exById.get(String(b.exercise_id))?.name ?? "Exercise",
        muscle_group: exById.get(String(b.exercise_id))?.muscle_group ?? null,
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
      alert("Add at least one exercise with one set");
      return;
    }

    setSaving(true);

    try {
      // 1) Insert into Workouts (data jsonb)
      const workoutData = {
        exercises: cleanedExercises,
        createdAt: new Date().toISOString(),
      };

      const { error: wErr } = await supabase
        .from("Workouts")
        .insert({
          user_id: appUserId,
          name: workoutName.trim(),
          data: workoutData,
          is_public: isPublic,
        });

      if (wErr) throw wErr;


      // 2) Insert into ExerciseLog (1 row per set)
      // ExerciseLog has: user_id(uuid), exercise_id(bigint), date(date), sets(int), reps(int), weight(numeric)
      // We'll store each set as 1 row, sets=1
      const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

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

      alert("Workout saved!");

      // reset
      setWorkoutName("");
      setIsPublic(false);
      setExerciseBlocks([{ exercise_id: "", sets: [{ reps: "", weight: "", unit: "kg" }] }]);
    } catch (err) {
      console.error(err);
      setPageError(err?.message || "Error saving workout");
      alert("Error saving workout");
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
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Make this workout public (visible to other users)
        </label>
      </div>

      {loadingExercises && <div className={sharedStyles.loading}>Loading exercises...</div>}

      {exerciseBlocks.map((block, i) => (
        <div key={i} className={styles.exerciseBlock}>
          <div className={styles.exerciseHeader}>
            <select
              value={block.exercise_id}
              onChange={(e) => changeExerciseId(i, e.target.value)}
              className={`${sharedStyles.select} ${styles.exerciseSelect}`}
              disabled={loadingExercises}
            >
              <option value="">-- choose exercise --</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.muscle_group})
                </option>
              ))}
            </select>

            {exerciseBlocks.length > 1 && (
              <button type="button" onClick={() => removeExerciseBlock(i)} className={styles.removeButton}>
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
                  <button type="button" onClick={() => removeSetFromBlock(i, si)} className={styles.removeButton}>
                    Remove
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={() => addSetToBlock(i)} className={styles.addButton}>
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
          disabled={saving || loadingExercises}
          className={sharedStyles.primaryButton}
        >
          {saving ? "Saving..." : "Save workout"}
        </button>
      </div>
    </div>
  );
}
