import { createContext, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
    // Synchronously initialize user state from localStorage so page refresh preserves logged in user
    const [user, setUser] = useState(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check if token has expired
                if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                    localStorage.removeItem('token');
                    return null;
                }
                return decoded;
            } catch (err) {
                localStorage.removeItem('token');
                return null;
            }
        }
        return null;
    });

    const login = (token) => {
        localStorage.setItem('token', token);
        try {
            const decoded = jwtDecode(token);
            setUser(decoded);
        } catch (err) {
            console.error('Failed to decode token on login:', err);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <ProfileContext.Provider value={{ user, login, logout }}>
            {children}
        </ProfileContext.Provider>
    );
};