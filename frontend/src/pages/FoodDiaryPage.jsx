import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import styles from "./FoodDiaryPage.module.css";

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

function calcFrom100g(food, grams) {
  const g = Number(grams) || 0;
  const factor = g / 100;

  return {
    kcal: (Number(food?.kcal_100) || 0) * factor,
    protein: (Number(food?.protein_100) || 0) * factor,
    carbs: (Number(food?.carbs_100) || 0) * factor,
    sugars: (Number(food?.sugars_100) || 0) * factor,
    fat: (Number(food?.fat_100) || 0) * factor,
    fiber: (Number(food?.fiber_100) || 0) * factor,
  };
}

export default function FoodDiaryPage({ currentUser }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [foods, setFoods] = useState([]);
  const [logs, setLogs] = useState([]);

  const [query, setQuery] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [grams, setGrams] = useState(100);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const gramsRef = useRef(null);

  const loadFoods = useCallback(async () => {
    setErr("");

    const { data, error } = await supabase
      .from("Foods")
      .select("id,name,brand,kcal_100,protein_100,carbs_100,sugars_100,fat_100,fiber_100")
      .order("name", { ascending: true });

    if (error) setErr(error.message);
    else setFoods(data || []);
  }, []);

  const loadLogs = useCallback(
    async (forDate) => {
      setLoading(true);
      setErr("");

      const userId = currentUser?.id;
      if (!userId) {
        setErr("Not logged in.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("FoodLogs")
        .select(
          `id, grams, meal, date, note, created_at,
           Foods:food_id (
             id, name, brand, kcal_100, protein_100, carbs_100, sugars_100, fat_100, fiber_100
           )`
        )
        .eq("user_auth_id", userId)
        .eq("date", forDate)
        .order("created_at", { ascending: false });

      if (error) setErr(error.message);
      else setLogs(data || []);

      setLoading(false);
    },
    [currentUser?.id]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadFoods();
    })();
    return () => {
      mounted = false;
    };
  }, [loadFoods]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadLogs(date);
    })();
    return () => {
      mounted = false;
    };
  }, [date, loadLogs]);

  // Filtered foods list
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

  // ✅ Derived "effective" selection WITHOUT setState
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

  const totals = useMemo(() => {
    return logs.reduce(
      (acc, row) => {
        const f = row.Foods;
        const r = calcFrom100g(f, row.grams);

        acc.kcal += r.kcal;
        acc.protein += r.protein;
        acc.carbs += r.carbs;
        acc.sugars += r.sugars;
        acc.fat += r.fat;
        acc.fiber += r.fiber;

        return acc;
      },
      { kcal: 0, protein: 0, carbs: 0, sugars: 0, fat: 0, fiber: 0 }
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
      meal: null,
      note: null,
    });

    if (error) return setErr(error.message);

    await loadLogs(date);

    gramsRef.current?.focus?.();
    gramsRef.current?.select?.();
  }, [currentUser?.id, effectiveSelectedFoodId, grams, date, loadLogs]);

  const deleteLog = async (id) => {
    setErr("");
    const { error } = await supabase.from("FoodLogs").delete().eq("id", id);
    if (error) return setErr(error.message);
    setLogs((prev) => prev.filter((x) => x.id !== id));
  };

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

      <div className={styles.controls}>
        <input
          className={styles.select}
          placeholder="Search food… (banana, rice, chicken)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // optional: reset manual selection when searching new query
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

      <div className={styles.controls}>
        <button className={styles.addBtn} type="button" onClick={() => setGrams((g) => Number(g || 0) + 50)}>
          +50g
        </button>
        <button className={styles.addBtn} type="button" onClick={() => setGrams((g) => Number(g || 0) + 100)}>
          +100g
        </button>
        <button className={styles.addBtn} type="button" onClick={() => setGrams((g) => Number(g || 0) + 200)}>
          +200g
        </button>
        <button className={styles.deleteBtn} type="button" onClick={() => setGrams(100)}>
          reset to 100g
        </button>
      </div>

      {selectedFood && preview && (
        <div className={styles.tableWrap} style={{ marginBottom: "1rem" }}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              Preview: {selectedFood.name} ({grams}g)
            </div>
            <div className={styles.totalsMini}>
              <div><span>Kcal:</span> {round1(preview.kcal)}</div>
              <div><span>P:</span> {round1(preview.protein)}</div>
              <div><span>C:</span> {round1(preview.carbs)}</div>
              <div><span>Sugar:</span> {round1(preview.sugars)}</div>
              <div><span>F:</span> {round1(preview.fat)}</div>
              <div><span>Fiber:</span> {round1(preview.fiber)}</div>
            </div>
          </div>
        </div>
      )}

      {err && <p className={styles.error}>{err}</p>}
      {loading && <p className={styles.loading}>Loading…</p>}

      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>Entries</div>
          <div className={styles.totalsMini}>
            <div><span>Kcal:</span> {round1(totals.kcal)}</div>
            <div><span>P:</span> {round1(totals.protein)}</div>
            <div><span>C:</span> {round1(totals.carbs)}</div>
            <div><span>Sugar:</span> {round1(totals.sugars)}</div>
            <div><span>F:</span> {round1(totals.fat)}</div>
            <div><span>Fiber:</span> {round1(totals.fiber)}</div>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Food</th>
              <th className={styles.th}>Grams</th>
              <th className={styles.th}>Kcal</th>
              <th className={styles.th}>P</th>
              <th className={styles.th}>C</th>
              <th className={styles.th}>Sugar</th>
              <th className={styles.th}>F</th>
              <th className={styles.th}>Fiber</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => {
              const f = row.Foods;
              const r = calcFrom100g(f, row.grams);

              return (
                <tr key={row.id} className={styles.tr}>
                  <td className={`${styles.td} ${styles.foodCell}`}>
                    <div className={styles.foodName}>{f?.name}</div>
                    {f?.brand ? <div className={styles.foodBrand}>{f.brand}</div> : null}
                  </td>
                  <td className={styles.td}>{row.grams}</td>
                  <td className={styles.td}>{round1(r.kcal)}</td>
                  <td className={styles.td}>{round1(r.protein)}</td>
                  <td className={styles.td}>{round1(r.carbs)}</td>
                  <td className={styles.td}>{round1(r.sugars)}</td>
                  <td className={styles.td}>{round1(r.fat)}</td>
                  <td className={styles.td}>{round1(r.fiber)}</td>
                  <td className={styles.td}>
                    <button className={styles.deleteBtn} onClick={() => deleteLog(row.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}

            <tr className={styles.totalRow}>
              <td className={`${styles.td} ${styles.totalLabel}`}>Total</td>
              <td className={styles.td}></td>
              <td className={styles.td}>{round1(totals.kcal)}</td>
              <td className={styles.td}>{round1(totals.protein)}</td>
              <td className={styles.td}>{round1(totals.carbs)}</td>
              <td className={styles.td}>{round1(totals.sugars)}</td>
              <td className={styles.td}>{round1(totals.fat)}</td>
              <td className={styles.td}>{round1(totals.fiber)}</td>
              <td className={styles.td}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
