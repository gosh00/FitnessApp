import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import styles from "./WorkoutsFeedPage.module.css";

const DEFAULT_AVATAR = "/default-avatar.png";

function fmtDate(ts) {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "сега";
    if (diffMin < 60) return `${diffMin}м`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}ч`;
    return d.toLocaleDateString("bg-BG", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function safeName(user, fallback = "Потребител") {
  return (user?.display_name || "").trim() || fallback;
}

function safeHandle(user) {
  const name = safeName(user, "user");
  return "@" + name.toLowerCase().replace(/\s+/g, "");
}

function parseExercises(workout) {
  const ex = workout?.data?.exercises;
  return Array.isArray(ex) ? ex : [];
}

// SVG icons
const HeartIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default function WorkoutsFeedPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [workouts, setWorkouts] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [likesByMe, setLikesByMe] = useState({});
  const [commentsByWorkout, setCommentsByWorkout] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [selected, setSelected] = useState(null);
  const [viewerRow, setViewerRow] = useState(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const { data: authRes, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const authUser = authRes?.user;
      if (!authUser) throw new Error("Не сте влезли в профила си.");

      const { data: vRow, error: vErr } = await supabase
        .from("Users")
        .select("id, auth_id, display_name, avatar_url")
        .eq("auth_id", authUser.id)
        .maybeSingle();
      if (vErr) throw vErr;
      if (!vRow?.id) throw new Error("Липсва профил в Users за текущия потребител.");
      setViewerRow(vRow);

      const { data: wData, error: wErr } = await supabase
        .from("Workouts")
        .select("id, user_id, name, data, is_public, created_at, likes_count")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (wErr) throw wErr;

      const list = wData || [];
      setWorkouts(list);

      const userIds = Array.from(new Set(list.map((w) => w.user_id).filter(Boolean)));
      if (userIds.length) {
        const { data: uData, error: uErr } = await supabase
          .from("Users")
          .select("id, display_name, avatar_url")
          .in("id", userIds);
        if (uErr) throw uErr;
        const map = {};
        (uData || []).forEach((u) => (map[u.id] = u));
        // include viewer
        map[vRow.id] = vRow;
        setUsersById(map);
      }

      const workoutIds = list.map((w) => w.id);
      if (workoutIds.length) {
        const { data: lData, error: lErr } = await supabase
          .from("WorkoutLikes")
          .select("workout_id")
          .eq("user_id", vRow.id)
          .in("workout_id", workoutIds);
        if (lErr) throw lErr;
        const likedMap = {};
        (lData || []).forEach((r) => (likedMap[r.workout_id] = true));
        setLikesByMe(likedMap);
      }
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Неуспешно зареждане на потока.");
      setWorkouts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const loadComments = useCallback(async (workoutId) => {
    try {
      const { data: cData, error: cErr } = await supabase
        .from("WorkoutComments")
        .select("id, workout_id, user_id, content, created_at")
        .eq("workout_id", workoutId)
        .order("created_at", { ascending: true });
      if (cErr) throw cErr;

      const userIds = Array.from(new Set((cData || []).map((c) => c.user_id).filter(Boolean)));
      if (userIds.length) {
        const { data: uData, error: uErr } = await supabase
          .from("Users")
          .select("id, display_name, avatar_url")
          .in("id", userIds);
        if (uErr) throw uErr;
        setUsersById((prev) => {
          const next = { ...prev };
          (uData || []).forEach((u) => (next[u.id] = u));
          return next;
        });
      }
      setCommentsByWorkout((prev) => ({ ...prev, [workoutId]: cData || [] }));
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Неуспешно зареждане на коментарите.");
    }
  }, []);

  const addComment = useCallback(
    async (workoutId) => {
      const text = (commentInput[workoutId] || "").trim();
      if (!text) return;
      try {
        const { data: authRes } = await supabase.auth.getUser();
        const authUser = authRes?.user;
        if (!authUser) throw new Error("Не сте влезли в профила си.");

        const { data: vRow } = await supabase
          .from("Users")
          .select("id")
          .eq("auth_id", authUser.id)
          .maybeSingle();
        if (!vRow?.id) throw new Error("Липсва профил в Users.");

        const { data: inserted, error: insErr } = await supabase
          .from("WorkoutComments")
          .insert({ workout_id: workoutId, user_id: vRow.id, content: text })
          .select("id, workout_id, user_id, content, created_at")
          .single();
        if (insErr) throw insErr;

        setCommentInput((prev) => ({ ...prev, [workoutId]: "" }));
        setCommentsByWorkout((prev) => ({
          ...prev,
          [workoutId]: [...(prev[workoutId] || []), inserted],
        }));
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Неуспешно добавяне на коментар.");
      }
    },
    [commentInput]
  );

  const toggleLike = useCallback(
    async (workoutId) => {
      const already = !!likesByMe[workoutId];
      setLikesByMe((prev) => ({ ...prev, [workoutId]: !prev[workoutId] }));
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id !== workoutId
            ? w
            : {
                ...w,
                likes_count: Math.max(0, (w.likes_count || 0) + (already ? -1 : 1)),
              }
        )
      );
      try {
        const { data: authRes } = await supabase.auth.getUser();
        const authUser = authRes?.user;
        if (!authUser) throw new Error("Не сте влезли в профила си.");
        const { data: vRow } = await supabase
          .from("Users")
          .select("id")
          .eq("auth_id", authUser.id)
          .maybeSingle();
        if (!vRow?.id) throw new Error("Липсва профил в Users.");

        if (already) {
          await supabase.from("WorkoutLikes").delete().eq("workout_id", workoutId).eq("user_id", vRow.id);
        } else {
          await supabase.from("WorkoutLikes").insert({ workout_id: workoutId, user_id: vRow.id });
        }
      } catch (e) {
        console.error(e);
        await loadFeed();
      }
    },
    [likesByMe, loadFeed]
  );

  return (
    <div className={styles["x-root"]}>
      <div className={styles["x-feed-container"]}>
        {/* HEADER */}
        <div className={styles["x-sticky-header"]}>
          <div>
            <div className={styles["x-header-title"]}>🏋️ FitFeed</div>
            <div className={styles["x-header-sub"]}>Открий тренировки от общността</div>
          </div>
          <button className={styles["x-refresh-btn"]} onClick={loadFeed} disabled={loading}>
            {loading ? "Зареждане…" : "Обнови"}
          </button>
        </div>

        {err && <div className={styles["x-error"]}>{err}</div>}

        {loading && (
          <div className={styles["x-loading"]}>
            <div className={styles["x-spinner"]} />
            Зареждане на потока…
          </div>
        )}

        {!loading && workouts.length === 0 && (
          <div className={styles["x-empty"]}>Все още няма публични тренировки. Бъди първият/първата! 💪</div>
        )}

        {/* POSTS */}
        {workouts.map((w, i) => {
          const author = usersById[w.user_id];
          const authorName = safeName(author, "Потребител");
          const handle = safeHandle(author);
          const avatar = author?.avatar_url || DEFAULT_AVATAR;
          const liked = !!likesByMe[w.id];
          const exercises = parseExercises(w);
          const commentsOpen = !!commentsByWorkout[w.id];

          return (
            <article key={w.id} className={styles["x-post"]} style={{ animationDelay: `${i * 0.04}s` }}>
              {/* Avatar column */}
              <div className={styles["x-avatar-col"]}>
                <img
                  src={avatar}
                  alt="avatar"
                  className={styles["x-avatar"]}
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
              </div>

              {/* Body */}
              <div className={styles["x-post-body"]}>
                {/* Top line */}
                <div className={styles["x-post-top"]}>
                  <span className={styles["x-author-name"]}>{authorName}</span>
                  <span className={styles["x-handle"]}>{handle}</span>
                  <span className={styles["x-dot"]}>·</span>
                  <span className={styles["x-time"]}>{fmtDate(w.created_at)}</span>
                </div>

                {/* Workout card */}
                <div className={styles["x-workout-card"]}>
                  <div className={styles["x-workout-header"]}>
                    <div className={styles["x-workout-icon"]}>🏋️</div>
                    <div>
                      <div className={styles["x-workout-name"]}>{w.name || "Тренировка"}</div>
                    </div>
                    <div className={styles["x-workout-badge"]}>Публична</div>
                  </div>

                  <div className={styles["x-workout-stats"]}>
                    <div className={styles["x-stat"]}>
                      <strong>{exercises.length}</strong> упражнения
                    </div>
                    {exercises.length > 0 && (
                      <div className={styles["x-stat"]}>
                        <strong>
                          {exercises.reduce((s, ex) => s + (Array.isArray(ex.sets) ? ex.sets.length : 0), 0)}
                        </strong>{" "}
                        серии
                      </div>
                    )}
                  </div>

                  <button className={styles["x-view-btn"]} onClick={() => setSelected(w)}>
                    Виж детайлите →
                  </button>
                </div>

                {/* Actions */}
                <div className={styles["x-actions"]}>
                  <button
                    className={`${styles["x-action-btn"]} ${styles["x-btn-like"]} ${liked ? styles["x-liked"] : ""}`}
                    onClick={() => toggleLike(w.id)}
                    title={liked ? "Премахни харесване" : "Харесай"}
                  >
                    <HeartIcon filled={liked} />
                    <span>{w.likes_count ?? 0}</span>
                  </button>

                  <button
                    className={`${styles["x-action-btn"]} ${styles["x-btn-comment"]}`}
                    onClick={() => (commentsOpen ? null : loadComments(w.id))}
                    title="Коментари"
                  >
                    <CommentIcon />
                    <span>{(commentsByWorkout[w.id] || []).length}</span>
                  </button>
                </div>

                {/* Comments section */}
                {commentsOpen && (
                  <div className={styles["x-comments-section"]}>
                    {(commentsByWorkout[w.id] || []).map((c) => {
                      const cu = usersById[c.user_id];
                      const cname = safeName(cu, "Потребител");
                      const cav = cu?.avatar_url || DEFAULT_AVATAR;
                      return (
                        <div key={c.id} className={styles["x-comment"]}>
                          <img
                            src={cav}
                            alt="avatar"
                            className={styles["x-comment-avatar"]}
                            onError={(e) => {
                              e.currentTarget.src = DEFAULT_AVATAR;
                            }}
                          />
                          <div className={styles["x-comment-body"]}>
                            <div className={styles["x-comment-top"]}>
                              <span className={styles["x-comment-author"]}>{cname}</span>
                              <span className={styles["x-dot"]}>·</span>
                              <span className={styles["x-comment-time"]}>{fmtDate(c.created_at)}</span>
                            </div>
                            <div className={styles["x-comment-text"]}>{c.content}</div>
                          </div>
                        </div>
                      );
                    })}

                    <div className={styles["x-composer"]}>
                      <img
                        src={viewerRow?.avatar_url || DEFAULT_AVATAR}
                        alt="you"
                        className={styles["x-composer-avatar"]}
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_AVATAR;
                        }}
                      />
                      <input
                        className={styles["x-comment-input"]}
                        placeholder="Напиши отговор…"
                        value={commentInput[w.id] || ""}
                        onChange={(e) => setCommentInput((prev) => ({ ...prev, [w.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addComment(w.id);
                        }}
                      />
                      <button className={styles["x-send-btn"]} onClick={() => addComment(w.id)}>
                        Отговори
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* MODAL */}
      {selected && (
        <div className={styles["x-modal-overlay"]} onClick={() => setSelected(null)}>
          <div className={styles["x-modal-card"]} onClick={(e) => e.stopPropagation()}>
            <div className={styles["x-modal-header"]}>
              <div>
                <div className={styles["x-modal-title"]}>{selected.name || "Тренировка"}</div>
                <div className={styles["x-modal-sub"]}>
                  {fmtDate(selected.created_at)} · {parseExercises(selected).length} упражнения
                </div>
              </div>
              <button className={styles["x-close-btn"]} onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>

            <div className={styles["x-modal-body"]}>
              {parseExercises(selected).length === 0 ? (
                <div style={{ color: "#71767b", fontSize: 14, padding: "8px 0" }}>
                  Няма записани упражнения.
                </div>
              ) : (
                parseExercises(selected).map((ex, i) => (
                  <div key={i} className={styles["x-exercise-row"]}>
                    <div className={styles["x-ex-num"]}>{i + 1}</div>
                    <div className={styles["x-ex-name"]}>{ex.name || `Упражнение ${i + 1}`}</div>
                    <div className={styles["x-ex-sets"]}>
                      {Array.isArray(ex.sets) ? ex.sets.length : 0} серии
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={styles["x-modal-footer"]}>
              <button className={styles["x-modal-close-big"]} onClick={() => setSelected(null)}>
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}