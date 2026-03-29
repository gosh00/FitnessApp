import { useEffect, useMemo, useState } from "react";
import styles from "./AdminDashboardPage.module.css";
import { supabase } from "../supabaseClient";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_BASE = RAW_API_URL.endsWith("/api") ? RAW_API_URL : `${RAW_API_URL}/api`;

const emptyExerciseForm = {
  id: null,
  name: "",
  muscle_group: "",
  description: "",
  image_url: "",
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("bg-BG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getDisplayName(user) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return user.display_name || fullName || "Без име";
}

function sortExercisesByName(items) {
  return [...items].sort((a, b) => (a.name || "").localeCompare(b.name || "", "bg"));
}

function StatCard({ label, value }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

export default function AdminDashboardPage({ setPage }) {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalExercises: 0,
    totalLogs: 0,
  });

  const [users, setUsers] = useState([]);
  const [exercises, setExercises] = useState([]);

  const [userQuery, setUserQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [exerciseQuery, setExerciseQuery] = useState("");

  const [exerciseForm, setExerciseForm] = useState(emptyExerciseForm);

  const [savingRoleId, setSavingRoleId] = useState(null);
  const [savingExercise, setSavingExercise] = useState(false);
  const [deletingExerciseId, setDeletingExerciseId] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const displayName = getDisplayName(user).toLowerCase();
      const email = (user.email || "").toLowerCase();
      const query = userQuery.trim().toLowerCase();

      const matchesSearch = !query || displayName.includes(query) || email.includes(query);
      const matchesRole = roleFilter === "all" || (user.role || "user") === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, userQuery, roleFilter]);

  const filteredExercises = useMemo(() => {
    const query = exerciseQuery.trim().toLowerCase();

    return exercises.filter((exercise) => {
      const haystack = [exercise.name, exercise.muscle_group, exercise.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [exercises, exerciseQuery]);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data?.session?.access_token) {
      throw new Error("Липсва активна потребителска сесия.");
    }

    return data.session.access_token;
  }

  async function request(path, options = {}) {
    const token = await getAccessToken();

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || "Възникна грешка.");
      error.status = response.status;
      throw error;
    }

    return data;
  }

  async function loadAllData() {
    try {
      setLoading(true);
      setErrorMessage("");
      setAccessDenied(false);

      const [overviewData, usersData, exercisesData] = await Promise.all([
        request("/admin/overview"),
        request("/admin/users"),
        request("/admin/exercises"),
      ]);

      setOverview({
        totalUsers: overviewData.totalUsers || 0,
        totalAdmins: overviewData.totalAdmins || 0,
        totalExercises: overviewData.totalExercises || 0,
        totalLogs: overviewData.totalLogs || 0,
      });

      setUsers(usersData.users || []);
      setExercises(sortExercisesByName(exercisesData.exercises || []));
    } catch (error) {
      if (error.status === 403) {
        setAccessDenied(true);
      } else {
        setErrorMessage(error.message || "Неуспешно зареждане на админ панела.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId, nextRole) {
    try {
      setSavingRoleId(userId);
      setErrorMessage("");

      const result = await request(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });

      setUsers((prev) => {
        const updatedUsers = prev.map((user) => (user.id === userId ? result.user : user));
        const totalAdmins = updatedUsers.filter((u) => u.role === "admin").length;

        setOverview((old) => ({
          ...old,
          totalAdmins,
        }));

        return updatedUsers;
      });

      setSuccessMessage("Ролята е обновена успешно.");
    } catch (error) {
      setErrorMessage(error.message || "Неуспешна промяна на роля.");
    } finally {
      setSavingRoleId(null);
    }
  }

  function startCreateExercise() {
    setExerciseForm(emptyExerciseForm);
    setActiveTab("exercises");
    setSuccessMessage("");
    setErrorMessage("");
  }

  function startEditExercise(exercise) {
    setExerciseForm({
      id: exercise.id,
      name: exercise.name || "",
      muscle_group: exercise.muscle_group || "",
      description: exercise.description || "",
      image_url: exercise.image_url || "",
    });

    setActiveTab("exercises");
    setSuccessMessage("");
    setErrorMessage("");
  }

  async function handleExerciseSubmit(e) {
    e.preventDefault();

    if (!exerciseForm.name.trim()) {
      setErrorMessage("Името на упражнението е задължително.");
      return;
    }

    try {
      setSavingExercise(true);
      setErrorMessage("");

      const isEdit = Boolean(exerciseForm.id);

      const result = await request(
        isEdit ? `/admin/exercises/${exerciseForm.id}` : "/admin/exercises",
        {
          method: isEdit ? "PUT" : "POST",
          body: JSON.stringify({
            name: exerciseForm.name,
            muscle_group: exerciseForm.muscle_group,
            description: exerciseForm.description,
            image_url: exerciseForm.image_url,
          }),
        }
      );

      const savedExercise = result.exercise;

      if (isEdit) {
        setExercises((prev) =>
          sortExercisesByName(prev.map((item) => (item.id === savedExercise.id ? savedExercise : item)))
        );
        setSuccessMessage("Упражнението е редактирано успешно.");
      } else {
        setExercises((prev) => sortExercisesByName([savedExercise, ...prev]));
        setOverview((prev) => ({
          ...prev,
          totalExercises: (prev.totalExercises || 0) + 1,
        }));
        setSuccessMessage("Упражнението е добавено успешно.");
      }

      setExerciseForm({
        id: savedExercise.id,
        name: savedExercise.name || "",
        muscle_group: savedExercise.muscle_group || "",
        description: savedExercise.description || "",
        image_url: savedExercise.image_url || "",
      });
    } catch (error) {
      setErrorMessage(error.message || "Неуспешно записване на упражнение.");
    } finally {
      setSavingExercise(false);
    }
  }

  async function handleDeleteExercise(id) {
    const confirmed = window.confirm("Сигурна ли си, че искаш да изтриеш това упражнение?");
    if (!confirmed) return;

    try {
      setDeletingExerciseId(id);
      setErrorMessage("");

      await request(`/admin/exercises/${id}`, {
        method: "DELETE",
      });

      setExercises((prev) => prev.filter((item) => item.id !== id));
      setOverview((prev) => ({
        ...prev,
        totalExercises: Math.max((prev.totalExercises || 1) - 1, 0),
      }));

      if (exerciseForm.id === id) {
        setExerciseForm(emptyExerciseForm);
      }

      setSuccessMessage("Упражнението е изтрито успешно.");
    } catch (error) {
      setErrorMessage(error.message || "Неуспешно изтриване на упражнение.");
    } finally {
      setDeletingExerciseId(null);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingCard}>Зареждане на администраторския панел...</div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className={styles.page}>
        <div className={styles.accessCard}>
          <h1 className={styles.title}>Нямаш достъп</h1>
          <p className={styles.subtitle}>
            Тази страница е достъпна само за потребители с роля <strong>admin</strong>.
          </p>

          <button className={styles.primaryButton} onClick={() => setPage?.("home")}>
            Към началната страница
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <span className={styles.kicker}>Trainify • Администрация</span>
          <h1 className={styles.title}>Администраторски панел</h1>
          <p className={styles.subtitle}>
            Централизирано управление на потребители, роли и упражнения.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button className={styles.secondaryButton} onClick={loadAllData}>
            Обнови данните
          </button>
          <button className={styles.primaryButton} onClick={startCreateExercise}>
            + Ново упражнение
          </button>
        </div>
      </div>

      {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}
      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}

      <div className={styles.statsGrid}>
        <StatCard label="Общо потребители" value={overview.totalUsers} />
        <StatCard label="Администратори" value={overview.totalAdmins} />
        <StatCard label="Упражнения" value={overview.totalExercises} />
        <StatCard label="Тренировъчни записи" value={overview.totalLogs} />
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "users" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Потребители
        </button>

        <button
          className={`${styles.tab} ${activeTab === "exercises" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("exercises")}
        >
          Упражнения
        </button>
      </div>

      {activeTab === "users" ? (
        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <input
              type="text"
              className={styles.input}
              placeholder="Търси по име или имейл..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />

            <select
              className={styles.select}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Всички роли</option>
              <option value="user">Само user</option>
              <option value="admin">Само admin</option>
            </select>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Име</th>
                  <th>Имейл</th>
                  <th>Роля</th>
                  <th>Регистрация</th>
                  <th>Действие</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.emptyCell}>
                      Няма намерени потребители.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className={styles.userName}>{getDisplayName(user)}</div>
                      </td>
                      <td>{user.email || "—"}</td>
                      <td>
                        <span
                          className={`${styles.roleBadge} ${
                            user.role === "admin" ? styles.roleAdmin : styles.roleUser
                          }`}
                        >
                          {user.role || "user"}
                        </span>
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <select
                          className={styles.selectSmall}
                          value={user.role || "user"}
                          disabled={savingRoleId === user.id}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className={styles.exerciseSection}>
          <div className={styles.exerciseListPanel}>
            <div className={styles.toolbar}>
              <input
                type="text"
                className={styles.input}
                placeholder="Търси упражнение..."
                value={exerciseQuery}
                onChange={(e) => setExerciseQuery(e.target.value)}
              />

              <button className={styles.secondaryButton} onClick={startCreateExercise}>
                Нов запис
              </button>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Упражнение</th>
                    <th>Мускулна група</th>
                    <th>Действия</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExercises.length === 0 ? (
                    <tr>
                      <td colSpan="3" className={styles.emptyCell}>
                        Няма намерени упражнения.
                      </td>
                    </tr>
                  ) : (
                    filteredExercises.map((exercise) => (
                      <tr key={exercise.id}>
                        <td>{exercise.name}</td>
                        <td>{exercise.muscle_group || "—"}</td>
                        <td className={styles.actionsCell}>
                          <button
                            className={styles.rowButton}
                            onClick={() => startEditExercise(exercise)}
                          >
                            Редакция
                          </button>

                          <button
                            className={styles.rowButtonDanger}
                            disabled={deletingExerciseId === exercise.id}
                            onClick={() => handleDeleteExercise(exercise.id)}
                          >
                            Изтрий
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.formPanel}>
            <h2 className={styles.formTitle}>
              {exerciseForm.id ? "Редакция на упражнение" : "Добавяне на упражнение"}
            </h2>

            <form className={styles.form} onSubmit={handleExerciseSubmit}>
              <div className={styles.field}>
                <label>Име на упражнение</label>
                <input
                  type="text"
                  className={styles.input}
                  value={exerciseForm.name}
                  onChange={(e) =>
                    setExerciseForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Например: Лег преса"
                />
              </div>

              <div className={styles.field}>
                <label>Мускулна група</label>
                <input
                  type="text"
                  className={styles.input}
                  value={exerciseForm.muscle_group}
                  onChange={(e) =>
                    setExerciseForm((prev) => ({
                      ...prev,
                      muscle_group: e.target.value,
                    }))
                  }
                  placeholder="Например: Крака"
                />
              </div>

              <div className={styles.field}>
                <label>Описание</label>
                <textarea
                  className={styles.textarea}
                  rows="5"
                  value={exerciseForm.description}
                  onChange={(e) =>
                    setExerciseForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Кратко описание на изпълнението..."
                />
              </div>

              <div className={styles.field}>
                <label>URL на изображение</label>
                <input
                  type="text"
                  className={styles.input}
                  value={exerciseForm.image_url}
                  onChange={(e) =>
                    setExerciseForm((prev) => ({
                      ...prev,
                      image_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
              </div>

              {exerciseForm.image_url ? (
                <div className={styles.previewWrap}>
                  <img
                    src={exerciseForm.image_url}
                    alt="Преглед"
                    className={styles.previewImage}
                  />
                </div>
              ) : null}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setExerciseForm(emptyExerciseForm)}
                >
                  Изчисти
                </button>

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={savingExercise}
                >
                  {savingExercise
                    ? "Записване..."
                    : exerciseForm.id
                    ? "Запази промените"
                    : "Добави упражнение"}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}