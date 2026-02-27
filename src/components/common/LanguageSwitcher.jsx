import useI18n from "../../i18n/useI18n";
import AppIcon from "./AppIcon";

function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className={`language-switch ${className}`.trim()}>
      <AppIcon name="globe" />
      <span>{t("common.language")}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        aria-label={t("common.language")}
      >
        <option value="en">{t("common.english")}</option>
        <option value="km">{t("common.khmer")}</option>
      </select>
    </label>
  );
}

export default LanguageSwitcher;


