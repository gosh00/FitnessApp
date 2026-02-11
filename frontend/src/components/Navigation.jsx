import React from "react";
import "./Navigation.css";

const Navigation = ({ page, setPage }) => {
  const pages = [
    { id: "home", label: "Home" },
    { id: "exercises", label: "Exercises" },
    { id: "log", label: "Log Workout" },
    { id: "workouts", label: "Feed" },
    { id: "calories", label: "Calories" },
    { id: "food-diary", label: "Food Diary" },
  ];

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-links">
          {pages.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}
              aria-label={item.label}
            >
              <span className="nav-label">{item.label}</span>
              {page === item.id && <div className="active-indicator"></div>}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
