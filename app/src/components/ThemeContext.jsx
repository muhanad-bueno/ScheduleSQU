import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('theme') || 'light';
        } catch {
            return 'light';
        }
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('theme', theme);
        } catch {
            // Ignore storage errors
        }
    }, [theme]);

    const toggleTheme = () => {
        const update = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
        if (typeof document !== 'undefined' && document.startViewTransition) {
            document.startViewTransition(update);
        } else {
            const root = document.documentElement;
            root.classList.add('theme-transition');
            update();
            window.setTimeout(() => root.classList.remove('theme-transition'), 140);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
