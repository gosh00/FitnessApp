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
import FoodCaloriePage from "./pages/FoodCaloriePage";

import styles from "./App.module.css";

function App() {
  const [page, setPage] = useState("home");
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Keep user in sync with Supabase session
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) console.error("getSession error:", error.message);

      setCurrentUser(data?.session?.user ?? null);
      setLoadingAuth(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      setLoadingAuth(false);
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
    // ако искаш да държиш профилната инфо отделно, това може да стане по-късно
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

  // Not logged in -> show auth only
  if (!currentUser) {
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

        {page === "food" && <FoodCaloriePage currentUser={currentUser} />}
      </main>

      <Footer />
    </div>
  );
}

export default App;
