import logo from '../assets/react.svg';
import NotificationBell from './NotificationBell.jsx';
import { Link, useLocation } from 'react-router-dom';
import { FileText, BookOpen, User, Home, Sparkles } from 'lucide-react';

export default function Header() {
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Home', icon: Home, exact: true },
        { path: '/documents', label: 'Documents', icon: FileText, exact: false },
        { path: '/courses', label: 'Courses', icon: BookOpen, exact: false },
        { path: '/profile', label: 'Profile', icon: User, exact: false },
    ];

    const isActive = (item) => {
        if (item.exact) return location.pathname === item.path;
        return location.pathname.startsWith(item.path);
    };

    return (
        <header className="sticky top-4 z-50 max-w-6xl w-[calc(100%-2rem)] mx-auto mb-8 px-4 sm:px-6 py-2.5 rounded-full bg-[#0c101a]/75 backdrop-blur-xl border border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.45)] flex items-center justify-between transition-all duration-300">
            {/* Brand Logo & Title */}
            <Link 
                to="/" 
                className="group flex items-center gap-3 scale-press"
            >
                <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600/30 to-violet-500/20 border border-indigo-500/30 group-hover:border-indigo-400/60 transition-colors">
                    <img 
                        src={logo} 
                        alt="Logo" 
                        className="w-5 h-5 opacity-90 group-hover:rotate-180 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" 
                    />
                    <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                        CollabEditor
                        <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                            <Sparkles className="w-2.5 h-2.5" /> Studio
                        </span>
                    </span>
                </div>
            </Link>

            {/* Floating Island Navigation Tabs */}
            <nav className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
                {navItems.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`scale-press flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                                active
                                    ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] border border-white/15 font-semibold'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                            <span className="hidden md:inline">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Action Bar / Notification */}
            <div className="relative flex items-center gap-2">
                <NotificationBell />
            </div>
        </header>
    );
}