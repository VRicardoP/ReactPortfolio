import { useState } from 'react';
import '../../styles/tooltip.css';

const Tooltip = ({ children, text, position = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="tooltip-wrapper"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && text && (
                <div className={`cyberpunk-tooltip tooltip-${position}`}>
                    <div className="tooltip-content">{text}</div>
                    <div className="tooltip-glow"></div>
                </div>
            )}
        </div>
    );
};

export default Tooltip;