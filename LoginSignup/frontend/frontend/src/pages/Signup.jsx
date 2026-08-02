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
        <div className="w-full">
            <div className="text-center mb-5">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Create Account</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Register to get started with role-based features</p>
            </div>
            
            {error && (
                <div className="p-3 rounded-md text-sm mb-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-600 dark:text-red-300 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="p-3 rounded-md text-sm mb-4 bg-green-100 border border-green-400 text-green-700 dark:bg-green-900/40 dark:border-green-600 dark:text-green-300 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.73-5.21Z" clipRule="evenodd" />
                    </svg>
                    <span>{successMessage}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <label htmlFor="signup-name" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Full Name</label>
                        <input
                            id="signup-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <label htmlFor="signup-username" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Username</label>
                        <input
                            id="signup-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="johndoe"
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 min-w-0">
                    <label htmlFor="signup-email" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email Address</label>
                    <input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div className="flex flex-col gap-1.5 min-w-0">
                    <label htmlFor="signup-role" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Select Role</label>
                    <select
                        id="signup-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="user">User (Basic Access)</option>
                        <option value="manager">Manager (Intermediate Access)</option>
                        <option value="admin">Admin (Full System Access)</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <label htmlFor="signup-password" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Password</label>
                        <input
                            id="signup-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <label htmlFor="signup-confirm-password" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Confirm Password</label>
                        <input
                            id="signup-confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer mt-1"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Creating Account...</span>
                        </>
                    ) : 'Register'}
                </button>
            </form>

            <div className="mt-4 flex flex-col gap-2.5 items-center">
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
                    className="w-[215px] flex items-center justify-center gap-2.5 bg-[#24292e] hover:bg-black text-white rounded py-2 px-4 text-sm font-medium transition-colors shadow-sm"
                >
                    <svg height="18" width="18" viewBox="0 0 16 16" fill="white">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    Sign up with GitHub
                </button>
            </div>

            <div className="mt-5 flex justify-center items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Already have an account?</span>
                <button type="button" onClick={toggleMode} className="bg-transparent border-0 text-blue-600 dark:text-blue-400 font-semibold underline cursor-pointer hover:text-blue-700">
                    Sign In
                </button>
            </div>
        </div>
    );
}