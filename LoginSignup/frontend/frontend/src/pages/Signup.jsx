import { useState } from 'react';
import { signupUser } from '../services/authServices.js';

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

            <div className="auth-links">
                <span className="small-muted">Already have an account?</span>
                <button type="button" onClick={toggleMode} className="text-link-btn">
                    Sign In
                </button>
            </div>
        </div>
    );
}