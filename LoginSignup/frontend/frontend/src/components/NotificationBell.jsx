import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        let socketInstance = null;

        const connectSocket = () => {
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
            if (!token || socketInstance) return;

            fetchNotifications(token);

            socketInstance = io('http://localhost:5000', {
                auth: { token },
                transports: ['websocket', 'polling']
            });

            socketInstance.on('connect', () => {
                console.log('⚡ Connected to Notification Socket');
            });

            // Listen for live incoming notifications
            socketInstance.on('notification', (newNotification) => {
                console.log('🔔 Live Notification received:', newNotification);
                setNotifications(prev => [newNotification, ...prev]);
                setUnreadCount(prev => prev + 1);

                toast.info(`🔔 ${newNotification.message}`, {
                    position: "top-center",
                    autoClose: 5000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    theme: "dark"
                });
            });

            socketInstance.on('connect_error', (err) => {
                console.error('Socket Connection Error:', err.message);
            });
        };

        connectSocket();

        const interval = setInterval(() => {
            if (!socketInstance) {
                connectSocket();
            }
        }, 1500);

        return () => {
            clearInterval(interval);
            if (socketInstance) {
                socketInstance.disconnect();
            }
        };
    }, []);

    const fetchNotifications = async (token) => {
        try {
            const response = await fetch('http://localhost:5000/api/notifications', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!token) return;

        try {
            await fetch('http://localhost:5000/api/notifications/read-all', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking notifications read:', error);
        }
    };

    const handleMarkSingleRead = async (id) => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!token) return;

        try {
            await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification read:', error);
        }
    };

    return (
        <div className="relative">
            
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors focus:outline-none"
                title="Notifications"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

          
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 bg-slate-800/90 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="font-semibold text-white text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-blue-400 hover:underline font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-sm">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n._id}
                                    onClick={() => handleMarkSingleRead(n._id)}
                                    className={`p-3 transition-colors cursor-pointer text-sm hover:bg-slate-800/80 ${
                                        n.isRead ? 'bg-slate-900 text-slate-400' : 'bg-slate-800/50 text-slate-100 font-medium'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-1 block">
                                            {n.type?.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
