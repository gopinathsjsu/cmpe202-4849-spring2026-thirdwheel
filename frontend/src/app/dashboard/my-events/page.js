'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { users as usersApi, events as eventsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import '../dashboard.css';

export default function MyEventsPage() {
    const { user } = useAuth();
    const [eventsList, setEventsList] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        Promise.all([
            usersApi.myEvents(statusFilter ? { status: statusFilter } : {}),
            usersApi.myStats(),
        ]).then(([e, s]) => {
            setEventsList(e.events);
            setStats(s.stats);
        }).catch(console.error).finally(() => setLoading(false));
    }, [statusFilter]);

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusBadge = (status) => {
        const map = {
            pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red',
            cancelled: 'badge-red', completed: 'badge-teal',
        };
        return map[status] || 'badge-violet';
    };

    return (
        <div className="page-wrapper">
            <div className="container">
                <div className="dashboard-header">
                    <div>
                        <h1 className="section-title">🎯 My Events</h1>
                        <p className="section-subtitle" style={{ marginBottom: 0 }}>Manage and track your events</p>
                    </div>
                    <Link href="/events/create" className="btn btn-primary">+ Create Event</Link>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">📅</div>
                            <div><div className="stat-value">{stats.totalEvents}</div><div className="stat-label">Total Events</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">✅</div>
                            <div><div className="stat-value">{stats.approvedEvents}</div><div className="stat-label">Approved</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">⏳</div>
                            <div><div className="stat-value">{stats.pendingEvents}</div><div className="stat-label">Pending</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">👥</div>
                            <div><div className="stat-value">{stats.totalAttendees}</div><div className="stat-label">Total Attendees</div></div>
                        </div>
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="dashboard-tabs">
                    <button className={`dashboard-tab ${!statusFilter ? 'active' : ''}`} onClick={() => setStatusFilter('')}>All</button>
                    <button className={`dashboard-tab ${statusFilter === 'approved' ? 'active' : ''}`} onClick={() => setStatusFilter('approved')}>Approved</button>
                    <button className={`dashboard-tab ${statusFilter === 'pending' ? 'active' : ''}`} onClick={() => setStatusFilter('pending')}>Pending</button>
                    <button className={`dashboard-tab ${statusFilter === 'rejected' ? 'active' : ''}`} onClick={() => setStatusFilter('rejected')}>Rejected</button>
                </div>

                {/* Events Table */}
                {loading ? (
                    <div>{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8 }}></div>)}</div>
                ) : eventsList.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📅</div>
                        <h3>No events found</h3>
                        <p>Create your first event to get started</p>
                        <Link href="/events/create" className="btn btn-primary">Create Event</Link>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Event</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Tickets</th>
                                    <th>Capacity</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eventsList.map(event => (
                                    <tr key={event.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span>{event.category_icon || '📅'}</span>
                                                <div>
                                                    <Link href={`/events/${event.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.title}</Link>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{formatDate(event.date)}</td>
                                        <td><span className={`badge ${getStatusBadge(event.status)}`}>{event.status}</span></td>
                                        <td>{event.tickets_sold}</td>
                                        <td>{event.capacity}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <Link href={`/events/${event.id}`} className="btn btn-ghost btn-sm">View</Link>
                                                {event.status === 'approved' && <Link href={`/dashboard/attendees/${event.id}`} className="btn btn-ghost btn-sm">Attendees</Link>}
                                            </div>
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
