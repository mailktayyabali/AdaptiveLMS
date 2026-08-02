import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '../pages/Login.jsx';
import Signup from '../pages/Signup.jsx';
import { ProfileContext } from '../context/ProfileContext.jsx';

export default function Main() {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const { user } = useContext(ProfileContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/profile');
        }
    }, [user, navigate]);

    const toggleMode = () => {
        setIsLoginMode(prev => !prev);
    };

    return (
        <main className="flex justify-center items-center min-h-[calc(100vh-100px)] px-4 py-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-lg">
                {isLoginMode ? (
                    <Login toggleMode={toggleMode} />
                ) : (
                    <Signup toggleMode={toggleMode} />
                )}
            </div>
        </main>
    );
}
