import logo from '../assets/react.svg';
import NotificationBell from './NotificationBell.jsx';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
    const location = useLocation();

    return (
        <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md shadow-md py-4 px-6 mb-6 flex items-center justify-between relative z-50">
            <div className="flex items-center gap-6">
                <Link to="/" className="flex items-center gap-3">
                    <img src={logo} alt="Logo" className="w-8 h-8 animate-spin-slow" />
                    <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                        CollabEditor Portal
                    </h1>
                </Link>

                {/* Navigation Links */}
                <nav className="flex items-center gap-4 text-sm font-medium">
                    <Link
                        to="/"
                        className={`px-3 py-1.5 rounded-lg transition ${
                            location.pathname === '/'
                                ? 'bg-slate-800 text-indigo-400 font-semibold'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Home
                    </Link>
                    <Link
                        to="/documents"
                        className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                            location.pathname.startsWith('/documents')
                                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                        <span></span> Documents
                    </Link>
                    <Link
                        to="/profile"
                        className={`px-3 py-1.5 rounded-lg transition ${
                            location.pathname === '/profile'
                                ? 'bg-slate-800 text-indigo-400 font-semibold'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Profile
                    </Link>
                </nav>
            </div>

            <div className="relative z-50">
                <NotificationBell />
            </div>
        </header>
    );
}