import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import styles from "./FoodDiaryPage.module.css";

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"];

function calcFrom100g(food, grams) {
  const g = Number(grams) || 0;
  const factor = g / 100;

  return {
    calories: (Number(food?.kcal_100) || 0) * factor,
    protein: (Number(food?.protein_100) || 0) * factor,
    carbs: (Number(food?.carbs_100) || 0) * factor,
    sugars: (Number(food?.sugars_100) || 0) * factor,
    fat: (Number(food?.fat_100) || 0) * factor,
    fiber: (Number(food?.fiber_100) || 0) * factor,
  };
}

function NutritionMini({ t }) {
  if (!t) return null;
  return (
    <div className={styles.totalsMini}>
      <div><span>Calories:</span> {round1(t.calories)}</div>
      <div><span>Protein:</span> {round1(t.protein)}</div>
      <div><span>Carbohydrates:</span> {round1(t.carbs)}</div>
      <div><span>Sugars:</span> {round1(t.sugars)}</div>
      <div><span>Fat:</span> {round1(t.fat)}</div>
      <div><span>Fiber:</span> {round1(t.fiber)}</div>
    </div>
  );
}

function MealTable({ title, rows, onDelete }) {
  const totals = useMemo(() => {
    return (rows || []).reduce(
      (acc, row) => {
        const r = calcFrom100g(row?.Foods, row?.grams);
        acc.calories += r.calories;
        acc.protein += r.protein;
        acc.carbs += r.carbs;
        acc.sugars += r.sugars;
        acc.fat += r.fat;
        acc.fiber += r.fiber;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, sugars: 0, fat: 0, fiber: 0 }
    );
  }, [rows]);

  return (
    <div className={styles.tableWrap} style={{ marginTop: "1rem" }}>
      <div className={styles.tableHeader}>
        <div className={styles.tableTitle}>{title}</div>
        <NutritionMini t={totals} />
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Food</th>
            <th className={styles.th}>Grams</th>
            <th className={styles.th}>Calories</th>
            <th className={styles.th}>Protein</th>
            <th className={styles.th}>Carbohydrates</th>
            <th className={styles.th}>Sugars</th>
            <th className={styles.th}>Fat</th>
            <th className={styles.th}>Fiber</th>
            <th className={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((row) => {
            const f = row.Foods;
            const r = calcFrom100g(f, row.grams);

            return (
              <tr key={row.id} className={styles.tr}>
                <td className={`${styles.td} ${styles.foodCell}`}>
                  <div className={styles.foodName}>{f?.name}</div>
                  {f?.brand ? <div className={styles.foodBrand}>{f.brand}</div> : null}
                </td>
                <td className={styles.td}>{row.grams}</td>
                <td className={styles.td}>{round1(r.calories)}</td>
                <td className={styles.td}>{round1(r.protein)}</td>
                <td className={styles.td}>{round1(r.carbs)}</td>
                <td className={styles.td}>{round1(r.sugars)}</td>
                <td className={styles.td}>{round1(r.fat)}</td>
                <td className={styles.td}>{round1(r.fiber)}</td>
                <td className={styles.td}>
                  <button className={styles.deleteBtn} onClick={() => onDelete(row.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}

          {(rows || []).length === 0 ? (
            <tr className={styles.tr}>
              <td className={styles.td} colSpan={9} style={{ opacity: 0.7 }}>
                No entries yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export default function FoodDiaryPage({ currentUser }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [foods, setFoods] = useState([]);
  const [logs, setLogs] = useState([]);

  const [query, setQuery] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState("Breakfast");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const gramsRef = useRef(null);

  // ✅ Load foods (no sync setState before await)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("Foods")
          .select("id,name,brand,kcal_100,protein_100,carbs_100,sugars_100,fat_100,fiber_100")
          .order("name", { ascending: true });

        if (cancelled) return;

        if (error) {
          setErr(error.message);
          setFoods([]);
        } else {
          setErr("");
          setFoods(data || []);
        }
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || "Failed to load foods.");
        setFoods([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ Load logs for date (no sync setState before await)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const userId = currentUser?.id;
      if (!userId) {
        // no setState sync here; do it async
        await Promise.resolve();
        if (!cancelled) setErr("Not logged in.");
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("FoodLogs")
          .select(
            `id, grams, meal, date, note, created_at,
             Foods:food_id (
               id, name, brand, kcal_100, protein_100, carbs_100, sugars_100, fat_100, fiber_100
             )`
          )
          .eq("user_auth_id", userId)
          .eq("date", date)
          .order("created_at", { ascending: false });

        if (cancelled) return;

        if (error) {
          setErr(error.message);
          setLogs([]);
        } else {
          setErr("");
          setLogs(data || []);
        }
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || "Failed to load logs.");
        setLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, date]);

  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return foods.slice(0, 50);

    return foods
      .filter((f) => {
        const name = (f.name || "").toLowerCase();
        const brand = (f.brand || "").toLowerCase();
        return name.includes(q) || brand.includes(q);
      })
      .slice(0, 50);
  }, [foods, query]);

  const effectiveSelectedFoodId = useMemo(() => {
    if (selectedFoodId) return selectedFoodId;
    return filteredFoods[0]?.id || "";
  }, [selectedFoodId, filteredFoods]);

  const selectedFood = useMemo(() => {
    const id = effectiveSelectedFoodId;
    return foods.find((f) => f.id === id) || null;
  }, [foods, effectiveSelectedFoodId]);

  const preview = useMemo(() => {
    if (!selectedFood) return null;
    return calcFrom100g(selectedFood, grams);
  }, [selectedFood, grams]);

  const logsByMeal = useMemo(() => {
    const map = { Breakfast: [], Lunch: [], Dinner: [], Snack: [] };
    for (const row of logs) {
      const k = row.meal || "Snack";
      (map[k] ?? (map[k] = [])).push(row);
    }
    return map;
  }, [logs]);

  const totalsAll = useMemo(() => {
    return logs.reduce(
      (acc, row) => {
        const r = calcFrom100g(row?.Foods, row?.grams);
        acc.calories += r.calories;
        acc.protein += r.protein;
        acc.carbs += r.carbs;
        acc.sugars += r.sugars;
        acc.fat += r.fat;
        acc.fiber += r.fiber;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, sugars: 0, fat: 0, fiber: 0 }
    );
  }, [logs]);

  const addLog = useCallback(async () => {
    setErr("");

    const userId = currentUser?.id;
    if (!userId) return setErr("Not logged in.");

    const foodId = effectiveSelectedFoodId;
    if (!foodId) return setErr("Choose a food.");

    const g = Number(grams);
    if (!g || g <= 0) return setErr("Enter grams > 0.");

    const { error } = await supabase.from("FoodLogs").insert({
      user_auth_id: userId,
      date,
      food_id: foodId,
      grams: g,
      meal: meal || "Breakfast",
      note: null,
    });

    if (error) return setErr(error.message);

    // reload logs (simple: refetch)
    const { data, error: e2 } = await supabase
      .from("FoodLogs")
      .select(
        `id, grams, meal, date, note, created_at,
         Foods:food_id (
           id, name, brand, kcal_100, protein_100, carbs_100, sugars_100, fat_100, fiber_100
         )`
      )
      .eq("user_auth_id", userId)
      .eq("date", date)
      .order("created_at", { ascending: false });

    if (e2) setErr(e2.message);
    else setLogs(data || []);

    gramsRef.current?.focus?.();
    gramsRef.current?.select?.();
  }, [currentUser?.id, effectiveSelectedFoodId, grams, date, meal]);

  const deleteLog = useCallback(async (id) => {
    setErr("");
    const { error } = await supabase.from("FoodLogs").delete().eq("id", id);
    if (error) return setErr(error.message);
    setLogs((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const onGramsKeyDown = (e) => {
    if (e.key === "Enter") addLog();
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Food Diary</h2>

      <div className={styles.controls}>
        <label className={styles.dateLabel}>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {/* ADD ENTRY */}
      <div className={styles.controls}>
        <select className={styles.select} value={meal} onChange={(e) => setMeal(e.target.value)}>
          {MEALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <input
          className={styles.select}
          placeholder="Search food… (banana, rice, chicken)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedFoodId("");
          }}
        />

        <select
          className={styles.select}
          value={effectiveSelectedFoodId}
          onChange={(e) => setSelectedFoodId(e.target.value)}
        >
          {filteredFoods.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
              {f.brand ? ` (${f.brand})` : ""}
            </option>
          ))}
        </select>

        <input
          ref={gramsRef}
          className={styles.gramsInput}
          type="number"
          min="1"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          onKeyDown={onGramsKeyDown}
        />

        <button className={styles.addBtn} onClick={addLog}>
          Add
        </button>
      </div>

      {/* PREVIEW */}
      {selectedFood && preview && (
        <div className={styles.tableWrap} style={{ marginBottom: "1rem" }}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              Preview: {selectedFood.name} ({grams}g)
            </div>
            <NutritionMini t={preview} />
          </div>
        </div>
      )}

      {err && <p className={styles.error}>{err}</p>}
      {loading && <p className={styles.loading}>Loading…</p>}

      {/* DAILY TOTAL */}
      <div className={styles.tableWrap} style={{ marginTop: "1rem" }}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>Daily Total</div>
          <NutritionMini t={totalsAll} />
        </div>
      </div>

      {/* MEAL SECTIONS */}
      <MealTable title="Breakfast" rows={logsByMeal.Breakfast} onDelete={deleteLog} />
      <MealTable title="Lunch" rows={logsByMeal.Lunch} onDelete={deleteLog} />
      <MealTable title="Dinner" rows={logsByMeal.Dinner} onDelete={deleteLog} />
      <MealTable title="Snack" rows={logsByMeal.Snack} onDelete={deleteLog} />
    </div>
  );
}
