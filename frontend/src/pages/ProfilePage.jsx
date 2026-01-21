import { useEffect, useState } from "react";
import styles from "./ProfilePage.module.css";
import sharedStyles from "../styles/shared.module.css";
import { supabase } from "../supabaseClient"; // ако е в src/lib -> "../lib/supabaseClient"

const GOAL_OPTIONS = ["Maintain Weight", "Weight loss", "Gain Weight"];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editing, setEditing] = useState(false);

  const [userRow, setUserRow] = useState(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [goal, setGoal] = useState("Maintain Weight");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setPageError("");

      try {
        // 1) auth user
        const { data: authRes, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!authRes?.user) throw new Error("No logged-in user.");

        const authId = authRes.user.id;
        const authEmail = authRes.user.email ?? "";

        // 2) Users row (по auth_id)
        const { data: existing, error: rowErr } = await supabase
          .from("Users")
          .select("id, email, display_name, bio, age, weight, height, goal, auth_id")
          .eq("auth_id", authId)
          .maybeSingle();

        if (rowErr) throw rowErr;

        let row = existing;

        // 3) ако няма запис -> insert
        if (!row) {
          const defaultName = authEmail ? authEmail.split("@")[0] : "User";

          const { data: inserted, error: insErr } = await supabase
            .from("Users")
            .insert({
              auth_id: authId,
              email: authEmail,
              display_name: defaultName,
              goal: "Maintain Weight",
            })
            .select("id, email, display_name, bio, age, weight, height, goal, auth_id")
            .single();

          if (insErr) {
            // ✅ точно за твоето: duplicate email
            const msg = String(insErr.message || "");
            const code = String(insErr.code || "");

            if (msg.includes("users_email_key") || code === "23505") {
              throw new Error(
                "A profile row with this email already exists in the Users table (users_email_key). " +
                  "This usually happens from old test data. " +
                  "Fix: delete the old Users row for this email in Supabase, then refresh the page."
              );
            }

            throw insErr;
          }

          row = inserted;
        }

        if (!isMounted) return;

        setUserRow(row);

        setDisplayName(row.display_name ?? "");
        setBio(row.bio ?? "");
        setAge(row.age ?? "");
        setWeight(row.weight ?? "");
        setHeight(row.height ?? "");
        setGoal(GOAL_OPTIONS.includes(row.goal) ? row.goal : "Maintain Weight");
      } catch (e) {
        if (!isMounted) return;
        setPageError(e?.message || "Failed to load profile.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleEdit = () => setEditing(true);

  // Cancel -> DB стойности
  const handleCancel = () => {
    if (!userRow) return;

    setDisplayName(userRow.display_name ?? "");
    setBio(userRow.bio ?? "");
    setAge(userRow.age ?? "");
    setWeight(userRow.weight ?? "");
    setHeight(userRow.height ?? "");
    setGoal(GOAL_OPTIONS.includes(userRow.goal) ? userRow.goal : "Maintain Weight");

    setEditing(false);
  };

  const handleSave = async () => {
    if (!userRow) return;

    setPageError("");

    const ageNum = age === "" ? null : Number(age);
    const weightNum = weight === "" ? null : Number(weight);
    const heightNum = height === "" ? null : Number(height);

    if (ageNum !== null && (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 120)) {
      setPageError("Age must be between 0 and 120.");
      return;
    }
    if (heightNum !== null && (!Number.isFinite(heightNum) || heightNum < 50 || heightNum > 250)) {
      setPageError("Height must be between 50 and 250 cm.");
      return;
    }
    if (weightNum !== null && (!Number.isFinite(weightNum) || weightNum < 20 || weightNum > 400)) {
      setPageError("Weight must be between 20 and 400 kg.");
      return;
    }
    if (!GOAL_OPTIONS.includes(goal)) {
      setPageError("Invalid goal selected.");
      return;
    }

    try {
      const payload = {
        display_name: displayName.trim(),
        bio: bio.trim(),
        age: ageNum,
        weight: weightNum,
        height: heightNum,
        goal,
      };

      const { data: updated, error: updErr } = await supabase
        .from("Users")
        .update(payload)
        .eq("id", userRow.id)
        .select("id, email, display_name, bio, age, weight, height, goal, auth_id")
        .single();

      if (updErr) throw updErr;

      setUserRow(updated);

      // Sync form with saved DB values
      setDisplayName(updated.display_name ?? "");
      setBio(updated.bio ?? "");
      setAge(updated.age ?? "");
      setWeight(updated.weight ?? "");
      setHeight(updated.height ?? "");
      setGoal(GOAL_OPTIONS.includes(updated.goal) ? updated.goal : "Maintain Weight");

      setEditing(false);
      alert("Profile updated!");
    } catch (e) {
      setPageError(e?.message || "Failed to save profile.");
    }
  };

  if (loading) {
    return (
      <div className={sharedStyles.card}>
        <h2 className={styles.title}>Your Profile</h2>
        <p>Loading…</p>
      </div>
    );
  }

  if (pageError && !userRow) {
    return (
      <div className={sharedStyles.card}>
        <h2 className={styles.title}>Your Profile</h2>
        <p style={{ color: "red" }}>{pageError}</p>
      </div>
    );
  }

  return (
    <div className={sharedStyles.card}>
      <h2 className={styles.title}>Your Profile</h2>

      {pageError && <p style={{ color: "red" }}>{pageError}</p>}

      <div className={styles.profileGrid}>
        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={!editing}
            className={sharedStyles.input}
            style={{ backgroundColor: editing ? "#FFFFFC" : "#f5f5f5" }}
          />
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Email</label>
          <input type="email" value={userRow?.email ?? ""} disabled className={sharedStyles.input} />
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Goal</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={!editing}
            className={sharedStyles.input}
            style={{ backgroundColor: editing ? "#FFFFFC" : "#f5f5f5" }}
          >
            {GOAL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={!editing}
            className={sharedStyles.textarea}
            style={{ backgroundColor: editing ? "#FFFFFC" : "#f5f5f5" }}
            placeholder="Tell us about your fitness journey..."
          />
        </div>

        <div className={styles.statsGrid}>
          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              disabled={!editing}
              className={sharedStyles.input}
              style={{ backgroundColor: editing ? "#FFFFFC" : "#f5f5f5" }}
            />
          </div>

          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              disabled={!editing}
              className={sharedStyles.input}
              style={{ backgroundColor: editing ? "#FFFFFC" : "#f5f5f5" }}
              step="0.1"
            />
          </div>

          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Height (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              disabled={!editing}
              className={sharedStyles.input}
              style={{ backgroundColor: editing ? "#FFFFFC" : "#f5f5f5" }}
            />
          </div>
        </div>

        <div className={styles.buttonGroup}>
          {!editing ? (
            <button onClick={handleEdit} className={sharedStyles.primaryButton}>
              Edit Profile
            </button>
          ) : (
            <>
              <button onClick={handleSave} className={sharedStyles.primaryButton}>
                Save Changes
              </button>
              <button onClick={handleCancel} className={sharedStyles.secondaryButton}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
