'use client';
import { useEffect, useState } from 'react';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import '../dashboard/dashboard.css';
import './admin.css';

export default function AdminPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [tab, setTab] = useState('events');
    const [stats, setStats] = useState(null);
    const [pendingEvents, setPendingEvents] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [s, e, u] = await Promise.all([
                adminApi.stats(),
                adminApi.pendingEvents(),
                adminApi.users(),
            ]);
            setStats(s.stats);
            setPendingEvents(e.events);
            setUsersList(u.users);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleModerate = async (eventId, action) => {
        try {
            await adminApi.moderateEvent(eventId, { action, reason: action === 'reject' ? 'Does not meet guidelines' : '' });
            toast.success(`Event ${action}d successfully`);
            setPendingEvents(prev => prev.filter(e => e.id !== eventId));
            loadData();
        } catch (err) {
            toast.error(err.error || 'Action failed');
        }
    };

    const handleRoleChange = async (userId, role) => {
        try {
            await adminApi.changeRole(userId, { role });
            toast.success('Role updated');
            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
        } catch (err) {
            toast.error(err.error || 'Role change failed');
        }
    };

    const handleToggleActive = async (userId) => {
        try {
            await adminApi.toggleActive(userId);
            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_active: u.is_active ? 0 : 1 } : u));
            toast.success('User status updated');
        } catch (err) {
            toast.error(err.error || 'Toggle failed');
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="page-wrapper container">
                <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 24 }}></div>
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100 }}></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="page-wrapper">
            <div className="container">
                <div className="dashboard-header">
                    <div>
                        <h1 className="section-title">👑 Admin Dashboard</h1>
                        <p className="section-subtitle" style={{ marginBottom: 0 }}>Platform management & moderation</p>
                    </div>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">👥</div>
                            <div><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">Total Users</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📅</div>
                            <div><div className="stat-value">{stats.totalEvents}</div><div className="stat-label">Total Events</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">⏳</div>
                            <div><div className="stat-value">{stats.pendingEvents}</div><div className="stat-label">Pending Review</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🎫</div>
                            <div><div className="stat-value">{stats.totalTickets}</div><div className="stat-label">Total Tickets</div></div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="dashboard-tabs">
                    <button className={`dashboard-tab ${tab === 'events' ? 'active' : ''}`} onClick={() => setTab('events')}>
                        ⏳ Pending Events ({pendingEvents.length})
                    </button>
                    <button className={`dashboard-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
                        👥 User Management ({usersList.length})
                    </button>
                </div>

                {/* Pending Events */}
                {tab === 'events' && (
                    <div>
                        {pendingEvents.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">✅</div>
                                <h3>All caught up!</h3>
                                <p>No events pending review</p>
                            </div>
                        ) : (
                            <div className="moderation-grid">
                                {pendingEvents.map(event => (
                                    <div key={event.id} className="moderation-card card">
                                        <div className="moderation-card-header" style={{ background: `${event.category_color || '#7c3aed'}15` }}>
                                            <span className="moderation-emoji">{event.category_icon || '📅'}</span>
                                            <span className="badge badge-yellow">Pending Review</span>
                                        </div>
                                        <div className="moderation-card-body">
                                            <h3>{event.title}</h3>
                                            <div className="moderation-meta">
                                                <span>👤 {event.organizer_name}</span>
                                                <span>📅 {formatDate(event.date)}</span>
                                                <span>📍 {event.is_online ? 'Online' : event.city || event.location}</span>
                                                <span>👥 {event.capacity} capacity</span>
                                                <span>💰 {event.price > 0 ? `$${event.price}` : 'Free'}</span>
                                            </div>
                                            <p className="moderation-desc">{event.short_description || event.description?.substring(0, 150)}</p>
                                            <div className="moderation-actions">
                                                <button className="btn btn-primary btn-sm" onClick={() => handleModerate(event.id, 'approve')}>✅ Approve</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleModerate(event.id, 'reject')}>❌ Reject</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* User Management */}
                {tab === 'users' && (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Events</th>
                                    <th>Tickets</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersList.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                                    {u.name?.charAt(0)}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{u.name}</span>
                                            </div>
                                        </td>
                                        <td>{u.email}</td>
                                        <td>
                                            <select className="form-select" value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} style={{ width: 120, padding: '4px 8px', fontSize: 13 }}>
                                                <option value="attendee">Attendee</option>
                                                <option value="organizer">Organizer</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td>{u.eventCount ?? u.event_count ?? 0}</td>
                                        <td>{u.ticketCount ?? u.ticket_count ?? 0}</td>
                                        <td>
                                            <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                                                {u.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleToggleActive(u.id)}>
                                                {u.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
