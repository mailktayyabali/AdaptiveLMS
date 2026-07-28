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
                login(res.token);
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
                    login(loginRes.token);
                    navigate('/profile');
                }
            } else {
                const res = await verifyOtpLogin(otpEmail, otpCode);
                if (res.success && res.token) {
                    login(res.token);
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
        <div className="auth-card-content">
            <div className="auth-header">
                <h2>{authMethod === 'password' ? 'Welcome Back' : (otpStep === 1 ? 'Login with OTP' : (isResetPassword ? 'Reset Password' : 'Verify OTP'))}</h2>
                <p>
                    {authMethod === 'password' 
                        ? 'Sign in to access your secure portal' 
                        : (otpStep === 1 ? 'Enter your email to receive an OTP code' : `Code sent to ${otpEmail}`)}
                </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                    type="button"
                    onClick={() => { setAuthMethod('password'); setError(''); setSuccessMsg(''); }}
                    className={authMethod === 'password' ? 'button-primary' : 'btn-logout'}
                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                >
                    Password Login
                </button>
                <button
                    type="button"
                    onClick={() => { setAuthMethod('otp'); setOtpStep(1); setError(''); setSuccessMsg(''); }}
                    className={authMethod === 'otp' ? 'button-primary' : 'btn-logout'}
                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                >
                    Login with OTP
                </button>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                        setError('Google login failed. Please try again.');
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
                    Sign in with GitHub
                </button>
            </div>

            {error && (
                <div className="status error-status">
                    <span>{error}</span>
                </div>
            )}

            {successMsg && (
                <div className="status ok-status">
                    <span>{successMsg}</span>
                </div>
            )}

            {authMethod === 'password' && (
                <form onSubmit={handlePasswordLogin} className="auth-form">
                    <div className="field">
                        <label htmlFor="login-username">Username or Email</label>
                        <input
                            id="login-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username or email"
                            required
                        />
                    </div>

                    <div className="field">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label htmlFor="login-password">Password</label>
                            <button
                                type="button"
                                onClick={() => { setAuthMethod('otp'); setOtpStep(1); setIsResetPassword(true); setError(''); setSuccessMsg(''); }}
                                className="text-link-btn"
                                style={{ fontSize: '0.8rem' }}
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
                            required
                        />
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
            )}

            {authMethod === 'otp' && (
                <div>
                    {otpStep === 1 ? (
                        <form onSubmit={handleSendOtp} className="auth-form">
                            <div className="field">
                                <label htmlFor="otp-email">Registered Email</label>
                                <input
                                    id="otp-email"
                                    type="email"
                                    value={otpEmail}
                                    onChange={(e) => setOtpEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <button type="submit" className="button-primary" disabled={loading}>
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        <span>Sending Code...</span>
                                    </>
                                ) : 'Send OTP Code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtpLogin} className="auth-form">
                            <div className="field">
                                <label htmlFor="otp-code">6-Digit OTP Code</label>
                                <input
                                    id="otp-code"
                                    type="text"
                                    maxLength="6"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 'bold' }}
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                                <input
                                    type="checkbox"
                                    id="toggle-reset-pass"
                                    checked={isResetPassword}
                                    onChange={(e) => setIsResetPassword(e.target.checked)}
                                    style={{ width: 'auto', cursor: 'pointer' }}
                                />
                                <label htmlFor="toggle-reset-pass" style={{ fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                                    Set new password for account
                                </label>
                            </div>

                            {isResetPassword && (
                                <div className="field">
                                    <label htmlFor="new-password">New Password</label>
                                    <input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                        required={isResetPassword}
                                    />
                                </div>
                            )}

                            <button type="submit" className="button-primary" disabled={loading}>
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        <span>Verifying...</span>
                                    </>
                                ) : (isResetPassword ? 'Reset Password & Sign In' : 'Verify & Sign In')}
                            </button>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85rem' }}>
                                <button
                                    type="button"
                                    onClick={() => { setOtpStep(1); setError(''); setSuccessMsg(''); }}
                                    className="text-link-btn"
                                >
                                    Change Email
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={loading}
                                    className="text-link-btn"
                                >
                                    Resend Code
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            <div className="auth-links">
                <span className="small-muted">New to our platform?</span>
                <button type="button" onClick={toggleMode} className="text-link-btn">
                    Create an account
                </button>
            </div>
        </div>
    );
}