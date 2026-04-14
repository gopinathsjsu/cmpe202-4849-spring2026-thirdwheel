'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notifications as notifApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import './notifications.css';

export default function NotificationsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        notifApi.list().then(d => {
            setItems(d.notifications);
            setUnreadCount(d.unread_count);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleMarkRead = async (id) => {
        try {
            await notifApi.markRead(id);
            setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notifApi.markAllRead();
            setItems(prev => prev.map(n => ({ ...n, is_read: 1 })));
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        } catch (err) {
            toast.error(err.error || 'Failed');
        }
    };

    const getTypeIcon = (type) => {
        const map = { ticket: '🎫', event: '📅', admin: '👑', system: '⚙️', reminder: '🔔' };
        return map[type] || '🔔';
    };

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="page-wrapper">
            <div className="container" style={{ maxWidth: 720 }}>
                <div className="dashboard-header">
                    <div>
                        <h1 className="section-title">🔔 Notifications</h1>
                        <p className="section-subtitle" style={{ marginBottom: 0 }}>
                            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>Mark All Read</button>
                    )}
                </div>

                {loading ? (
                    <div>{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 8 }}></div>)}</div>
                ) : items.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔔</div>
                        <h3>No notifications</h3>
                        <p>You&apos;ll see notifications about your events and tickets here</p>
                    </div>
                ) : (
                    <div className="notifications-list">
                        {items.map(n => (
                            <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`} onClick={() => !n.is_read && handleMarkRead(n.id)}>
                                <div className="notification-icon">{getTypeIcon(n.type)}</div>
                                <div className="notification-body">
                                    <div className="notification-title">{n.title}</div>
                                    <div className="notification-message">{n.message}</div>
                                    <div className="notification-time">{timeAgo(n.created_at)}</div>
                                </div>
                                {!n.is_read && <div className="notification-unread-dot"></div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
