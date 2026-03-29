const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const supabase = require("../config/supabaseClient");

let fetchFn = globalThis.fetch;
if (!fetchFn) {
  fetchFn = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
}

const EXERCISES_JSON_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

function pickMuscleGroup(ex) {
  if (Array.isArray(ex.primaryMuscles) && ex.primaryMuscles.length) {
    return ex.primaryMuscles[0];
  }
  if (ex.category) return ex.category;
  return "unknown";
}

function buildDescription(ex) {
  const parts = [];

  if (Array.isArray(ex.instructions) && ex.instructions.length) {
    parts.push(ex.instructions.join("\n"));
  }

  if (ex.equipment) {
    parts.push(`Equipment: ${ex.equipment}`);
  }

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
  if (ex.id) {
    return `${IMAGE_BASE_URL}${ex.id}/0.jpg`;
  }
  return null;
}

async function fetchJson(url) {
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch dataset (${res.status})`);
  }
  return res.json();
}

async function main() {
  console.log("=== RESTORE EXERCISES ENGLISH START ===");

  const dataset = await fetchJson(EXERCISES_JSON_URL);
  console.log("Downloaded exercises:", dataset.length);

  const sourceRows = dataset.map((ex) => ({
    name: ex.name,
    muscle_group: pickMuscleGroup(ex),
    description: buildDescription(ex),
    image_url: pickImageUrl(ex),
  }));

  const sourceMap = new Map();
  for (const row of sourceRows) {
    if (row.image_url) {
      sourceMap.set(row.image_url, row);
    }
  }

  const { data: existingExercises, error: fetchError } = await supabase
    .from("Exercises")
    .select("id, image_url, name, muscle_group, description");

  if (fetchError) throw fetchError;

  console.log("Existing exercises in DB:", existingExercises?.length || 0);

  const toUpdate = [];

  for (const dbRow of existingExercises || []) {
    const original = sourceMap.get(dbRow.image_url);

    if (!original) continue;

    const shouldUpdate =
      dbRow.name !== original.name ||
      dbRow.muscle_group !== original.muscle_group ||
      dbRow.description !== original.description;

    if (shouldUpdate) {
      toUpdate.push({
        id: dbRow.id,
        name: original.name,
        muscle_group: original.muscle_group,
        description: original.description,
      });
    }
  }

  console.log("Exercises to update:", toUpdate.length);

  const BATCH = 200;
  let updated = 0;

  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const chunk = toUpdate.slice(i, i + BATCH);

    for (const row of chunk) {
      const { error } = await supabase
        .from("Exercises")
        .update({
          name: row.name,
          muscle_group: row.muscle_group,
          description: row.description,
        })
        .eq("id", row.id);

      if (error) {
        throw error;
      }

      updated++;
    }

    console.log(`Updated ${updated}/${toUpdate.length}`);
  }

  console.log("✅ RESTORE EXERCISES COMPLETE");
}

main().catch((e) => {
  console.error("❌ RESTORE EXERCISES FAILED:", e?.message || e);
  process.exit(1);
});