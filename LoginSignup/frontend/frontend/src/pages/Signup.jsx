import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupUser, googleLogin } from '../services/authServices.js';
import { ProfileContext } from '../context/ProfileContext.jsx';
import { GoogleLogin } from '@react-oauth/google';

export default function Signup({ toggleMode }) {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('user'); // default is user
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const { login } = useContext(ProfileContext);
    const navigate = useNavigate();

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setLoading(true);
            setError('');
            const res = await googleLogin(credentialResponse.credential);
            if (res.success && res.token) {
                login(res.token, res.refreshToken);
                navigate('/profile');
            } else {
                setError(res.message || 'Google signup failed');
            }
        } catch (err) {
            setError(err.message || 'Google signup failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGithubLogin = () => {
        const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || "Ov23liGsnv6UI0jTYHVx";
        const redirectUri = encodeURIComponent("http://localhost:5173/auth/github/callback");
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !name || !password || !confirmPassword || !username) {
            return setError('Please fill in all fields');
        }
        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }
        setError('');
        setSuccessMessage('');
        setLoading(true);
        try {
            const result = await signupUser({ email, name, password, username, role });
            if (result.success) {
                setSuccessMessage(result.message || 'Signup successful! Please log in.');
                // Clear fields
                setEmail('');
                setName('');
                setUsername('');
                setPassword('');
                setConfirmPassword('');
                setRole('user');
                // Automatically switch to login after 2.5 seconds
                setTimeout(() => {
                    toggleMode();
                }, 2500);
            } else {
                setError(result.message || 'Signup failed');
            }
        } catch (err) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-card-content">
            <div className="auth-header">
                <h2>Create Account</h2>
                <p>Register to get started with role-based features</p>
            </div>
            
            {error && (
                <div className="status error-status animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="status-icon">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="status ok-status animate-fade-in">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="status-icon">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.73-5.21Z" clipRule="evenodd" />
                    </svg>
                    <span>{successMessage}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="field-group-row">
                    <div className="field">
                        <label htmlFor="signup-name">Full Name</label>
                        <input
                            id="signup-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="signup-username">Username</label>
                        <input
                            id="signup-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="johndoe"
                            required
                        />
                    </div>
                </div>

                <div className="field">
                    <label htmlFor="signup-email">Email Address</label>
                    <input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="signup-role">Select Role</label>
                    <select
                        id="signup-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="select-input"
                    >
                        <option value="user">User (Basic Access)</option>
                        <option value="manager">Manager (Intermediate Access)</option>
                        <option value="admin">Admin (Full System Access)</option>
                    </select>
                </div>

                <div className="field-group-row">
                    <div className="field">
                        <label htmlFor="signup-password">Password</label>
                        <input
                            id="signup-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="signup-confirm-password">Confirm Password</label>
                        <input
                            id="signup-confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                <button type="submit" className="button-primary" disabled={loading}>
                    {loading ? (
                        <>
                            <span className="spinner"></span>
                            <span>Creating Account...</span>
                        </>
                    ) : 'Register'}
                </button>
            </form>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <GoogleLogin
                    text="signup_with"
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                        setError('Google signup failed. Please try again.');
                    }}
                />
                <button
                    type="button"
                    onClick={handleGithubLogin}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        backgroundColor: '#24292e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '9px 16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        width: '215px'
                    }}
                >
                    <svg height="18" width="18" viewBox="0 0 16 16" fill="white">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    Sign up with GitHub
                </button>
            </div>

            <div className="auth-links">
                <span className="small-muted">Already have an account?</span>
                <button type="button" onClick={toggleMode} className="text-link-btn">
                    Sign In
                </button>
            </div>
        </div>
    );
}