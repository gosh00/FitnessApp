import "./LegalPages.css";

export default function PrivacyPolicyPage({ setPage }) {
  return (
    <div className="lp-wrap">
      <div className="lp-card">
        <h1 className="lp-title">Privacy Policy</h1>

        <p className="lp-text">
          This Privacy Policy explains what information Trainify stores, why we store it, and how you control it.
          Trainify is built with privacy in mind: we only keep data that is necessary to deliver the features.
        </p>

        <div className="lp-section">
          <h2 className="lp-h2">Information we store</h2>
          <ul className="lp-list">
            <li><b>Account information:</b> email and authentication identifiers (managed by Supabase Auth).</li>
            <li><b>Profile information:</b> display name, bio, age, height, weight, goals, and avatar (if added).</li>
            <li><b>Fitness activity data:</b> workouts, exercise logs, and food diary entries.</li>
            <li><b>Basic technical logs:</b> used to troubleshoot errors and improve reliability (where applicable).</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">How we use your information</h2>
          <ul className="lp-list">
            <li>To display your profile and personalize the app experience</li>
            <li>To calculate streaks, levels, and daily nutrition totals</li>
            <li>To show your saved workouts and logs across sessions/devices</li>
            <li>To keep the platform secure and functioning properly</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Data sharing</h2>
          <p className="lp-text">
            Trainify does not sell your personal data. Your data is stored in the app database and is used only for
            the application features. If the app offers a public workout feed, it will clearly indicate what becomes public.
          </p>
          <ul className="lp-list">
            <li><b>Supabase:</b> used for authentication and database services.</li>
            <li><b>Storage:</b> avatars may be stored in a dedicated storage bucket.</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Security</h2>
          <ul className="lp-list">
            <li>Authentication is handled by Supabase (session tokens)</li>
            <li>Database access should be protected by Row Level Security (RLS)</li>
            <li>Passwords are not stored directly by Trainify front-end</li>
          </ul>
          <p className="lp-text">
            No system is 100% secure, but we use modern security practices and access control.
          </p>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Retention</h2>
          <p className="lp-text">
            Your data stays in Trainify while your account exists. For diploma scope, deletion can be handled by an admin process.
            In a production scenario, a self-service “delete account” feature would be offered.
          </p>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Your rights & control</h2>
          <ul className="lp-list">
            <li>Update your profile details at any time</li>
            <li>Change your avatar</li>
            <li>Edit or delete logs you created</li>
            <li>Request account removal (future feature / admin process)</li>
          </ul>
        </div>

        <div className="lp-actions">
          <button className="lp-btn" onClick={() => setPage?.("home")}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
