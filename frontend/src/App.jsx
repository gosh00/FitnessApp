// src/App.jsx
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import Header from "./components/Header";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";

import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import ExercisesPage from "./pages/ExercisesPage";
import LogWorkoutPage from "./pages/LogWorkoutPage";
import WorkoutsFeedPage from "./pages/WorkoutsFeedPage";
import CaloriePage from "./pages/CaloriePage";
import FoodDiaryPage from "./pages/FoodDiaryPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// ✅ NEW LEGAL/INFO PAGES
import AboutPage from "./pages/AboutPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import CookiesPage from "./pages/CookiesPage";

import styles from "./App.module.css";

function App() {
  const [page, setPage] = useState("home");
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

 useEffect(() => {
  let mounted = true;

  const init = async () => {
    try {
      // ✅ 1) Handle recovery links (type=recovery&code=...)
      const url = new URL(window.location.href);
      const type = url.searchParams.get("type");
      const code = url.searchParams.get("code");

      if (type === "recovery") {
        setPage("reset-password");
      }

      if (code) {
        const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeErr) console.error("exchangeCodeForSession:", exchangeErr.message);

        // ✅ clean URL so refresh doesn't break OTP
        url.searchParams.delete("code");
        url.searchParams.delete("type");
        window.history.replaceState({}, document.title, url.toString());
      }

      // ✅ 2) Load session
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) console.error("getSession error:", error.message);

      setCurrentUser(data?.session?.user ?? null);
      setLoadingAuth(false);
    } catch (e) {
      console.error("init error:", e);
      if (!mounted) return;
      setLoadingAuth(false);
    }
  };

  init();

  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    setCurrentUser(session?.user ?? null);
    setLoadingAuth(false);

    // ✅ legacy flow support
    if (event === "PASSWORD_RECOVERY") {
      setPage("reset-password");
    }
  });

  return () => {
    mounted = false;
    authListener?.subscription?.unsubscribe?.();
  };
}, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("signOut error:", error.message);

    setCurrentUser(null);
    setPage("home");
  };

  const handleUpdateProfile = (updatedUser) => {
    setCurrentUser((prev) => updatedUser ?? prev);
  };

  if (loadingAuth) {
    return (
      <div className={styles.app}>
        <div className={styles.container}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // ✅ ВАЖНО: позволяваме reset-password да се вижда и без currentUser
  if (!currentUser && page !== "reset-password") {
    return (
      <div className={styles.app}>
        <div className={styles.authWrap}>
          <AuthPage
            onLogin={(user) => {
              setCurrentUser(user);
              setPage("home");
            }}
            setPage={setPage}
          />
        </div>
      </div>
    );
  }

  // ✅ Ако сме на reset-password, показваме само тази страница (без header/nav/footer)
  // (можеш да махнеш това и да си го оставиш вътре в layout-а, но така е по-чисто като AuthPage)
  if (page === "reset-password") {
    return (
      <div className={styles.app}>
        <ResetPasswordPage setPage={setPage} />
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <Header setPage={setPage} onLogout={handleLogout} />
      <Navigation page={page} setPage={setPage} />

      <main className={styles.container}>
        {page === "home" && <HomePage currentUser={currentUser} setPage={setPage} />}
        {page === "profile" && (
          <ProfilePage
            currentUser={currentUser}
            onUpdateProfile={handleUpdateProfile}
            setPage={setPage}
          />
        )}
        {page === "exercises" && <ExercisesPage currentUser={currentUser} />}
        {page === "log" && <LogWorkoutPage currentUser={currentUser} />}
        {page === "workouts" && <WorkoutsFeedPage currentUser={currentUser} />}
        {page === "calories" && <CaloriePage currentUser={currentUser} />}
        {page === "food-diary" && <FoodDiaryPage currentUser={currentUser} />}

        {/* ✅ NEW pages from Footer */}
        {page === "about" && <AboutPage setPage={setPage} />}
        {page === "privacy" && <PrivacyPolicyPage setPage={setPage} />}
        {page === "terms" && <TermsPage setPage={setPage} />}
        {page === "cookies" && <CookiesPage setPage={setPage} />}
      </main>

      <Footer setPage={setPage} />
    </div>
  );
}

export default App;