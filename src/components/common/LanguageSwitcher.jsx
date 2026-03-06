import useI18n from "../../i18n/useI18n";
import AppIcon from "./AppIcon";

function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage, t } = useI18n();
  const currentLanguageBadge = language === "km" ? "ខ" : "EN";
  const currentLanguageBadgeClassName =
    language === "km" ? "language-switch-badge-km" : "language-switch-badge-en";

  return (
    <div className={`language-switch ${className}`.trim()}>
      <AppIcon name="globe" />
      <span className="language-switch-label">{t("common.language")}</span>
      <span className={`language-switch-badge ${currentLanguageBadgeClassName}`.trim()}>
        {currentLanguageBadge}
      </span>
      <select
        className="language-switch-select"
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        aria-label={t("common.language")}
      >
        <option value="en">EN - {t("common.english")}</option>
        <option value="km">ខ - {t("common.khmer")}</option>
      </select>
    </div>
  );
}

export default LanguageSwitcher;


