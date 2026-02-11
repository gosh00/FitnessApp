// backend/scripts/seedFoodsFromCsv.js
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

// Swiss CSV headers (from repo schema)
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

  // Map CSV rows -> your Foods table structure
  const foods = records
    .map((r) => {
      const name = (r[COL_NAME] || "").trim();
      if (!name) return null;

      const kcal = toNum(r[COL_KCAL]);
      const protein = toNum(r[COL_PROT]);
      const carbs = toNum(r[COL_CARBS]);
      const sugars = toNum(r[COL_SUGARS]);
      const fiber = toNum(r[COL_FIBER]);
      const fat = toNum(r[COL_FAT]);

      // skip rows with no nutrition values
      if (kcal === 0 && protein === 0 && carbs === 0 && sugars === 0 && fiber === 0 && fat === 0) {
        return null;
      }

      return {
        name,
        brand: null,
        kcal_100: kcal,
        protein_100: protein,
        carbs_100: carbs,
        sugars_100: sugars,
        fat_100: fat,
        fiber_100: fiber,
      };
    })
    .filter(Boolean);

  console.log("Parsed foods:", foods.length);

  // Insert in batches
  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < foods.length; i += BATCH) {
    const chunk = foods.slice(i, i + BATCH);

    const { error } = await supabase.from("Foods").insert(chunk);
    if (error) {
      console.error("Insert error at batch", i / BATCH + 1, error.message);
      process.exit(1);
    }

    inserted += chunk.length;
    console.log(`Inserted ${inserted}/${foods.length}`);
  }

  console.log("✅ Done. Inserted:", inserted);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
