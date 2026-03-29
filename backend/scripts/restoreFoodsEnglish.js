import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const CSV_PATH = path.join(process.cwd(), "data", "generic-foods.csv");

const COL_NAME = "name E";
const COL_KCAL = "energy kcal";
const COL_PROT = "protein";
const COL_CARBS = "carbohydrates, available";
const COL_SUGARS = "sugars";
const COL_FIBER = "dietary fibres";
const COL_FAT = "fat, total";

function toNum(v) {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim().replace(",", ".");
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function norm(n) {
  const num = Number(n || 0);
  return Number(num.toFixed(2));
}

function makeKey({ kcal_100, protein_100, carbs_100, sugars_100, fat_100, fiber_100 }) {
  return [
    norm(kcal_100),
    norm(protein_100),
    norm(carbs_100),
    norm(sugars_100),
    norm(fat_100),
    norm(fiber_100),
  ].join("|");
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error("CSV not found at:", CSV_PATH);
    process.exit(1);
  }

  const csvText = fs.readFileSync(CSV_PATH, "utf-8");

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
  });

  const sourceFoods = records
    .map((r) => {
      const name = (r[COL_NAME] || "").trim();
      if (!name) return null;

      const kcal = toNum(r[COL_KCAL]);
      const protein = toNum(r[COL_PROT]);
      const carbs = toNum(r[COL_CARBS]);
      const sugars = toNum(r[COL_SUGARS]);
      const fiber = toNum(r[COL_FIBER]);
      const fat = toNum(r[COL_FAT]);

      if (kcal === 0 && protein === 0 && carbs === 0 && sugars === 0 && fiber === 0 && fat === 0) {
        return null;
      }

      return {
        name,
        kcal_100: kcal,
        protein_100: protein,
        carbs_100: carbs,
        sugars_100: sugars,
        fat_100: fat,
        fiber_100: fiber,
      };
    })
    .filter(Boolean);

  console.log("Parsed source foods:", sourceFoods.length);

  const sourceMap = new Map();
  const duplicateKeys = new Set();

  for (const food of sourceFoods) {
    const key = makeKey(food);

    if (sourceMap.has(key)) {
      duplicateKeys.add(key);
    } else {
      sourceMap.set(key, food);
    }
  }

  console.log("Duplicate nutrition keys in CSV:", duplicateKeys.size);

  const { data: dbFoods, error: fetchError } = await supabase
    .from("Foods")
    .select("id, name, kcal_100, protein_100, carbs_100, sugars_100, fat_100, fiber_100");

  if (fetchError) {
    console.error(fetchError.message);
    process.exit(1);
  }

  console.log("Foods in DB:", dbFoods?.length || 0);

  const toUpdate = [];

  for (const row of dbFoods || []) {
    const key = makeKey(row);

    if (duplicateKeys.has(key)) {
      continue;
    }

    const original = sourceMap.get(key);
    if (!original) continue;
    if (row.name === original.name) continue;

    toUpdate.push({
      id: row.id,
      oldName: row.name,
      newName: original.name,
    });
  }

  console.log("Foods to update:", toUpdate.length);

  const BATCH = 200;
  let updated = 0;

  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const chunk = toUpdate.slice(i, i + BATCH);

    for (const row of chunk) {
      const { error } = await supabase
        .from("Foods")
        .update({ name: row.newName })
        .eq("id", row.id);

      if (error) {
        console.error(`Update error for food id=${row.id}:`, error.message);
        process.exit(1);
      }

      updated++;
    }

    console.log(`Updated ${updated}/${toUpdate.length}`);
  }

  console.log("✅ RESTORE FOODS COMPLETE");
}

main().catch((e) => {
  console.error("❌ RESTORE FOODS FAILED:", e?.message || e);
  process.exit(1);
});