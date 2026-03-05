import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import styles from "./ResetPasswordPage.module.css";

export default function ResetPasswordPage({ setPage }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);

  // ✅ verify recovery session exists
  useEffect(() => {
    let mounted = true;

    const check = async () => {
      setChecking(true);
      setError("");

      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setError("Възникна проблем при проверка на сесията. Опитай отново.");
        setChecking(false);
        return;
      }

      // ако няма session -> няма как да сменим парола
      if (!data?.session) {
        setError(
          "Линкът за смяна на парола е невалиден или е изтекъл. Моля, заяви нов линк от „Забравена парола“."
        );
      }

      setChecking(false);
    };

    check();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || password.length < 6) {
      setError("Паролата трябва да е поне 6 символа.");
      return;
    }

    if (password !== confirm) {
      setError("Паролите не съвпадат.");
      return;
    }

    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        throw new Error(
          "Няма активна recovery сесия. Заяви нов линк за смяна на парола."
        );
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess("✅ Паролата е сменена успешно. Влез отново с новата парола.");

      await supabase.auth.signOut();
      if (typeof setPage === "function") setPage("home");
    } catch (err) {
      const msg = (err?.message || "").toLowerCase();

      if (msg.includes("otp_expired") || msg.includes("link is invalid") || msg.includes("expired")) {
        setError("Линкът е изтекъл/невалиден. Заяви нов линк от „Забравена парола“.");
      } else {
        setError(err?.message || "Неуспешна смяна на паролата.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* LEFT */}
        <div className={styles.left}>
          <div className={styles.brand}>
            <h1 className={styles.logo}>
              Trainify<span className={styles.logoDot}></span>
            </h1>
            <p className={styles.tagline}>
              Сигурна смяна на парола — за да запазиш профила и прогреса си.
            </p>
          </div>

          <div className={styles.features}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>🔐</div>
              <div className={styles.featureText}>
                <h4>Защитен процес</h4>
                <p>Смяната става само през линк, изпратен на твоя имейл.</p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>⚡</div>
              <div className={styles.featureText}>
                <h4>Бързо и лесно</h4>
                <p>Избери нова парола и продължи с тренировките си.</p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📈</div>
              <div className={styles.featureText}>
                <h4>Пази прогреса</h4>
                <p>Всички твои записи остават сигурно запазени.</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className={styles.right}>
          <h2 className={styles.title}>Смяна на парола</h2>
          <p className={styles.subtitle}>
            Въведи новата си парола и я потвърди. Минимум 6 символа.
          </p>

          {checking ? (
            <div className={styles.successBox}>Проверка на линка…</div>
          ) : null}

          {error ? <div className={styles.errorBox}>{error}</div> : null}
          {success ? <div className={styles.successBox}>{success}</div> : null}

          <form className={styles.form} onSubmit={handleSave}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Нова парола</label>
              <input
                className={styles.input}
                type="password"
                placeholder="Въведи нова парола"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={checking || !!error}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Потвърди новата парола</label>
              <input
                className={styles.input}
                type="password"
                placeholder="Повтори новата парола"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={checking || !!error}
              />
              <div className={styles.hint}>
                Съвет: комбинирай букви и цифри, за да е по-сигурна.
              </div>
            </div>

            <button
              className={styles.submitBtn}
              type="submit"
              disabled={saving || checking || !!error}
            >
              {saving ? "Запазване..." : "Запази новата парола"}
            </button>

            <div className={styles.backRow}>
              Искаш да се върнеш?
              <span
                className={styles.backLink}
                onClick={() => typeof setPage === "function" && setPage("home")}
              >
                Начало
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}