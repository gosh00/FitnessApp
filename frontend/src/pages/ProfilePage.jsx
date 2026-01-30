import { useEffect, useState } from "react";
import styles from "./ProfilePage.module.css";
import sharedStyles from "../styles/shared.module.css";
import { supabase } from "../supabaseClient";
import api from "../api";

const GOAL_OPTIONS = ["Maintain Weight", "Weight loss", "Gain Weight"];

function fallbackAvatar(authId) {
  return `https://api.dicebear.com/9.x/identicon/svg?seed=${authId || "user"}`;
}

export default function ProfilePage({ currentUser, onUpdateProfile, setPage }) {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [editing, setEditing] = useState(false);

  const [authId, setAuthId] = useState(null);
  const [userRow, setUserRow] = useState(null);

  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
        // 1) Get auth user (prefer Supabase getUser for correctness)
        const { data: authRes, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const authUser = authRes?.user ?? currentUser ?? null;
        if (!authUser) throw new Error("No logged-in user.");

        const _authId = authUser.id;
        const email = authUser.email;

        if (!_authId) throw new Error("Auth user missing id.");
        if (!email) throw new Error("Auth user has no email.");

        if (!isMounted) return;
        setAuthId(_authId);

        // 2) Backend ensures profile row exists (service role)
        const res = await api.post("/profile/ensure", {
          auth_id: _authId,
          email,
        });

        const row = res.data;
        if (!row?.id) throw new Error("Profile ensure did not return a user row.");

        if (!isMounted) return;

        setUserRow(row);

        setDisplayName(row.display_name ?? "");
        setBio(row.bio ?? "");
        setAge(row.age ?? "");
        setWeight(row.weight ?? "");
        setHeight(row.height ?? "");
        setGoal(GOAL_OPTIONS.includes(row.goal) ? row.goal : "Maintain Weight");

        const base = row.avatar_url || fallbackAvatar(_authId);
        setAvatarUrl(`${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`);
      } catch (err) {
        const msg = err?.response?.data?.error || err?.message || "Failed to load profile.";
        if (isMounted) setPageError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleEdit = () => {
    setEditing(true);
    setPageError("");
  };

  const handleCancel = () => {
    if (!userRow) return;

    setDisplayName(userRow.display_name ?? "");
    setBio(userRow.bio ?? "");
    setAge(userRow.age ?? "");
    setWeight(userRow.weight ?? "");
    setHeight(userRow.height ?? "");
    setGoal(GOAL_OPTIONS.includes(userRow.goal) ? userRow.goal : "Maintain Weight");

    const base = userRow.avatar_url || fallbackAvatar(authId);
    setAvatarUrl(`${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`);

    setEditing(false);
    setPageError("");
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
      const res = await api.post("/profile/update", {
        user_id: userRow.id,
        display_name: displayName.trim(),
        bio: bio.trim(),
        age: ageNum,
        weight: weightNum,
        height: heightNum,
        goal,
      });

      const updated = res.data;
      if (!updated?.id) throw new Error("Profile update did not return a row.");

      setUserRow(updated);

      setDisplayName(updated.display_name ?? "");
      setBio(updated.bio ?? "");
      setAge(updated.age ?? "");
      setWeight(updated.weight ?? "");
      setHeight(updated.height ?? "");
      setGoal(GOAL_OPTIONS.includes(updated.goal) ? updated.goal : "Maintain Weight");

      const base = updated.avatar_url || fallbackAvatar(authId);
      setAvatarUrl(`${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`);

      setEditing(false);

      // optional: notify App (not required, but kept)
      onUpdateProfile?.(currentUser);

      alert("Profile updated!");
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Failed to save profile.";
      setPageError(msg);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!editing) {
      alert("Click Edit Profile first.");
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Max file size is 5MB.");
      e.target.value = "";
      return;
    }

    if (!userRow?.id || !authId) {
      setPageError("Missing user id/auth id.");
      e.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    setPageError("");

    try {
      const form = new FormData();
      form.append("avatar", file);
      form.append("auth_id", authId);
      form.append("user_id", userRow.id);

      const res = await api.post("/profile/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newUrl = res.data?.avatar_url;
      if (!newUrl) throw new Error("Backend did not return avatar_url.");

      const busted = `${newUrl}${newUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;

      setAvatarUrl(busted);
      setUserRow((prev) => (prev ? { ...prev, avatar_url: newUrl } : prev)); // keep DB URL clean
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Upload failed";
      setPageError(msg);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className={sharedStyles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className={styles.title}>Your Profile</h2>
          <button className={sharedStyles.secondaryButton} onClick={() => setPage?.("home")}>
            Back
          </button>
        </div>
        <p>Loading…</p>
      </div>
    );
  }

  if (pageError && !userRow) {
    return (
      <div className={sharedStyles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className={styles.title}>Your Profile</h2>
          <button className={sharedStyles.secondaryButton} onClick={() => setPage?.("home")}>
            Back
          </button>
        </div>
        <p style={{ color: "red" }}>{pageError}</p>
      </div>
    );
  }

  return (
    <div className={sharedStyles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className={styles.title}>Your Profile</h2>
        <button className={sharedStyles.secondaryButton} onClick={() => setPage?.("home")}>
          Back
        </button>
      </div>

      {pageError && <p style={{ color: "red" }}>{pageError}</p>}

      {/* AVATAR */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <img
          src={avatarUrl || fallbackAvatar(authId)}
          alt="avatar"
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid #ccc",
            background: "#f5f5f5",
          }}
          onError={(ev) => {
            ev.currentTarget.src = fallbackAvatar(authId);
          }}
        />

        <label
          className={sharedStyles.secondaryButton}
          style={{
            cursor: editing && !uploadingAvatar ? "pointer" : "not-allowed",
            opacity: editing && !uploadingAvatar ? 1 : 0.6,
          }}
        >
          {uploadingAvatar ? "Uploading..." : "Change photo"}
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={!editing || uploadingAvatar}
            onChange={handleAvatarChange}
          />
        </label>
      </div>

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
