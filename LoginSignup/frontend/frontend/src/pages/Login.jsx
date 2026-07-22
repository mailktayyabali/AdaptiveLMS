import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/authServices.js";
import { ProfileContext } from "../context/ProfileContext.jsx";

export default function Login({ toggleMode }) {
    const [username, setUsername] = useState(''); // Can be username or email
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const { login } = useContext(ProfileContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            return setError('Please fill in all fields');
        }
        setError('');
        setLoading(true);
        try {
            const result = await loginUser(username, password);
            if (result.success && result.token) {
                login(result.token);
                navigate('/profile');
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (err) {
            setError(err.message || 'Invalid username/email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-card-content">
            <div className="auth-header">
                <h2>Welcome Back</h2>
                <p>Sign in to access your secure portal</p>
            </div>
            
            {error && (
                <div className="status error-status animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="status-icon">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="field">
                    <label htmlFor="login-username">Username or Email</label>
                    <div className="input-container">
                        <input
                            id="login-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username or email"
                            required
                        />
                    </div>
                </div>

                <div className="field">
                    <label htmlFor="login-password">Password</label>
                    <div className="input-container">
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                <button type="submit" className="button-primary" disabled={loading}>
                    {loading ? (
                        <>
                            <span className="spinner"></span>
                            <span>Signing in...</span>
                        </>
                    ) : 'Sign In'}
                </button>
            </form>

            <div className="auth-links">
                <span className="small-muted">New to our platform?</span>
                <button type="button" onClick={toggleMode} className="text-link-btn">
                    Create an account
                </button>
            </div>
        </div>
    );
}