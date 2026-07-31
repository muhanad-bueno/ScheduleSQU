import { useLanguage } from './LanguageContext';

export default function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <button className="icon-btn lang-text-btn" onClick={toggleLang} aria-label="Toggle language">
      <span className="lang-text">
        {lang === 'en' ? 'AR' : 'EN'}
      </span>
    </button>
  );
}
