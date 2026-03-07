import { useEffect, useMemo, useState } from "react";
import styles from "./ProfilePage.module.css";
import { supabase } from "../supabaseClient";
import api from "../api";

// ✅ DB values (EN) -> UI labels (BG)
const GOAL_OPTIONS = [
  { value: "Maintain Weight", label: "Поддържане на тегло" },
  { value: "Weight loss", label: "Отслабване" },
  { value: "Gain Weight", label: "Покачване на тегло" },
];

// ✅ One default avatar everywhere
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

  // ✅ Change password
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // cache-bust for avatar
  const bust = (url) => {
    if (!url) return "";
    return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  };

  const resolveAvatar = (rowAvatarUrl) => bust(rowAvatarUrl || DEFAULT_AVATAR);

  const goalLabel = useMemo(() => {
    return GOAL_OPTIONS.find((g) => g.value === goal)?.label || "Поддържане на тегло";
  }, [goal]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setPageError("");

      try {
        const { data: authRes, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const authUser = authRes?.user ?? currentUser ?? null;
        if (!authUser) throw new Error("Няма активен потребител.");

        const _authId = authUser.id;
        const email = authUser.email;

        if (!_authId) throw new Error("Липсва идентификатор на потребителя (auth id).");
        if (!email) throw new Error("Липсва имейл на потребителя.");

        if (!isMounted) return;
        setAuthId(_authId);

        // ✅ Ensure Users row exists via backend
        const res = await api.post("/profile/ensure", { auth_id: _authId, email });
        const row = res.data;

        if (!row?.id) throw new Error("Неуспешно зареждане на профила.");

        if (!isMounted) return;

        setUserRow(row);
        setDisplayName(row.display_name ?? "");
        setBio(row.bio ?? "");
        setAge(row.age ?? "");
        setWeight(row.weight ?? "");
        setHeight(row.height ?? "");

        const validGoal =
          GOAL_OPTIONS.some((g) => g.value === row.goal) ? row.goal : "Maintain Weight";
        setGoal(validGoal);

        setAvatarUrl(resolveAvatar(row.avatar_url));
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Възникна грешка при зареждане на профила.";

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

    const validGoal =
      GOAL_OPTIONS.some((g) => g.value === userRow.goal) ? userRow.goal : "Maintain Weight";
    setGoal(validGoal);

    setAvatarUrl(resolveAvatar(userRow.avatar_url));
    setEditing(false);
    setPageError("");
  };

  const validate = () => {
    const ageNum = age === "" ? null : Number(age);
    const weightNum = weight === "" ? null : Number(weight);
    const heightNum = height === "" ? null : Number(height);

    if (ageNum !== null && (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 120)) {
      return "Възрастта трябва да е между 0 и 120.";
    }

    if (heightNum !== null && (!Number.isFinite(heightNum) || heightNum < 50 || heightNum > 250)) {
      return "Ръстът трябва да е между 50 и 250 см.";
    }

    if (weightNum !== null && (!Number.isFinite(weightNum) || weightNum < 20 || weightNum > 400)) {
      return "Теглото трябва да е между 20 и 400 кг.";
    }

    if (!GOAL_OPTIONS.some((g) => g.value === goal)) {
      return "Избраната цел е невалидна.";
    }

    return "";
  };

  const handleSave = async () => {
    if (!userRow) return;

    const v = validate();
    if (v) {
      setPageError(v);
      return;
    }

    setPageError("");

    const ageNum = age === "" ? null : Number(age);
    const weightNum = weight === "" ? null : Number(weight);
    const heightNum = height === "" ? null : Number(height);

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
      if (!updated?.id) throw new Error("Записът на профила не върна данни.");

      setUserRow(updated);
      setDisplayName(updated.display_name ?? "");
      setBio(updated.bio ?? "");
      setAge(updated.age ?? "");
      setWeight(updated.weight ?? "");
      setHeight(updated.height ?? "");

      const validGoal =
        GOAL_OPTIONS.some((g) => g.value === updated.goal) ? updated.goal : "Maintain Weight";
      setGoal(validGoal);

      setAvatarUrl(resolveAvatar(updated.avatar_url));
      setEditing(false);

      // ✅ refresh header instantly
      window.dispatchEvent(new Event("profile_saved"));
      onUpdateProfile?.(currentUser);

      alert("Профилът е обновен успешно!");
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Възникна грешка при запис на профила.";
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
      alert("Моля, избери файл с изображение.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Максималният размер е 5MB.");
      e.target.value = "";
      return;
    }

    if (!userRow?.id || !authId) {
      setPageError("Липсва потребителски идентификатор.");
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

      setAvatarUrl(bust(newUrl));
      setUserRow((prev) => (prev ? { ...prev, avatar_url: newUrl } : prev));

      window.dispatchEvent(new Event("profile_saved"));
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Качването не беше успешно.";
      setPageError(msg);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    const current = pw.current;
    const next = pw.next;
    const confirm = pw.confirm;

    if (!current) return setPwError("Въведи текущата си парола.");
    if (!next || next.length < 6) return setPwError("Новата парола трябва да е поне 6 символа.");
    if (next !== confirm) return setPwError("Новите пароли не съвпадат.");
    if (next === current) return setPwError("Новата парола трябва да е различна от текущата.");

    setPwSaving(true);

    try {
      const { data: authRes, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const email = authRes?.user?.email;
      if (!email) throw new Error("Липсва имейл на потребителя.");

      const { error: reauthErr } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (reauthErr) throw reauthErr;

      const { error: updErr } = await supabase.auth.updateUser({ password: next });
      if (updErr) throw updErr;

      setPwSuccess("✅ Паролата е сменена успешно.");
      setPw({ current: "", next: "", confirm: "" });
    } catch (err) {
      const msg = err?.message || "Грешка при смяна на паролата.";

      if (msg.toLowerCase().includes("invalid login credentials")) {
        setPwError("Текущата парола е грешна.");
      } else {
        setPwError(msg);
      }
    } finally {
      setPwSaving(false);
    }
  };

  const goBack = () => setPage?.("home");

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.topBar}>
            <h2 className={styles.title}>Моят профил</h2>
            <button className={styles.backBtn} onClick={goBack}>
              Назад
            </button>
          </div>
          <div className={styles.card}>
            <div className={styles.loader}>
              <div className={styles.spinner} />
              <p>Зареждане на профила…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pageError && !userRow) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.topBar}>
            <h2 className={styles.title}>Моят профил</h2>
            <button className={styles.backBtn} onClick={goBack}>
              Назад
            </button>
          </div>

          <div className={styles.card}>
            <div className={styles.errorBox}>
              <div className={styles.errorTitle}>Възникна проблем</div>
              <div className={styles.errorText}>{pageError}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <div>
            <h2 className={styles.title}>Моят профил</h2>
            <p className={styles.subtitle}>
              Актуализирай данните си и следи целите си по-лесно.
            </p>
          </div>

          <button className={styles.backBtn} onClick={goBack}>
            Назад
          </button>
        </div>

        <div className={styles.card}>
          {pageError ? (
            <div className={styles.errorInline} role="alert">
              {pageError}
            </div>
          ) : null}

          <div className={styles.avatarRow}>
            <div className={styles.avatarWrap}>
              <img
                src={avatarUrl || DEFAULT_AVATAR}
                alt="Профилна снимка"
                className={styles.avatar}
                onError={(ev) => {
                  ev.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
              <div className={styles.avatarMeta}>
                <div className={styles.displayNameTop}>
                  {displayName?.trim() ? displayName : "Потребител"}
                </div>
                <div className={styles.goalPill} title="Текуща цел">
                  🎯 {goalLabel}
                </div>
              </div>
            </div>

            <label
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{
                cursor: editing && !uploadingAvatar ? "pointer" : "not-allowed",
                opacity: editing && !uploadingAvatar ? 1 : 0.55,
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

          <div className={styles.grid}>
            <div className={styles.field}>
              <label className={styles.label}>Потребителско име</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!editing}
                className={styles.input}
                placeholder="Напр. ViliFit"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Имейл</label>
              <input type="email" value={userRow?.email ?? ""} disabled className={styles.input} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Цел</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={!editing}
                className={styles.input}
              >
                {GOAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldWide}>
              <label className={styles.label}>Кратко описание</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!editing}
                className={styles.textarea}
                placeholder="Опиши накратко своята фитнес цел и мотивация…"
              />
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Възраст</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  disabled={!editing}
                  className={styles.input}
                  placeholder="напр. 25"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Тегло (кг)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={!editing}
                  className={styles.input}
                  step="0.1"
                  placeholder="напр. 70"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Ръст (см)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  disabled={!editing}
                  className={styles.input}
                  placeholder="напр. 175"
                />
              </div>
            </div>

            <div className={styles.actions}>
              {!editing ? (
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleEdit}>
                  Редактирай профил
                </button>
              ) : (
                <>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave}>
                    Запази промените
                  </button>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleCancel}>
                    Откажи
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={styles.sectionDivider} />

          <div className={styles.pwTitle}>Смяна на парола</div>
          <div className={styles.pwSubtitle}>
            За сигурност въведи текущата си парола, след това новата.
          </div>

          {pwError ? (
            <div className={styles.errorInline} role="alert">
              {pwError}
            </div>
          ) : null}

          {pwSuccess ? (
            <div className={styles.successInline} role="status">
              {pwSuccess}
            </div>
          ) : null}

          <form onSubmit={handleChangePassword}>
            <div className={styles.statsGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Текуща парола</label>
                <input
                  type="password"
                  value={pw.current}
                  onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                  className={styles.input}
                  placeholder="Въведи текущата парола"
                  autoComplete="current-password"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Нова парола</label>
                <input
                  type="password"
                  value={pw.next}
                  onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                  className={styles.input}
                  placeholder="Нова парола (мин. 6 символа)"
                  autoComplete="new-password"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Потвърди новата парола</label>
                <input
                  type="password"
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  className={styles.input}
                  placeholder="Повтори новата парола"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                type="submit"
                disabled={pwSaving}
              >
                {pwSaving ? "Запазване..." : "Запази новата парола"}
              </button>

              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                type="button"
                onClick={() => {
                  setPw({ current: "", next: "", confirm: "" });
                  setPwError("");
                  setPwSuccess("");
                }}
                disabled={pwSaving}
              >
                Изчисти
              </button>
            </div>
          </form>

          <div className={styles.note}>
            💡 Съвет: за най-точни калорийни изчисления, поддържай актуални ръст и тегло.
          </div>
        </div>
      </div>
    </div>
  );
}