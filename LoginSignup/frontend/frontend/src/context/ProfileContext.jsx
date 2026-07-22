import {createContext,useState, useEffect} from 'react';
import {jwtDecode} from 'jwt-decode';

export const ProfileContext = createContext();
export const ProfileProvider = ({children}) => {
    const [user, setUser] = useState(null);
    
    const login = (token) => {
        localStorage.setItem('token', token);
        const decoded = jwtDecode(token);
        setUser(decoded);
    };
    
    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };
    
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check if token has expired
                if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    setUser(decoded);
                }
            } catch (err) {
                logout();
            }
        }
    }, []);
    
    return (
        <ProfileContext.Provider value={{user, login, logout}}>
            {children}
        </ProfileContext.Provider>
    );
}