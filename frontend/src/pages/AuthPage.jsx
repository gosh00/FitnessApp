import React, { useState } from "react";
import styles from "./AuthPage.module.css";
import { supabase } from "../supabaseClient";

const AuthPage = ({ onLogin, setPage }) => {
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    username: "",
    gender: "Female",
    age: "",
    weight: "",
    height: "",
    goal: "Maintain Weight",
  });

  const resetMessages = () => {
    setErrors({});
    setFormError("");
  };

  const goHome = (user) => {
    onLogin?.(user);
    if (typeof setPage === "function") setPage("home");
  };

  const handleLoginChange = (e) => {
    setLoginData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleRegisterChange = (e) => {
    setRegisterData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const validateLogin = () => {
    const newErrors = {};
    const email = loginData.email.trim();

    if (!email) newErrors.email = "Имейлът е задължителен";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Невалиден имейл адрес";

    if (!loginData.password) newErrors.password = "Паролата е задължителна";
    return newErrors;
  };

  const validateRegister = () => {
    const newErrors = {};
    const email = registerData.email.trim();

    if (!email) newErrors.email = "Имейлът е задължителен";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Невалиден имейл адрес";

    if (!registerData.password) newErrors.password = "Паролата е задължителна";
    else if (registerData.password.length < 6)
      newErrors.password = "Паролата трябва да е поне 6 символа";

    if (registerData.password !== registerData.confirmPassword)
      newErrors.confirmPassword = "Паролите не съвпадат";

    if (!registerData.firstName.trim()) newErrors.firstName = "Името е задължително";
    if (!registerData.lastName.trim()) newErrors.lastName = "Фамилията е задължителна";
    if (!registerData.username.trim()) newErrors.username = "Потребителското име е задължително";

    if (!registerData.gender) newErrors.gender = "Полът е задължителен";

    if (!registerData.age) newErrors.age = "Възрастта е задължителна";
    else if (+registerData.age < 13 || +registerData.age > 120)
      newErrors.age = "Възрастта трябва да е между 13 и 120";

    if (!registerData.weight) newErrors.weight = "Теглото е задължително";
    if (!registerData.height) newErrors.height = "Ръстът е задължителен";

    return newErrors;
  };

  // ✅ REGISTER -> signUp + metadata (NO insert into Users here)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    resetMessages();
    setSuccess("");

    const newErrors = validateRegister();
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: registerData.email.trim(),
        password: registerData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: registerData.username.trim(),
            first_name: registerData.firstName.trim(),
            last_name: registerData.lastName.trim(),
            gender: registerData.gender,
            age: Number(registerData.age),
            weight: Number(registerData.weight),
            height: Number(registerData.height),
            goal: registerData.goal,
          },
        },
      });

      if (error) throw error;

      setSuccess("✅ Профилът е създаден! Потвърди имейла си и след това влез в системата.");
      setActiveTab("login");
    } catch (err) {
      setFormError(err?.message || "Регистрацията е неуспешна.");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ LOGIN -> upsert to Users using auth metadata
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    resetMessages();
    setSuccess("");

    const newErrors = validateLogin();
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email.trim(),
        password: loginData.password,
      });
      if (error) throw error;

      // ✅ get "fresh" user with metadata
      const { data: fresh, error: freshErr } = await supabase.auth.getUser();
      if (freshErr) throw freshErr;

      const user = fresh?.user;
      if (!user) throw new Error("Няма върнат потребител от Supabase (getUser).");

      const meta = user.user_metadata || {};

      const payload = {
        auth_id: user.id,
        email: user.email,
        display_name: meta.display_name ?? null,
        first_name: meta.first_name ?? null,
        last_name: meta.last_name ?? null,
        gender: meta.gender ?? null,
        age: meta.age ?? null,
        weight: meta.weight ?? null,
        height: meta.height ?? null,
        goal: meta.goal ?? null,
      };

      const { error: upsertErr } = await supabase
        .from("Users")
        .upsert([payload], { onConflict: "auth_id" });

      if (upsertErr) throw upsertErr;

      setSuccess("✅ Успешен вход!");
      goHome(user);
    } catch (err) {
      const msg = err?.message || "Входът е неуспешен.";
      if (msg.toLowerCase().includes("email not confirmed")) {
        setFormError("Имейлът не е потвърден. Провери пощата си и натисни линка за потвърждение.");
      } else {
        setFormError(msg);
      }
    } finally {
      setSubmitting(false);
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
              Твоят личен фитнес тракер за тренировки, хранене и проследяване на прогреса
            </p>
          </div>

          <div className={styles.features}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📊</div>
              <div className={styles.featureText}>
                <h4>Следи прогреса</h4>
                <p>Записвай тренировките си и виж как се подобряваш с времето</p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>🎯</div>
              <div className={styles.featureText}>
                <h4>Поставяй цели</h4>
                <p>Персонализирай целите си и следи постиженията си</p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📱</div>
              <div className={styles.featureText}>
                <h4>Достъп отвсякъде</h4>
                <p>Достъпвай данните си от всяко устройство, по всяко време</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className={styles.right}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "login" ? styles.tabActive : ""}`}
              onClick={() => {
                setActiveTab("login");
                setSuccess("");
                resetMessages();
              }}
            >
              Вход
            </button>

            <button
              type="button"
              className={`${styles.tab} ${activeTab === "register" ? styles.tabActive : ""}`}
              onClick={() => {
                setActiveTab("register");
                setSuccess("");
                resetMessages();
              }}
            >
              Създай профил
            </button>
          </div>

          {formError && <div className={styles.error}>{formError}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {/* LOGIN */}
          <form
            className={`${styles.form} ${activeTab === "login" ? styles.formActive : ""}`}
            onSubmit={handleLoginSubmit}
          >
            <h2 className={styles.formTitle}>Добре дошъл/дошла отново</h2>

            <div className={styles.formGroup}>
              <label className={styles.label}>Имейл</label>
              <input
                type="email"
                name="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                placeholder="your.email@example.com"
                value={loginData.email}
                onChange={handleLoginChange}
              />
              {errors.email && <span className={styles.error}>{errors.email}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Парола</label>
              <div className={styles.passwordInput}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                  placeholder="Въведи паролата си"
                  value={loginData.password}
                  onChange={handleLoginChange}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Скрий паролата" : "Покажи паролата"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {errors.password && <span className={styles.error}>{errors.password}</span>}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? "Влизане..." : "Вход"}
            </button>

            <div className={styles.formSwitch}>
              Нямаш профил?
              <span className={styles.switchLink} onClick={() => setActiveTab("register")}>
                Регистрирай се
              </span>
            </div>
          </form>

          {/* REGISTER */}
          <form
            className={`${styles.form} ${activeTab === "register" ? styles.formActive : ""}`}
            onSubmit={handleRegisterSubmit}
          >
            <h2 className={styles.formTitle}>Създай профил</h2>

            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>Име</label>
                  <input
                    type="text"
                    name="firstName"
                    className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
                    value={registerData.firstName}
                    onChange={handleRegisterChange}
                    placeholder="Иван"
                  />
                  {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}
                </div>

                <div>
                  <label className={styles.label}>Фамилия</label>
                  <input
                    type="text"
                    name="lastName"
                    className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                    value={registerData.lastName}
                    onChange={handleRegisterChange}
                    placeholder="Иванов"
                  />
                  {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Имейл</label>
              <input
                type="email"
                name="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                value={registerData.email}
                onChange={handleRegisterChange}
                placeholder="your.email@example.com"
              />
              {errors.email && <span className={styles.error}>{errors.email}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Потребителско име</label>
              <input
                type="text"
                name="username"
                className={`${styles.input} ${errors.username ? styles.inputError : ""}`}
                value={registerData.username}
                onChange={handleRegisterChange}
                placeholder="ivanivanov"
              />
              {errors.username && <span className={styles.error}>{errors.username}</span>}
            </div>

            {/* Gender dropdown */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Пол</label>
              <select
                name="gender"
                className={`${styles.select} ${errors.gender ? styles.inputError : ""}`}
                value={registerData.gender}
                onChange={handleRegisterChange}
              >
                <option value="Female">Жена</option>
                <option value="Male">Мъж</option>
                <option value="Other">Друго</option>
                <option value="Prefer not to say">Предпочитам да не споделям</option>
              </select>
              {errors.gender && <span className={styles.error}>{errors.gender}</span>}
            </div>

            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>Парола</label>
                  <div className={styles.passwordInput}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                      value={registerData.password}
                      onChange={handleRegisterChange}
                      placeholder="Създай парола"
                    />
                    <button
                      type="button"
                      className={styles.togglePassword}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Скрий паролата" : "Покажи паролата"}
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {errors.password && <span className={styles.error}>{errors.password}</span>}
                </div>

                <div>
                  <label className={styles.label}>Потвърди парола</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
                    value={registerData.confirmPassword}
                    onChange={handleRegisterChange}
                    placeholder="Повтори паролата"
                  />
                  {errors.confirmPassword && (
                    <span className={styles.error}>{errors.confirmPassword}</span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>Възраст</label>
                  <input
                    type="number"
                    name="age"
                    className={`${styles.input} ${errors.age ? styles.inputError : ""}`}
                    value={registerData.age}
                    onChange={handleRegisterChange}
                    min="13"
                    max="120"
                    placeholder="25"
                  />
                  {errors.age && <span className={styles.error}>{errors.age}</span>}
                </div>

                <div>
                  <label className={styles.label}>Тегло (кг)</label>
                  <input
                    type="number"
                    name="weight"
                    className={`${styles.input} ${errors.weight ? styles.inputError : ""}`}
                    value={registerData.weight}
                    onChange={handleRegisterChange}
                    min="30"
                    max="300"
                    step="0.1"
                    placeholder="70"
                  />
                  {errors.weight && <span className={styles.error}>{errors.weight}</span>}
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>Ръст (см)</label>
                  <input
                    type="number"
                    name="height"
                    className={`${styles.input} ${errors.height ? styles.inputError : ""}`}
                    value={registerData.height}
                    onChange={handleRegisterChange}
                    min="100"
                    max="250"
                    placeholder="175"
                  />
                  {errors.height && <span className={styles.error}>{errors.height}</span>}
                </div>

                <div>
                  <label className={styles.label}>Цел</label>
                  <select
                    name="goal"
                    className={styles.select}
                    value={registerData.goal}
                    onChange={handleRegisterChange}
                  >
                    <option value="Maintain Weight">Поддържане</option>
                    <option value="Gain Weight">Покачване</option>
                    <option value="Weight Loss">Отслабване</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? "Създаване..." : "Създай профил"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;