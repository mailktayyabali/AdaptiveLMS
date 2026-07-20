import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileContext } from '../context/ProfileContext.jsx';
import { login as loginUser, register as signupUser } from '../services/authServices.js';
import Form from './Form.jsx';

export default function Main() {
    const navigate = useNavigate();
    const { login } = useContext(ProfileContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);
    const [isLoginMode, setIsLoginMode] = useState(true);
    const submitBtnText = isLoginMode ? 'Login' : 'Sign up';
    const toggleBtnText = isLoginMode ? 'Sign up' : 'Login';
    const modeText = isLoginMode ? 'No account yet?' : 'Already have an account?';

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const calledFunction = isLoginMode ? loginUser : signupUser;
            const result = await calledFunction(username, password);
            setData(result);
            if (result.token) {
                login(result.token);
                navigate('/profile');
            }
        } catch (error) {
            // console.error('Error occurred:', error);
            setErr(error);
        }
    };

    const handleUsernameInput = (e) => {
        setUsername(e.target.value);
    };

    const handlePasswordInput = (e) => {
        setPassword(e.target.value);
    };

    const handleSignupText = () => {
        setIsLoginMode(prevMode => !prevMode);
    };

    return (
        <>
            {data && (
                <div className={data.success ? 'status ok-status' : 'status error-status'}>
                    {data.message}
                </div>
            )}
            <Form
                handleSubmit={handleSubmit}
                handleUsernameInput={handleUsernameInput}
                handlePasswordInput={handlePasswordInput}
                username={username}
                password={password}
                isLoginMode={isLoginMode}
                submitBtnText={submitBtnText}
            />
            <div className="signup-wrapper">
                <p>{modeText}</p>
                <button onClick={handleSignupText} className="login-btn signup-btn">
                    {toggleBtnText}
                </button>
            </div>
        </>
    );
};
