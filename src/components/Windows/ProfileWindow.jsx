import { useTranslation } from 'react-i18next';
import FloatingWindow from './FloatingWindow';

const ProfileWindow = ({ data, initialPosition }) => {
    const { t } = useTranslation();
    if (!data) return null;

    return (
        <FloatingWindow
            id="profile-window"
            title={t('windows.profile')}
            initialPosition={initialPosition}
            initialSize={{ width: 450, height: 300 }}
        >
            <div className="profile-content">
                <p className="profile-description">{data.profile.description}</p>
                <div className="profile-contact">
                    <p>📧 {data.email}</p>
                    <p>📍 {data.location}</p>
                </div>
            </div>
        </FloatingWindow>
    );
};

export default ProfileWindow;