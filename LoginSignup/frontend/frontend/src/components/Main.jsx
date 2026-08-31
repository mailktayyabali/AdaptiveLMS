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
        <main className="relative flex justify-center items-center min-h-[calc(100vh-140px)] px-4 py-12">
            {/* Ambient Background Glow Orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-emerald-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

            {/* Double-Bezel Auth Container */}
            <div className="w-full max-w-lg double-bezel animate-in fade-in zoom-in-95 duration-500">
                <div className="double-bezel-inner p-6 sm:p-10">
                    {isLoginMode ? (
                        <Login toggleMode={toggleMode} />
                    ) : (
                        <Signup toggleMode={toggleMode} />
                    )}
                </div>
            </div>
        </main>
    );
}
