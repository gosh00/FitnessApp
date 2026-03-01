import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import styles from "./FoodDiaryPage.module.css";

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const MEALS = ["Закуска", "Обяд", "Вечеря", "Снак"];

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
      <div><span>Калории:</span> {round1(t.calories)}</div>
      <div><span>Протеин:</span> {round1(t.protein)}</div>
      <div><span>Въглехидрати:</span> {round1(t.carbs)}</div>
      <div><span>Захари:</span> {round1(t.sugars)}</div>
      <div><span>Мазнини:</span> {round1(t.fat)}</div>
      <div><span>Фибри:</span> {round1(t.fiber)}</div>
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
            <th className={styles.th}>Храна</th>
            <th className={styles.th}>Грамаж</th>
            <th className={styles.th}>Калории</th>
            <th className={styles.th}>Протеин</th>
            <th className={styles.th}>Въглехидрати</th>
            <th className={styles.th}>Захари</th>
            <th className={styles.th}>Мазнини</th>
            <th className={styles.th}>Фибри</th>
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
                  <button
                    className={styles.deleteBtn}
                    onClick={() => onDelete(row.id)}
                    aria-label="Изтрий"
                    title="Изтрий"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}

          {(rows || []).length === 0 ? (
            <tr className={styles.tr}>
              <td className={styles.td} colSpan={9} style={{ opacity: 0.7 }}>
                Все още няма добавени записи.
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
  const [meal, setMeal] = useState("Закуска");

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
        setErr(e?.message || "Неуспешно зареждане на храните.");
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
        await Promise.resolve();
        if (!cancelled) setErr("Не сте влезли в профила си.");
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
        setErr(e?.message || "Неуспешно зареждане на записите.");
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

  // ⚠️ Важно: meal стойностите в DB са на английски (Breakfast/Lunch/Dinner/Snack)
  // Оставяме payload-а към DB на английски, но UI-то е на български.
  const uiMealToDb = useMemo(() => {
    return {
      "Закуска": "Breakfast",
      "Обяд": "Lunch",
      "Вечеря": "Dinner",
      "Снак": "Snack",
    };
  }, []);

  const dbMealToUi = useMemo(() => {
    return {
      Breakfast: "Закуска",
      Lunch: "Обяд",
      Dinner: "Вечеря",
      Snack: "Снак",
    };
  }, []);

  const logsByMeal = useMemo(() => {
    const map = { Закуска: [], Обяд: [], Вечеря: [], Снак: [] };
    for (const row of logs) {
      const uiKey = dbMealToUi[row.meal || "Snack"] || "Снак";
      (map[uiKey] ?? (map[uiKey] = [])).push(row);
    }
    return map;
  }, [logs, dbMealToUi]);

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
    if (!userId) return setErr("Не сте влезли в профила си.");

    const foodId = effectiveSelectedFoodId;
    if (!foodId) return setErr("Моля, избери храна.");

    const g = Number(grams);
    if (!g || g <= 0) return setErr("Въведи грамаж по-голям от 0.");

    const dbMeal = uiMealToDb[meal] || "Breakfast";

    const { error } = await supabase.from("FoodLogs").insert({
      user_auth_id: userId,
      date,
      food_id: foodId,
      grams: g,
      meal: dbMeal,
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
  }, [currentUser?.id, effectiveSelectedFoodId, grams, date, meal, uiMealToDb]);

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
      <h2 className={styles.title}>Хранителен дневник</h2>

      <div className={styles.controls}>
        <label className={styles.dateLabel}>
          Дата
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
          placeholder="Търси храна… (банан, ориз, пиле)"
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
          aria-label="Грамаж"
        />

        <button className={styles.addBtn} onClick={addLog}>
          Добави
        </button>
      </div>

      {/* PREVIEW */}
      {selectedFood && preview && (
        <div className={styles.tableWrap} style={{ marginBottom: "1rem" }}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              Преглед: {selectedFood.name} ({grams} г)
            </div>
            <NutritionMini t={preview} />
          </div>
        </div>
      )}

      {err && <p className={styles.error}>{err}</p>}
      {loading && <p className={styles.loading}>Зареждане…</p>}

      {/* DAILY TOTAL */}
      <div className={styles.tableWrap} style={{ marginTop: "1rem" }}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>Дневен сбор</div>
          <NutritionMini t={totalsAll} />
        </div>
      </div>

      {/* MEAL SECTIONS */}
      <MealTable title="Закуска" rows={logsByMeal["Закуска"]} onDelete={deleteLog} />
      <MealTable title="Обяд" rows={logsByMeal["Обяд"]} onDelete={deleteLog} />
      <MealTable title="Вечеря" rows={logsByMeal["Вечеря"]} onDelete={deleteLog} />
      <MealTable title="Снак" rows={logsByMeal["Снак"]} onDelete={deleteLog} />
    </div>
  );
}