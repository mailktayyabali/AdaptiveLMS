import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, sendOtp, verifyOtpLogin, resetPasswordOtp, googleLogin } from "../services/authServices.js";
import { ProfileContext } from "../context/ProfileContext.jsx";
import { GoogleLogin } from "@react-oauth/google";
import { ArrowRight, Loader2, KeyRound, Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Login({ toggleMode }) {
    // Mode: 'password' or 'otp'
    const [authMethod, setAuthMethod] = useState('password');
    
    // Password states
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // OTP states
    const [otpStep, setOtpStep] = useState(1); // 1: Send OTP, 2: Verify OTP
    const [otpEmail, setOtpEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [isResetPassword, setIsResetPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    // Feedback & Loading
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    
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
                setError(res.message || 'Google login failed');
            }
        } catch (err) {
            setError(err.message || 'Google login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGithubLogin = () => {
        const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || "Ov23liGsnv6UI0jTYHVx";
        const redirectUri = encodeURIComponent("http://localhost:5173/auth/github/callback");
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
    };

    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            return setError('Please fill in all fields');
        }
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
            const result = await loginUser(username, password);
            if (result.success && result.token) {
                login(result.token, result.refreshToken);
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

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!otpEmail) {
            return setError('Please enter your email address');
        }
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
            const res = await sendOtp(otpEmail);
            setSuccessMsg(res.message || 'OTP sent to your email successfully!');
            setOtpStep(2);
        } catch (err) {
            setError(err.message || 'Failed to send OTP email.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtpLogin = async (e) => {
        e.preventDefault();
        if (!otpCode) {
            return setError('Please enter the 6-digit OTP code');
        }
        setError('');
        setSuccessMsg('');
        setLoading(true);
        try {
            if (isResetPassword) {
                if (!newPassword || newPassword.length < 6) {
                    setLoading(false);
                    return setError('New password must be at least 6 characters');
                }
                const resetRes = await resetPasswordOtp(otpEmail, otpCode, newPassword);
                setSuccessMsg(resetRes.message || 'Password reset successfully! Logging you in...');
                const loginRes = await loginUser(otpEmail, newPassword);
                if (loginRes.success && loginRes.token) {
                    login(loginRes.token, loginRes.refreshToken);
                    navigate('/profile');
                }
            } else {
                const res = await verifyOtpLogin(otpEmail, otpCode);
                if (res.success && res.token) {
                    login(res.token, res.refreshToken);
                    navigate('/profile');
                } else {
                    setError(res.message || 'OTP verification failed.');
                }
            }
        } catch (err) {
            setError(err.message || 'Invalid or expired OTP code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Header / Title */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-1">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                    {authMethod === 'password' 
                        ? 'Welcome Back' 
                        : (otpStep === 1 ? 'Instant OTP Sign In' : (isResetPassword ? 'Set New Password' : 'Confirm Security Code'))}
                </h2>
                <p className="text-xs text-slate-400">
                    {authMethod === 'password' 
                        ? 'Authenticate to access your workspace and documents' 
                        : (otpStep === 1 ? 'Enter your email to receive a temporary one-time password' : `6-digit code delivered to ${otpEmail}`)}
                </p>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="p-1 rounded-xl bg-black/40 border border-white/[0.08] flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => { setAuthMethod('password'); setError(''); setSuccessMsg(''); }}
                    className={`scale-press flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        authMethod === 'password'
                            ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/10 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Password</span>
                </button>
                <button
                    type="button"
                    onClick={() => { setAuthMethod('otp'); setOtpStep(1); setError(''); setSuccessMsg(''); }}
                    className={`scale-press flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        authMethod === 'otp'
                            ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/10 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Mail className="w-3.5 h-3.5" />
                    <span>One-Time Code</span>
                </button>
            </div>

            {/* Social Authentication Providers */}
            <div className="flex flex-col gap-3 items-center">
                <div className="w-full flex justify-center">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google login failed. Please try again.')}
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
                    <span>Continue with GitHub</span>
                </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
                <div className="w-full border-t border-white/[0.08]" />
                <span className="absolute px-3 bg-[#0c101a] text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                    or continue with
                </span>
            </div>

            {/* Status Notifications */}
            {error && (
                <div className="p-3.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {successMsg && (
                <div className="p-3.5 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Form Mode 1: Password Login */}
            {authMethod === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="login-username" className="text-xs font-medium text-slate-300">
                            Username or Email
                        </label>
                        <div className="relative">
                            <input
                                id="login-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="name@domain.com"
                                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <label htmlFor="login-password" className="text-xs font-medium text-slate-300">
                                Password
                            </label>
                            <button
                                type="button"
                                onClick={() => { setAuthMethod('otp'); setOtpStep(1); setIsResetPassword(true); setError(''); setSuccessMsg(''); }}
                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                            >
                                Forgot Password?
                            </button>
                        </div>
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            required
                        />
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
                                <span>Sign In to Workspace</span>
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                                    <ArrowRight className="w-3 h-3 text-white" />
                                </div>
                            </>
                        )}
                    </button>
                </form>
            )}

            {/* Form Mode 2: OTP Login / Reset */}
            {authMethod === 'otp' && (
                <div>
                    {otpStep === 1 ? (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="otp-email" className="text-xs font-medium text-slate-300">
                                    Registered Email Address
                                </label>
                                <input
                                    id="otp-email"
                                    type="email"
                                    value={otpEmail}
                                    onChange={(e) => setOtpEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    required
                                />
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
                                        <span>Dispatch Verification Code</span>
                                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                                            <ArrowRight className="w-3 h-3 text-white" />
                                        </div>
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtpLogin} className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="otp-code" className="text-xs font-medium text-slate-300">
                                    Enter 6-Digit Code
                                </label>
                                <input
                                    id="otp-code"
                                    type="text"
                                    maxLength="6"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="••••••"
                                    className="w-full px-3.5 py-3 text-2xl font-mono font-bold tracking-[0.4em] text-center rounded-xl bg-black/40 border border-white/10 text-indigo-400 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-2 px-1">
                                <input
                                    type="checkbox"
                                    id="toggle-reset-pass"
                                    checked={isResetPassword}
                                    onChange={(e) => setIsResetPassword(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/20 bg-black/40 text-indigo-600 focus:ring-0 cursor-pointer"
                                />
                                <label htmlFor="toggle-reset-pass" className="text-xs text-slate-300 cursor-pointer select-none">
                                    Reset password with this code
                                </label>
                            </div>

                            {isResetPassword && (
                                <div className="space-y-1.5 animate-in fade-in duration-200">
                                    <label htmlFor="new-password" className="text-xs font-medium text-slate-300">
                                        New Account Password
                                    </label>
                                    <input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minimum 6 characters"
                                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        required={isResetPassword}
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="scale-press group w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-60 text-white rounded-xl font-semibold text-xs transition-all shadow-[0_4px_16px_rgba(79,70,229,0.3)] border border-indigo-400/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                    <>
                                        <span>{isResetPassword ? 'Set New Password & Enter' : 'Verify & Continue'}</span>
                                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                                            <ArrowRight className="w-3 h-3 text-white" />
                                        </div>
                                    </>
                                )}
                            </button>

                            <div className="flex justify-between items-center px-1 text-xs text-slate-400">
                                <button
                                    type="button"
                                    onClick={() => { setOtpStep(1); setError(''); setSuccessMsg(''); }}
                                    className="hover:text-white transition-colors"
                                >
                                    Change Email
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={loading}
                                    className="text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                                >
                                    Resend Code
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Bottom Toggle Footer */}
            <div className="pt-2 text-center text-xs text-slate-400">
                <span>New to CollabEditor? </span>
                <button 
                    type="button" 
                    onClick={toggleMode} 
                    className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                >
                    Create an account
                </button>
            </div>
        </div>
    );
}