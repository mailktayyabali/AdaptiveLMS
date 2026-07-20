import {createContext,useState, useEffect} from 'react';
import {jwtDecode} from 'jwt-decode';

export const ProfileContext = createContext();
export const ProfileProvider = ({children}) => {
    const [user,setUser] = useState(null);
    const login =(token)=>{
        localStorage.setItem('token',token);
        const decodedUser = jwtDecode(token);
        setUser({user:decodedUser.user});
    };
    const logout=()=>{
        localStorage.removeItem('token');
    };
    useEffect(()=>{
        const token = localStorage.getItem('token');
        if(token){
            const decodedUser = jwtDecode(token);
            setUser({user:decodedUser.user});
        }
    },[]);
    return (
        <ProfileContext.Provider value={{user, login, logout}}>
            {children}
        </ProfileContext.Provider>
    );
}