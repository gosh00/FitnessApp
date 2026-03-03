import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

// Minimal inline styles (за да работи веднага без CSS)
const ui = {
  wrap: { position: "relative", width: "100%" },
  row: { display: "flex", gap: 8, alignItems: "center" },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cfd4dc",
    borderRadius: 10,
    outline: "none",
  },
  select: {
    minWidth: 180,
    padding: "10px 12px",
    border: "1px solid #cfd4dc",
    borderRadius: 10,
    outline: "none",
    background: "white",
  },
  dropdown: {
    position: "absolute",
    zIndex: 50,
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    background: "white",
    border: "1px solid #ddd",
    borderRadius: 12,
    maxHeight: 320,
    overflow: "auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  },
  header: {
    padding: 10,
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
  },
  closeBtn: {
    border: "1px solid #ddd",
    background: "white",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
  },
  itemBtn: {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px 12px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
  },
  itemName: { fontWeight: 600 },
  itemMeta: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  error: { color: "red", marginTop: 6, fontSize: 13 },
  hint: { padding: 12, opacity: 0.7 },
  section: { padding: 10 },
  sectionTitle: { fontSize: 12, opacity: 0.7, marginBottom: 8 },
};

export default function ExercisePicker({
  valueExercise = null,        // object: {id, name, muscle_group} или null
  onPickExercise,       // (exObj) => void
  disabled,
  muscleOptions = [],
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(valueExercise?.name || "");
  const [muscle, setMuscle] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pickerError, setPickerError] = useState("");

  const debouncedQuery = useDebouncedValue(query, 250);

  // Recent
  const RECENT_KEY = "fitnessapp_recent_exercises_v1";
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const saveRecent = (ex) => {
    const next = [
      { id: ex.id, name: ex.name, muscle_group: ex.muscle_group },
      ...recent.filter((r) => String(r.id) !== String(ex.id)),
    ].slice(0, 12);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  // Синхронизация ако отвън се смени упражнението
  // guard against null valueExercise by using optional chaining in deps
  useEffect(() => {
    setQuery(valueExercise?.name || "");
  }, [valueExercise?.id, valueExercise?.name]); // само при смяна на id

  // Supabase search
  useEffect(() => {
    let alive = true;

    const run = async () => {
      setPickerError("");

      // Ако няма търсене и няма филтър по мускулна група -> не прави заявка (показвай Последно използвани)
      if (!debouncedQuery.trim() && !muscle) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        let q = supabase
          .from("Exercises")
          .select("id, name, muscle_group")
          .order("name", { ascending: true })
          .limit(50);

        if (debouncedQuery.trim()) {
          q = q.ilike("name", `%${debouncedQuery.trim()}%`);
        }

        if (muscle) {
          q = q.eq("muscle_group", muscle);
        }

        const { data, error } = await q;
        if (error) throw error;

        if (!alive) return;
        setResults(data || []);
      } catch (e) {
        if (!alive) return;
        setPickerError(e?.message || "Неуспешно търсене на упражнения.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [debouncedQuery, muscle]);

  const pick = (ex) => {
    onPickExercise(ex);
    saveRecent(ex);
    setOpen(false);
  };

  // затваряне при Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showRecent = !debouncedQuery.trim() && !muscle;

  const headerText = useMemo(() => {
    if (loading) return "Търсене...";
    if (showRecent) return recent.length ? "Последно използвани упражнения" : "Започни да пишеш, за да търсиш";
    return "Избери упражнение";
  }, [loading, showRecent, recent.length]);

  return (
    <div style={ui.wrap}>
      <div style={ui.row}>
        <input
          style={ui.input}
          value={query}
          disabled={disabled}
          placeholder="Търси упражнение (напр. лежанка, клек...)"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />

        <select
          style={ui.select}
          value={muscle}
          disabled={disabled}
          onChange={(e) => {
            setMuscle(e.target.value);
            setOpen(true);
          }}
        >
          <option value="">Всички мускулни групи</option>
          {muscleOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {pickerError && <div style={ui.error}>{pickerError}</div>}

      {open && !disabled && (
        <div style={ui.dropdown}>
          <div style={ui.header}>
            <div>{headerText}</div>
            <button type="button" style={ui.closeBtn} onClick={() => setOpen(false)} aria-label="Затвори">
              ✕
            </button>
          </div>

          {showRecent && recent.length === 0 && (
            <div style={ui.hint}>Въведи поне 2–3 букви, за да започнеш търсене.</div>
          )}

          {showRecent && recent.length > 0 && (
            <div style={ui.section}>
              {recent.map((ex) => (
                <button key={ex.id} type="button" style={ui.itemBtn} onClick={() => pick(ex)}>
                  <div style={ui.itemName}>{ex.name}</div>
                  <div style={ui.itemMeta}>{ex.muscle_group}</div>
                </button>
              ))}
            </div>
          )}

          {!showRecent && !loading && results.length === 0 && (
            <div style={ui.hint}>Няма съвпадения. Опитай с друга ключова дума.</div>
          )}

          {!showRecent &&
            results.map((ex) => (
              <button key={ex.id} type="button" style={ui.itemBtn} onClick={() => pick(ex)}>
                <div style={ui.itemName}>{ex.name}</div>
                <div style={ui.itemMeta}>{ex.muscle_group}</div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}