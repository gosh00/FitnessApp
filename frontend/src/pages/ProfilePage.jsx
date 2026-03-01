import { useEffect, useState } from "react";
import styles from "./ProfilePage.module.css";
import sharedStyles from "../styles/shared.module.css";
import { supabase } from "../supabaseClient";
import api from "../api";

const GOAL_OPTIONS = ["Maintain Weight", "Weight loss", "Gain Weight"];

// ✅ One single default avatar everywhere (same as Header fallback)
// Put this file in: /public/default-avatar.png
const DEFAULT_AVATAR = "/default-avatar.png";

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

  const bust = (url) => {
    if (!url) return "";
    return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  };

  // ✅ Avatar resolver:
  // - if DB has avatar_url -> use it
  // - else -> use DEFAULT_AVATAR (same everywhere)
  const resolveAvatar = (rowAvatarUrl) => bust(rowAvatarUrl || DEFAULT_AVATAR);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setPageError("");

      try {
        const { data: authRes, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const authUser = authRes?.user ?? currentUser ?? null;
        if (!authUser) throw new Error("Няма влязъл потребител.");

        const _authId = authUser.id;
        const email = authUser.email;

        if (!_authId) throw new Error("Липсва потребителско id (auth).");
        if (!email) throw new Error("Потребителят няма имейл.");

        if (!isMounted) return;
        setAuthId(_authId);

        // ✅ Ensure Users row exists via backend (service role)
        const res = await api.post("/profile/ensure", { auth_id: _authId, email });
        const row = res.data;
        if (!row?.id) throw new Error("Неуспешно зареждане на профил (липсва user row).");

        if (!isMounted) return;

        setUserRow(row);

        setDisplayName(row.display_name ?? "");
        setBio(row.bio ?? "");
        setAge(row.age ?? "");
        setWeight(row.weight ?? "");
        setHeight(row.height ?? "");
        setGoal(GOAL_OPTIONS.includes(row.goal) ? row.goal : "Maintain Weight");

        setAvatarUrl(resolveAvatar(row.avatar_url));
      } catch (err) {
        const msg =
          err?.response?.data?.error || err?.message || "Неуспешно зареждане на профила.";
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

    setAvatarUrl(resolveAvatar(userRow.avatar_url));

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
      setPageError("Възрастта трябва да е между 0 и 120.");
      return;
    }
    if (heightNum !== null && (!Number.isFinite(heightNum) || heightNum < 50 || heightNum > 250)) {
      setPageError("Ръстът трябва да е между 50 и 250 см.");
      return;
    }
    if (weightNum !== null && (!Number.isFinite(weightNum) || weightNum < 20 || weightNum > 400)) {
      setPageError("Теглото трябва да е между 20 и 400 кг.");
      return;
    }
    if (!GOAL_OPTIONS.includes(goal)) {
      setPageError("Невалидна цел.");
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
      if (!updated?.id) throw new Error("Неуспешно записване на профила.");

      setUserRow(updated);

      setDisplayName(updated.display_name ?? "");
      setBio(updated.bio ?? "");
      setAge(updated.age ?? "");
      setWeight(updated.weight ?? "");
      setHeight(updated.height ?? "");
      setGoal(GOAL_OPTIONS.includes(updated.goal) ? updated.goal : "Maintain Weight");

      setAvatarUrl(resolveAvatar(updated.avatar_url));

      setEditing(false);

      // ✅ refresh header instantly
      window.dispatchEvent(new Event("profile_saved"));

      onUpdateProfile?.(currentUser);

      alert("Профилът е обновен!");
    } catch (err) {
      const msg =
        err?.response?.data?.error || err?.message || "Неуспешно записване на профила.";
      setPageError(msg);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!editing) {
      alert("Първо натисни „Редактирай профил“.");
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Моля, избери изображение.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Максимален размер: 5MB.");
      e.target.value = "";
      return;
    }

    if (!userRow?.id || !authId) {
      setPageError("Липсва user id / auth id.");
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
      if (!newUrl) throw new Error("Сървърът не върна avatar_url.");

      // ✅ show immediately
      setAvatarUrl(bust(newUrl));

      // ✅ keep row in sync
      setUserRow((prev) => (prev ? { ...prev, avatar_url: newUrl } : prev));

      // ✅ refresh header instantly
      window.dispatchEvent(new Event("profile_saved"));
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Неуспешно качване.";
      setPageError(msg);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const goalLabel = (opt) => {
    if (opt === "Maintain Weight") return "Поддържане";
    if (opt === "Weight loss") return "Отслабване";
    if (opt === "Gain Weight") return "Качване";
    return opt;
  };

  if (loading) {
    return (
      <div className={sharedStyles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className={styles.title}>Моят профил</h2>
          <button className={sharedStyles.secondaryButton} onClick={() => setPage?.("home")}>
            Назад
          </button>
        </div>
        <p>Зареждане…</p>
      </div>
    );
  }

  if (pageError && !userRow) {
    return (
      <div className={sharedStyles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className={styles.title}>Моят профил</h2>
          <button className={sharedStyles.secondaryButton} onClick={() => setPage?.("home")}>
            Назад
          </button>
        </div>
        <p style={{ color: "red" }}>{pageError}</p>
      </div>
    );
  }

  return (
    <div className={sharedStyles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className={styles.title}>Моят профил</h2>
        <button className={sharedStyles.secondaryButton} onClick={() => setPage?.("home")}>
          Назад
        </button>
      </div>

      {pageError && <p style={{ color: "red" }}>{pageError}</p>}

      {/* AVATAR */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <img
          src={avatarUrl || DEFAULT_AVATAR}
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
            ev.currentTarget.src = DEFAULT_AVATAR;
          }}
        />

        <label
          className={sharedStyles.secondaryButton}
          style={{
            cursor: editing && !uploadingAvatar ? "pointer" : "not-allowed",
            opacity: editing && !uploadingAvatar ? 1 : 0.6,
          }}
        >
          {uploadingAvatar ? "Качване…" : "Смени снимка"}
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
          <label className={sharedStyles.formLabel}>Показвано име</label>
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
          <label className={sharedStyles.formLabel}>Имейл</label>
          <input type="email" value={userRow?.email ?? ""} disabled className={sharedStyles.input} />
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Цел</label>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={!editing}
            className={sharedStyles.input}
            style={{ backgroundColor: editing ? "#FFFFFC" : "#f5f5f5" }}
          >
            {GOAL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {goalLabel(opt)}
              </option>
            ))}
          </select>
        </div>

        <div className={sharedStyles.formGroup}>
          <label className={sharedStyles.formLabel}>Описание (Bio)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={!editing}
            className={sharedStyles.textarea}
            style={{ backgroundColor: editing ? "#FFFFFC" : "#f5f5f5" }}
            placeholder="Разкажи накратко за целите и пътя си във фитнеса…"
          />
        </div>

        <div className={styles.statsGrid}>
          <div className={sharedStyles.formGroup}>
            <label className={sharedStyles.formLabel}>Възраст</label>
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
            <label className={sharedStyles.formLabel}>Тегло (кг)</label>
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
            <label className={sharedStyles.formLabel}>Ръст (см)</label>
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
              Редактирай профил
            </button>
          ) : (
            <>
              <button onClick={handleSave} className={sharedStyles.primaryButton}>
                Запази промените
              </button>
              <button onClick={handleCancel} className={sharedStyles.secondaryButton}>
                Отказ
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}