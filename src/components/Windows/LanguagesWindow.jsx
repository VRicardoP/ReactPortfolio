import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

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
                {data.languages.map((lang, index) => (
                    <div key={index} className="language-item">
                        <div className="language-name">{lang.language}</div>
                        <div className="language-level">{lang.level}</div>
                    </div>
                ))}
            </div>
        </FloatingWindow>
    );
};

export default LanguagesWindow;