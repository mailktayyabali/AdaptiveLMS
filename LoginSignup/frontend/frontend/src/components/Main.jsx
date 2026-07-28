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
        <main className="main-auth-container">
            <div className="auth-card animate-scale-up">
                {isLoginMode ? (
                    <Login toggleMode={toggleMode} />
                ) : (
                    <Signup toggleMode={toggleMode} />
                )}
            </div>
        </main>
    );
}
