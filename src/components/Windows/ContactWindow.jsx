import FloatingWindow from './FloatingWindow';

const ContactWindow = ({ data, initialPosition }) => {
    if (!data) return null;

    return (
        <FloatingWindow
            id="contact-window"
            title="Contact"
            initialPosition={initialPosition}
            initialSize={{ width: 350, height: 280 }}
        >
            <div className="contact-content">
                <p className="contact-message">{data.contact.message}</p>
                <div className="contact-email">
                    <strong>{data.email}</strong>
                </div>

                <div className="contact-icons">
                    <div className="contact-icon" title="LinkedIn">
                        <span>in</span>
                    </div>
                    <div className="contact-icon" title="GitHub">
                        <span>gh</span>
                    </div>
                    <div className="contact-icon" title="Twitter">
                        <span>tw</span>
                    </div>
                    <div className="contact-icon" title="Instagram">
                        <span>ig</span>
                    </div>
                </div>
            </div>
        </FloatingWindow>
    );
};

export default ContactWindow;