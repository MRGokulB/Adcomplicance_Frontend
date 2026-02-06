import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCountsQuery } from '../../redux/api/notificationsApi';

const Header = () => {
    const navigate = useNavigate();

    // Real-time hook (automagically updated by WebSockets)
    const { data: counts } = useGetCountsQuery(undefined, {
        refetchOnFocus: true,
        refetchOnMountOrArgChange: true,
    });

    const unreadCount = counts?.unread || 0;

    return (
        <>
            {/* Absolute Notification Bell - Top Right */}
            <button
                className="fixed top-4 right-4 z-50 p-2.5 text-gray-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 bg-white shadow-md hover:shadow-lg transition-all"
                onClick={() => navigate('/notifications')}
                title="Notifications"
                aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {/* Real-time Badge with Pulse */}
                {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex items-center justify-center">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
                        <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white shadow-lg">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </span>
                )}
            </button>
        </>
    );
};

export default Header;
