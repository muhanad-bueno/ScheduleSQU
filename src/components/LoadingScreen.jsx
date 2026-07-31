import './LoadingScreen.css';

export default function LoadingScreen({ message = 'Loading...' }) {
    return (
        <div className="loading-screen">
            <div className="loading-content">
                <div className="spinner"></div>
                <p className="loading-text">{message}</p>
            </div>
        </div>
    );
}
