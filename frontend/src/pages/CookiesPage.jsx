import "./LegalPages.css";

export default function CookiesPage({ setPage }) {
  return (
    <div className="lp-wrap">
      <div className="lp-card">
        <h1 className="lp-title">Политика за бисквитки</h1>

        <p className="lp-text">
          Настоящата политика обяснява как Trainify използва бисквитки и/или local storage. Те помагат да останеш
          вписан/а и приложението да работи стабилно. Използваме ги в минимално необходимия обем.
        </p>

        <div className="lp-section">
          <h2 className="lp-h2">Какво са бисквитките?</h2>
          <p className="lp-text">
            Бисквитките са малки файлове, които се съхраняват в браузъра. Някои услуги използват и local storage за
            сходни цели. Trainify ги използва основно за удостоверяване и базова работа на приложението.
          </p>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Видове бисквитки, които използваме</h2>
          <ul className="lp-list">
            <li><b>Необходими:</b> нужни за вход и поддържане на активна сесия (Supabase Auth).</li>
            <li><b>Предпочитания (по избор):</b> настройки на интерфейса (напр. страница/тема), ако са внедрени.</li>
            <li><b>Аналитични (по избор):</b> само ако бъде добавена статистика в бъдеще (не е задължително за дипломната разработка).</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Как ги използва Trainify</h2>
          <ul className="lp-list">
            <li>Поддържане на сигурни сесии за вход</li>
            <li>Запомняне на основни предпочитания (ако е активирано)</li>
            <li>Подобряване на надеждността (напр. предотвратяване на повторни влизания)</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Управление на бисквитките</h2>
          <p className="lp-text">
            Можеш да управляваш бисквитките от настройките на браузъра си. Блокирането на „необходимите“ бисквитки може
            да попречи на Trainify да работи коректно.
          </p>
          <ul className="lp-list">
            <li>Изчисти бисквитките, ако използваш споделено устройство</li>
            <li>Изключи third-party cookies (Trainify използва основно first-party)</li>
            <li>Ползвай инкогнито режим, ако не искаш данни да се пазят локално</li>
          </ul>
        </div>

        <div className="lp-section">
          <h2 className="lp-h2">Бъдещи подобрения</h2>
          <p className="lp-text">
            В продукционна версия Trainify може да включва банер за избор на предпочитания за бисквитки и възможност за
            включване/изключване на аналитични инструменти.
          </p>
        </div>

        <div className="lp-actions">
          <button className="lp-btn" onClick={() => setPage?.("home")}>
            Обратно към Начало
          </button>
        </div>
      </div>
    </div>
  );
}