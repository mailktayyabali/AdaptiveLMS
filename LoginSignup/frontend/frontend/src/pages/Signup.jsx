import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupUser, googleLogin } from '../services/authServices.js';
import { ProfileContext } from '../context/ProfileContext.jsx';
import { GoogleLogin } from '@react-oauth/google';
import { ArrowRight, Loader2, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

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
                setEmail('');
                setName('');
                setUsername('');
                setPassword('');
                setConfirmPassword('');
                setRole('user');
                setTimeout(() => {
                    toggleMode();
                }, 2000);
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
        <div className="w-full space-y-6">
            {/* Header / Title */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-1">
                    <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                    Create New Account
                </h2>
                <p className="text-xs text-slate-400">
                    Get started with real-time collaborative docs and coding sandboxes
                </p>
            </div>
            
            {/* Feedback Alerts */}
            {error && (
                <div className="p-3.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="p-3.5 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label htmlFor="signup-name" className="text-xs font-medium text-slate-300">
                            Full Name
                        </label>
                        <input
                            id="signup-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Alex Morgan"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="signup-username" className="text-xs font-medium text-slate-300">
                            Username
                        </label>
                        <input
                            id="signup-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="alexm"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="signup-email" className="text-xs font-medium text-slate-300">
                        Email Address
                    </label>
                    <input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@workspace.io"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="signup-role" className="text-xs font-medium text-slate-300">
                        Select Role
                    </label>
                    <select
                        id="signup-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#080c14] border border-white/10 text-white focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    >
                        <option value="user">User (Standard Collaborator)</option>
                        <option value="manager">Manager (Course & Content Manager)</option>
                        <option value="admin">Admin (Full System Administrator)</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label htmlFor="signup-password" className="text-xs font-medium text-slate-300">
                            Password
                        </label>
                        <input
                            id="signup-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="signup-confirm-password" className="text-xs font-medium text-slate-300">
                            Confirm Password
                        </label>
                        <input
                            id="signup-confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="scale-press group w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-60 text-white rounded-xl font-semibold text-xs transition-all shadow-[0_4px_16px_rgba(79,70,229,0.3)] border border-indigo-400/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                        <>
                            <span>Register & Launch Workspace</span>
                            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                                <ArrowRight className="w-3 h-3 text-white" />
                            </div>
                        </>
                    )}
                </button>
            </form>

            {/* Social Registration */}
            <div className="flex flex-col gap-3 items-center pt-2">
                <div className="w-full flex justify-center">
                    <GoogleLogin
                        text="signup_with"
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google signup failed. Please try again.')}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleGithubLogin}
                    className="scale-press w-full max-w-[280px] flex items-center justify-center gap-2.5 bg-white/[0.05] hover:bg-white/[0.09] text-white border border-white/10 rounded-xl py-2 px-4 text-xs font-medium transition-all shadow-sm"
                >
                    <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    <span>Sign up with GitHub</span>
                </button>
            </div>

            {/* Bottom Toggle Footer */}
            <div className="pt-2 text-center text-xs text-slate-400">
                <span>Already have an account? </span>
                <button 
                    type="button" 
                    onClick={toggleMode} 
                    className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                >
                    Sign In
                </button>
            </div>
        </div>
    );
}