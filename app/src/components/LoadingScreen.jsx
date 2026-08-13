import './LoadingScreen.css';

export default function LoadingScreen({ message = 'Loading...' }) {
    return (
        <div className="hero-screen">
            <div className="hero-content">
                <svg className="hero-mark" width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
                    <rect className="hero-cell hero-cell-0" x="2" y="2" width="32" height="32" rx="2" />
                    <rect className="hero-cell hero-cell-1" x="38" y="2" width="32" height="32" rx="2" />
                    <rect className="hero-cell hero-cell-2" x="2" y="38" width="32" height="32" rx="2" />
                    <rect className="hero-cell hero-cell-3 hero-cell-active" x="38" y="38" width="32" height="32" rx="2" />
                </svg>
                <h1 className="hero-wordmark">ScheduleSQU</h1>
                <p className="hero-text">{message}</p>
            </div>
        </div>
    );
}
