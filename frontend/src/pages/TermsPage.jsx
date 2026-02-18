import "./LegalPages.css";

export default function TermsPage({ setPage }) {
  return (
    <div className="lp-wrap">
      <div className="lp-card">
        <h1 className="lp-title">Terms of Service</h1>

        <p className="lp-text">
          These Terms govern your use of Trainify. By using the app, you agree to follow these rules.
          This content is written for a diploma project context and can be expanded for a production release.
        </p>

        <div className="lp-section">
          <h2 className="lp-h2">Acceptable use</h2>
          <ul className="lp-list">
            <li>Do not attempt to access data that does not belong to you</li>
            <li>Do not abuse the platform (spam, automated scraping, harmful content)</li>
            <li>Do not attempt to bypass authentication or security controls</li>
            <li>Use the app responsibly and respectfully</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">User content</h2>
          <p className="lp-text">
            You are responsible for the accuracy of the information you enter (workouts, food entries, measurements).
            You may update or delete your entries based on the features available.
          </p>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Health disclaimer</h2>
          <ul className="lp-list">
            <li>Trainify is not medical or professional health advice</li>
            <li>Always consult a qualified professional before major health changes</li>
            <li>You assume full responsibility for your training and nutrition decisions</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Availability</h2>
          <p className="lp-text">
            We aim to keep Trainify stable, but we cannot guarantee uninterrupted access. Features may change,
            and maintenance may occur.
          </p>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Termination</h2>
          <p className="lp-text">
            If a user violates these Terms (e.g., security abuse), access may be restricted. In a production version,
            account deletion/termination rules would be fully specified.
          </p>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Changes to these Terms</h2>
          <p className="lp-text">
            The Terms may be updated. When significant changes happen, the app should provide a clear notice.
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
