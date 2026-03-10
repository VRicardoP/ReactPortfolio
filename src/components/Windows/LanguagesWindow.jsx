import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const LEVEL_MAP = {
    'native': 5,
    'nativo': 5,
    'nativa': 5,
    'madrelingua': 5,
    '母語': 5,
    '母国語': 5,
    'muttersprache': 5,
    'maternel': 5,
    'maternelle': 5,
    'bilingual': 5,
    'bilingüe': 5,
    'bilingue': 5,
    'zweisprachig': 5,
    'バイリンガル': 5,
    'c2': 5,
    'c1': 4,
    'b2': 3,
    'b1': 2,
    'a2': 1,
    'a1': 1,
    'beginner': 1,
    'básico': 1,
    'base': 1,
    'grundkenntnisse': 1,
    '基礎': 1,
};

const getLevelDots = (levelStr) => {
    const lower = (levelStr || '').toLowerCase();
    for (const [key, dots] of Object.entries(LEVEL_MAP)) {
        if (lower.includes(key)) return dots;
    }
    return 3;
};

const LanguagesWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    if (!data) return null;

    return (
        <FloatingWindow
            id="languages-window"
            title={t('windows.languages')}
            initialPosition={initialPosition}
            initialSize={{ width: 300, height: 250 }}
        >
            <div className="languages-content">
                {data.languages.map((lang, index) => {
                    const filled = getLevelDots(lang.level);
                    return (
                        <div key={index} className="language-item">
                            <div className="language-name">{lang.language}</div>
                            <div className="language-level">
                                <span className="language-level-text">{lang.level}</span>
                                <span className="language-dots">
                                    {Array.from({ length: 5 }, (_, i) => (
                                        <span
                                            key={i}
                                            className={`language-dot${i < filled ? ' filled' : ''}`}
                                        />
                                    ))}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </FloatingWindow>
    );
};

export default LanguagesWindow;