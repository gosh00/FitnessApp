import "./LegalPages.css";

export default function CookiesPage({ setPage }) {
  return (
    <div className="lp-wrap">
      <div className="lp-card">
        <h1 className="lp-title">Cookie Policy</h1>

        <p className="lp-text">
          This Cookie Policy explains how Trainify uses cookies/local storage. Cookies help keep you signed in and
          allow the app to work smoothly. We keep this minimal.
        </p>

        <div className="lp-section">
          <h2 className="lp-h2">What are cookies?</h2>
          <p className="lp-text">
            Cookies are small files stored in your browser. Some services also use local storage for similar purposes.
            Trainify uses these primarily for authentication and basic app operation.
          </p>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Types of cookies used</h2>
          <ul className="lp-list">
            <li><b>Essential:</b> required to log in and keep your session active (Supabase Auth).</li>
            <li><b>Preferences (optional):</b> UI preferences like selected page/theme (if implemented).</li>
            <li><b>Analytics (optional):</b> only if you add analytics later (not required for diploma scope).</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">How Trainify uses them</h2>
          <ul className="lp-list">
            <li>Maintain secure login sessions</li>
            <li>Remember basic preferences (if enabled)</li>
            <li>Improve reliability by preventing repeated logins</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Managing cookies</h2>
          <p className="lp-text">
            You can control cookies via your browser settings. Blocking essential cookies may prevent Trainify from working properly.
          </p>
          <ul className="lp-list">
            <li>Clear cookies to sign out on shared devices</li>
            <li>Disable third-party cookies (Trainify mainly uses first-party)</li>
            <li>Use incognito mode if you do not want data stored locally</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Future improvements</h2>
          <p className="lp-text">
            In a production version, Trainify could include a cookie preference banner and allow users to opt in/out of analytics.
          </p>
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
