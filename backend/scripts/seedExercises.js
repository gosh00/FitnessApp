// backend/scripts/seedExercises.js
// Run from backend folder: node scripts/seedExercises.js

const path = require("path");

// Load backend/.env
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Supabase service-role client (your existing file)
const supabase = require("../config/supabaseClient");

// Polyfill fetch for Node < 18
let fetchFn = globalThis.fetch;
if (!fetchFn) {
  fetchFn = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
}

const EXERCISES_JSON_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

function pickMuscleGroup(ex) {
  if (Array.isArray(ex.primaryMuscles) && ex.primaryMuscles.length) return ex.primaryMuscles[0];
  if (ex.category) return ex.category;
  return "unknown";
}

function buildDescription(ex) {
  const parts = [];
  if (Array.isArray(ex.instructions) && ex.instructions.length) {
    parts.push(ex.instructions.join("\n"));
  }
  if (ex.equipment) parts.push(`Equipment: ${ex.equipment}`);
  if (Array.isArray(ex.secondaryMuscles) && ex.secondaryMuscles.length) {
    parts.push(`Secondary: ${ex.secondaryMuscles.join(", ")}`);
  }
  const out = parts.join("\n\n").trim();
  return out || null;
}

function pickImageUrl(ex) {
  if (Array.isArray(ex.images) && ex.images.length) {
    return IMAGE_BASE_URL + ex.images[0];
  }
  if (ex.id) return `${IMAGE_BASE_URL}${ex.id}/0.jpg`;
  return null;
}

async function fetchJson(url) {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Failed to fetch dataset (${res.status})`);
  return res.json();
}

async function main() {
  console.log("=== SEED START ===");
  console.log("Node version:", process.version);
  console.log("SUPABASE_URL exists:", !!process.env.SUPABASE_URL);
  console.log("SERVICE_ROLE exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  console.log("Downloading dataset…");
  const dataset = await fetchJson(EXERCISES_JSON_URL);
  console.log("Downloaded exercises:", dataset.length);

  const rows = dataset.map((ex) => ({
    name: ex.name,
    muscle_group: pickMuscleGroup(ex),
    description: buildDescription(ex),
    image_url: pickImageUrl(ex),
    video_url: null, // you can fill later
  }));

  // IMPORTANT:
  // If you DON'T have a unique constraint/index on name, use insert() instead of upsert().
  // Because you had duplicates earlier, let's do insert in a safe way:
  // We'll insert only names that don't exist already.

  const chunkSize = 200;
  let processed = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    // Get existing names for this chunk
    const names = chunk.map((r) => r.name);

    const { data: existing, error: existErr } = await supabase
      .from("Exercises")
      .select("name")
      .in("name", names);

    if (existErr) throw existErr;

    const existingSet = new Set((existing || []).map((x) => x.name));
    const toInsert = chunk.filter((r) => !existingSet.has(r.name));

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from("Exercises").insert(toInsert);
      if (insErr) throw insErr;
    }

    processed += chunk.length;
    console.log(
      `Processed ${processed}/${rows.length} | inserted ${toInsert.length} new in this batch`
    );
  }

  console.log("✅ SEED COMPLETE");
}

main().catch((e) => {
  console.error("❌ SEED FAILED:", e?.message || e);
  process.exit(1);
});
