import { useState } from "react";
import { supabase } from "../supabaseClient";
import sharedStyles from "../styles/shared.module.css";

export default function AdminAddExercise({ onAdded }) {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!name.trim()) return setMsg("Name is required.");

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        muscle_group: muscleGroup.trim() || null,
        image_url: imageUrl.trim() || null,
        video_url: videoUrl.trim() || null,
        description: description.trim() || null,
      };

      const { error } = await supabase.from("Exercises").insert(payload);
      if (error) throw error;

      setMsg("✅ Exercise added!");
      setName("");
      setMuscleGroup("");
      setImageUrl("");
      setVideoUrl("");
      setDescription("");

      onAdded?.();
    } catch (err) {
      console.error(err);
      setMsg(err?.message || "Error adding exercise");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={sharedStyles.card} style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>Admin: Add Exercise</h3>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          className={sharedStyles.input}
          placeholder="Name* (e.g. Barbell Squat)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className={sharedStyles.input}
          placeholder="Muscle group (e.g. legs, chest)"
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
        />

        <input
          className={sharedStyles.input}
          placeholder="Image URL (https://...)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />

        <input
          className={sharedStyles.input}
          placeholder="YouTube URL (https://www.youtube.com/watch?v=...)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />

        <textarea
          className={sharedStyles.input}
          placeholder="Description / Instructions"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button className={sharedStyles.primaryButton} disabled={saving} type="submit">
          {saving ? "Saving..." : "Add"}
        </button>

        {msg && <div style={{ opacity: 0.9 }}>{msg}</div>}
      </form>
    </div>
  );
}
