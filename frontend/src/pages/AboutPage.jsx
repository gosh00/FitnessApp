import "./LegalPages.css";
import TrainifyLogo from "../components/TrainifyLogo";

export default function AboutPage({ setPage }) {
  return (
    <div className="lp-wrap">
      <div className="lp-card">
        <div className="lp-head">
          <TrainifyLogo as="div" className="lp-logo" />
          <h1 className="lp-title">About Trainify</h1>
        </div>

        <p className="lp-text">
          Trainify is a fitness tracking application built to help you stay consistent, organized, and motivated.
          It combines workout logging, nutrition tracking, and progress monitoring into one clean experience.
        </p>

        <div className="lp-section">
          <h2 className="lp-h2">Mission</h2>
          <p className="lp-text">
            Our goal is to make fitness progress measurable and simple: log what you do, see improvement over time,
            and build habits that last.
          </p>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Core features</h2>
          <ul className="lp-list">
            <li><b>Workout logging:</b> track exercises, sets, reps, and weights.</li>
            <li><b>Exercise library:</b> browse exercises and learn how to perform them correctly.</li>
            <li><b>Food diary:</b> add foods by grams and view daily totals (calories + macros).</li>
            <li><b>Streak & level:</b> maintain consistency with a daily streak and level progression.</li>
            <li><b>User profile:</b> keep your goals and measurements in one place.</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">How Trainify calculates progress</h2>
          <ul className="lp-list">
            <li><b>Level:</b> increases based on the number of workouts logged.</li>
            <li><b>Streak:</b> counts consecutive days with activity logged.</li>
            <li><b>Nutrition totals:</b> computed from food values per 100g and your entered grams.</li>
          </ul>
          <p className="lp-text">
            Note: Calculations are designed for tracking and motivation. They are not a substitute for professional advice.
          </p>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Who is Trainify for?</h2>
          <ul className="lp-list">
            <li>Beginners who want structure and clarity</li>
            <li>Intermediate lifters tracking progressive overload</li>
            <li>Anyone who wants a clean, all-in-one fitness journal</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Roadmap ideas</h2>
          <ul className="lp-list">
            <li>Workout templates and reusable plans</li>
            <li>Nutrition goals per day (targets for Protein/Carbs/Fat)</li>
            <li>Charts for progress (weight trends, strength PRs)</li>
            <li>Sharing workouts (public/private feed)</li>
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
