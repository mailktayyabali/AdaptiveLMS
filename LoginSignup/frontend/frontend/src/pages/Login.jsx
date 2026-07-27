import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, sendOtp, verifyOtpLogin, resetPasswordOtp } from "../services/authServices.js";
import { ProfileContext } from "../context/ProfileContext.jsx";

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