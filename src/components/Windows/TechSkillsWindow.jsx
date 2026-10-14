// Ventana del portfolio que muestra las habilidades técnicas agrupadas por
// categoría (frontend, backend, bases de datos...) como barras de progreso
// que se rellenan con una pequeña animación al abrir la ventana.

import { useRef, useEffect, useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

// Dibuja una categoría de habilidades como una lista de barras de nivel.
const BarsView = memo(({ data, animated, t }) => {
    const renderCategory = (title, skills) => (
        <div className="skill-category" key={title}>
            <h3 className="category-title">{title}</h3>
            {skills.map((skill, index) => (
                <div key={skill.name} className="skill-item">
                    <div className="skill-name">{skill.name}</div>
                    <div className="skill-bar">
                        <div
                            className="skill-level"
                            style={{
                                width: animated ? `${skill.level}%` : '0%',
                                transitionDelay: `${index * 80}ms`,
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <>
            {renderCategory(t('skills.frontend'), data.techSkills.frontend)}
            {renderCategory(t('skills.backend'), data.techSkills.backend)}
            {renderCategory(t('skills.databases'), data.techSkills.databases)}
            {renderCategory(t('skills.others'), data.techSkills.others)}
        </>
    );
});
BarsView.displayName = 'BarsView';

const TechSkillsWindow = memo(({ data, initialPosition }) => {
    const { t } = useTranslation();
    const [animated, setAnimated] = useState(false);
    const contentRef = useRef(null);

    // Espera a que la ventana esté dibujada para empezar la animación de
    // las barras, así se ve cómo se rellenan en vez de aparecer ya llenas.
    useEffect(() => {
        const timer = requestAnimationFrame(() => setAnimated(true));
        return () => cancelAnimationFrame(timer);
    }, []);

    if (!data?.techSkills) return null;

    return (
        <FloatingWindow
            id="tech-skills-window"
            title={t('windows.techSkills')}
            initialPosition={initialPosition}
            initialSize={{ width: 500, height: 520 }}
        >
            <div className="tech-skills-content" ref={contentRef}>
                <BarsView data={data} animated={animated} t={t} />
            </div>
        </FloatingWindow>
    );
});

TechSkillsWindow.displayName = 'TechSkillsWindow';

export default TechSkillsWindow;
