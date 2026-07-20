import { ProfileContext } from '../context/ProfileContext.jsx';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
    const { user, logout } = useContext(ProfileContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        const confirmation = window.confirm('Are you sure you want to log out?');
        if (confirmation) {
            logout();
            navigate('/');
        }
    };

    return (
        <>
            <h1 className='greeting'>Welcome, {user?.user}!</h1>
            <button onClick={handleLogout} className='logout-btn login-btn'>Logout</button>
        </>
    );
}