import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, sendOtp, verifyOtpLogin, resetPasswordOtp, googleLogin } from "../services/authServices.js";
import { ProfileContext } from "../context/ProfileContext.jsx";
import { GoogleLogin } from "@react-oauth/google";

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
        <div className="w-full">
            <div className="text-center mb-5">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                    {authMethod === 'password' ? 'Welcome Back' : (otpStep === 1 ? 'Login with OTP' : (isResetPassword ? 'Reset Password' : 'Verify OTP'))}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {authMethod === 'password' 
                        ? 'Sign in to access your secure portal' 
                        : (otpStep === 1 ? 'Enter your email to receive an OTP code' : `Code sent to ${otpEmail}`)}
                </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => { setAuthMethod('password'); setError(''); setSuccessMsg(''); }}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors ${
                        authMethod === 'password'
                            ? 'bg-blue-600 text-white shadow'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                >
                    Password Login
                </button>
                <button
                    type="button"
                    onClick={() => { setAuthMethod('otp'); setOtpStep(1); setError(''); setSuccessMsg(''); }}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-colors ${
                        authMethod === 'otp'
                            ? 'bg-blue-600 text-white shadow'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                >
                    Login with OTP
                </button>
            </div>
            <div className="mt-4 mb-4 flex flex-col gap-2.5 items-center">
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                        setError('Google login failed. Please try again.');
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
                    Sign in with GitHub
                </button>
            </div>

            {error && (
                <div className="p-3 rounded-md text-sm mb-4 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-600 dark:text-red-300">
                    <span>{error}</span>
                </div>
            )}

            {successMsg && (
                <div className="p-3 rounded-md text-sm mb-4 bg-green-100 border border-green-400 text-green-700 dark:bg-green-900/40 dark:border-green-600 dark:text-green-300">
                    <span>{successMsg}</span>
                </div>
            )}

            {authMethod === 'password' && (
                <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5 min-w-0">
                        <label htmlFor="login-username" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Username or Email</label>
                        <input
                            id="login-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username or email"
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex justify-between items-center">
                            <label htmlFor="login-password" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Password</label>
                            <button
                                type="button"
                                onClick={() => { setAuthMethod('otp'); setOtpStep(1); setIsResetPassword(true); setError(''); setSuccessMsg(''); }}
                                className="bg-transparent border-0 text-blue-600 dark:text-blue-400 font-semibold underline text-xs cursor-pointer hover:text-blue-700"
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
                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer mt-1"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                <span>Signing in...</span>
                            </>
                        ) : 'Sign In'}
                    </button>
                </form>
            )}

            {authMethod === 'otp' && (
                <div>
                    {otpStep === 1 ? (
                        <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5 min-w-0">
                                <label htmlFor="otp-email" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Registered Email</label>
                                <input
                                    id="otp-email"
                                    type="email"
                                    value={otpEmail}
                                    onChange={(e) => setOtpEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer mt-1"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        <span>Sending Code...</span>
                                    </>
                                ) : 'Send OTP Code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtpLogin} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5 min-w-0">
                                <label htmlFor="otp-code" className="text-xs font-semibold text-slate-600 dark:text-slate-300">6-Digit OTP Code</label>
                                <input
                                    id="otp-code"
                                    type="text"
                                    maxLength="6"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    className="w-full px-3 py-2 text-xl font-bold tracking-widest text-center border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-2 my-1">
                                <input
                                    type="checkbox"
                                    id="toggle-reset-pass"
                                    checked={isResetPassword}
                                    onChange={(e) => setIsResetPassword(e.target.checked)}
                                    className="w-auto cursor-pointer"
                                />
                                <label htmlFor="toggle-reset-pass" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer m-0">
                                    Set new password for account
                                </label>
                            </div>

                            {isResetPassword && (
                                <div className="flex flex-col gap-1.5 min-w-0">
                                    <label htmlFor="new-password" className="text-xs font-semibold text-slate-600 dark:text-slate-300">New Password</label>
                                    <input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required={isResetPassword}
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer mt-1"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        <span>Verifying...</span>
                                    </>
                                ) : (isResetPassword ? 'Reset Password & Sign In' : 'Verify & Sign In')}
                            </button>

                            <div className="flex justify-between mt-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => { setOtpStep(1); setError(''); setSuccessMsg(''); }}
                                    className="bg-transparent border-0 text-blue-600 dark:text-blue-400 font-semibold underline cursor-pointer hover:text-blue-700"
                                >
                                    Change Email
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={loading}
                                    className="bg-transparent border-0 text-blue-600 dark:text-blue-400 font-semibold underline cursor-pointer hover:text-blue-700 disabled:opacity-50"
                                >
                                    Resend Code
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            <div className="mt-5 flex justify-center items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">New to our platform?</span>
                <button type="button" onClick={toggleMode} className="bg-transparent border-0 text-blue-600 dark:text-blue-400 font-semibold underline cursor-pointer hover:text-blue-700">
                    Create an account
                </button>
            </div>
        </div>
    );
}