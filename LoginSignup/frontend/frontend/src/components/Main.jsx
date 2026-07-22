import { useState } from 'react';
import Login from '../pages/Login.jsx';
import Signup from '../pages/Signup.jsx';

export default function Main() {
    const [isLoginMode, setIsLoginMode] = useState(true);

    const toggleMode = () => {
        setIsLoginMode(prev => !prev);
    };

    return (
        <main className="main-auth-container">
            <div className="auth-card animate-scale-up">
                {/* Form state toggling */}
                {isLoginMode ? (
                    <Login toggleMode={toggleMode} />
                ) : (
                    <Signup toggleMode={toggleMode} />
                )}
            </div>
        </main>
    );
}
