import { useEffect, useContext, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { githubLogin } from '../services/authServices.js';
import { ProfileContext } from '../context/ProfileContext.jsx';

export default function GithubCallback() {
    const [searchParams] = useSearchParams();
    const { login } = useContext(ProfileContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const hasCalledApi = useRef(false);

    useEffect(() => {
        const code = searchParams.get('code');
        if (code && !hasCalledApi.current) {
            hasCalledApi.current = true;
            githubLogin(code)
                .then(res => {
                    if (res.success && res.token) {
                        login(res.token);
                        navigate('/profile');
                    } else {
                        setError(res.message || 'GitHub login failed');
                    }
                })
                .catch(err => {
                    setError(err.message || 'GitHub login failed');
                });
        }
    }, [searchParams, login, navigate]);

    return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
            {error ? (
                <div style={{ color: 'red' }}>
                    <h3>GitHub Authentication Error</h3>
                    <p>{error}</p>
                    <button onClick={() => navigate('/')} className="button-primary">Return to Login</button>
                </div>
            ) : (
                <div>
                    <h3>Authenticating with GitHub...</h3>
                </div>
            )}
        </div>
    );
}
