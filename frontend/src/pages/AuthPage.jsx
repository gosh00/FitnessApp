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
    gender: "Female", // ✅ NEW
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

    if (!email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Email is invalid";

    if (!loginData.password) newErrors.password = "Password is required";
    return newErrors;
  };

  const validateRegister = () => {
    const newErrors = {};
    const email = registerData.email.trim();

    if (!email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Email is invalid";

    if (!registerData.password) newErrors.password = "Password is required";
    else if (registerData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    if (registerData.password !== registerData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    if (!registerData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!registerData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!registerData.username.trim()) newErrors.username = "Username is required";

    if (!registerData.gender) newErrors.gender = "Gender is required"; // ✅ NEW

    if (!registerData.age) newErrors.age = "Age is required";
    else if (+registerData.age < 13 || +registerData.age > 120)
      newErrors.age = "Age must be between 13 and 120";

    if (!registerData.weight) newErrors.weight = "Weight is required";
    if (!registerData.height) newErrors.height = "Height is required";

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
            gender: registerData.gender, // ✅ NEW
            age: Number(registerData.age),
            weight: Number(registerData.weight),
            height: Number(registerData.height),
            goal: registerData.goal,
          },
        },
      });

      if (error) throw error;

      setSuccess("✅ Account created! Please confirm your email, then Sign In.");
      setActiveTab("login");
    } catch (err) {
      setFormError(err?.message || "Registration failed.");
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
      if (!user) throw new Error("No user returned from Supabase (getUser).");

      const meta = user.user_metadata || {};

      const payload = {
        auth_id: user.id,
        email: user.email,
        display_name: meta.display_name ?? null,
        first_name: meta.first_name ?? null,
        last_name: meta.last_name ?? null,
        gender: meta.gender ?? null, // ✅ NEW
        age: meta.age ?? null,
        weight: meta.weight ?? null,
        height: meta.height ?? null,
        goal: meta.goal ?? null,
      };

      const { error: upsertErr } = await supabase
        .from("Users")
        .upsert([payload], { onConflict: "auth_id" });

      if (upsertErr) throw upsertErr;

      setSuccess("✅ Logged in!");
      goHome(user);
    } catch (err) {
      const msg = err?.message || "Login failed.";
      if (msg.toLowerCase().includes("email not confirmed")) {
        setFormError("Имейлът не е потвърден. Отвори пощата и натисни Confirm линка.");
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
            <h1 className={styles.logo}>FitnessPro</h1>
            <p className={styles.tagline}>Transform your fitness journey with AI-powered tracking</p>
          </div>

          <div className={styles.features}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📊</div>
              <div className={styles.featureText}>
                <h4>Track Progress</h4>
                <p>Monitor your workouts and see your improvements over time</p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>🎯</div>
              <div className={styles.featureText}>
                <h4>Set Goals</h4>
                <p>Customize your fitness objectives and track your achievements</p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📱</div>
              <div className={styles.featureText}>
                <h4>Anywhere Access</h4>
                <p>Access your fitness data from any device, anytime</p>
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
              Sign In
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
              Create Account
            </button>
          </div>

          {formError && <div className={styles.error}>{formError}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {/* LOGIN */}
          <form
            className={`${styles.form} ${activeTab === "login" ? styles.formActive : ""}`}
            onSubmit={handleLoginSubmit}
          >
            <h2 className={styles.formTitle}>Welcome Back</h2>

            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
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
              <label className={styles.label}>Password</label>
              <div className={styles.passwordInput}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                  placeholder="Enter your password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {errors.password && <span className={styles.error}>{errors.password}</span>}
            </div>

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </button>

            <div className={styles.formSwitch}>
              Don&apos;t have an account?
              <span className={styles.switchLink} onClick={() => setActiveTab("register")}>
                Sign up here
              </span>
            </div>
          </form>

          {/* REGISTER */}
          <form
            className={`${styles.form} ${activeTab === "register" ? styles.formActive : ""}`}
            onSubmit={handleRegisterSubmit}
          >
            <h2 className={styles.formTitle}>Create Account</h2>

            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
                    value={registerData.firstName}
                    onChange={handleRegisterChange}
                    placeholder="John"
                  />
                  {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}
                </div>

                <div>
                  <label className={styles.label}>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                    value={registerData.lastName}
                    onChange={handleRegisterChange}
                    placeholder="Doe"
                  />
                  {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
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
              <label className={styles.label}>Username</label>
              <input
                type="text"
                name="username"
                className={`${styles.input} ${errors.username ? styles.inputError : ""}`}
                value={registerData.username}
                onChange={handleRegisterChange}
                placeholder="johndoe123"
              />
              {errors.username && <span className={styles.error}>{errors.username}</span>}
            </div>

            {/* ✅ NEW: Gender dropdown */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Gender</label>
              <select
                name="gender"
                className={`${styles.select} ${errors.gender ? styles.inputError : ""}`}
                value={registerData.gender}
                onChange={handleRegisterChange}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {errors.gender && <span className={styles.error}>{errors.gender}</span>}
            </div>

            <div className={styles.formGroup}>
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>Password</label>
                  <div className={styles.passwordInput}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                      value={registerData.password}
                      onChange={handleRegisterChange}
                      placeholder="Create password"
                    />
                    <button
                      type="button"
                      className={styles.togglePassword}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {errors.password && <span className={styles.error}>{errors.password}</span>}
                </div>

                <div>
                  <label className={styles.label}>Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
                    value={registerData.confirmPassword}
                    onChange={handleRegisterChange}
                    placeholder="Confirm password"
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
                  <label className={styles.label}>Age</label>
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
                  <label className={styles.label}>Weight (kg)</label>
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
                  <label className={styles.label}>Height (cm)</label>
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
                  <label className={styles.label}>Goal</label>
                  <select
                    name="goal"
                    className={styles.select}
                    value={registerData.goal}
                    onChange={handleRegisterChange}
                  >
                    <option value="Maintain Weight">Maintain Weight</option>
                    <option value="Gain Weight">Gain Weight</option>
                    <option value="Weight Loss">Weight Loss</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? "Creating..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
