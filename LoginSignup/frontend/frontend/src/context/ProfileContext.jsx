import { createContext, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export const ProfileContext = createContext({
    user: null,
    login: () => {},
    logout: () => {},
    updateUser: () => {}
});

export const ProfileProvider = ({ children }) => {
    // Synchronously initialize user state from localStorage so page refresh preserves logged in user
    const [user, setUser] = useState(() => {
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // If access token is expired but refresh token exists, preserve user session for auto-refresh
                if (decoded.exp && decoded.exp * 1000 < Date.now() && !refreshToken) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    return null;
                }
                return decoded;
            } catch (err) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                return null;
            }
        }
        return null;
    });

    const login = (token, refreshToken) => {
        if (token) localStorage.setItem('token', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        try {
            const decoded = jwtDecode(token);
            setUser(decoded);
        } catch (err) {
            console.error('Failed to decode token on login:', err);
        }
    };

    const updateUser = (updatedData, newToken) => {
        if (newToken) {
            localStorage.setItem('token', newToken);
            try {
                const decoded = jwtDecode(newToken);
                setUser((prev) => ({ ...prev, ...decoded, ...updatedData }));
                return;
            } catch (e) {
                // fallback
            }
        }
        setUser((prev) => (prev ? { ...prev, ...updatedData } : updatedData));
    };

    const logout = async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch (err) {
            // ignore network errors on logout
        }
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
    };

    return (
        <ProfileContext.Provider value={{ user, login, logout, updateUser }}>
            {children}
        </ProfileContext.Provider>
    );
};