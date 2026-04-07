'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { events as eventsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import '../../dashboard.css';

export default function AttendeesPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        eventsApi.attendees(id).then(d => setData(d)).catch(console.error).finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="page-wrapper container">
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8 }}></div>)}
            </div>
        );
    }

    if (!data) {
        return <div className="page-wrapper container"><div className="empty-state"><h3>Event not found</h3></div></div>;
    }

    return (
        <div className="page-wrapper">
            <div className="container">
                <div className="breadcrumb">
                    <Link href="/dashboard/my-events">My Events</Link>
                    <span>/</span>
                    <span>{data.event.title}</span>
                    <span>/</span>
                    <span>Attendees</span>
                </div>

                <div className="dashboard-header">
                    <div>
                        <h1 className="section-title">👥 Attendees</h1>
                        <p className="section-subtitle" style={{ marginBottom: 0 }}>{data.event.title} • {data.total} registered</p>
                    </div>
                </div>

                {data.attendees.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <h3>No attendees yet</h3>
                        <p>Share your event to get registrations</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Ticket Code</th>
                                    <th>Quantity</th>
                                    <th>Status</th>
                                    <th>Registered</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.attendees.map(a => (
                                    <tr key={a.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                                    {a.name?.charAt(0)}
                                                </div>
                                                {a.name}
                                            </div>
                                        </td>
                                        <td>{a.email}</td>
                                        <td>{a.phone || '—'}</td>
                                        <td style={{ fontFamily: 'monospace' }}>{a.ticket_code}</td>
                                        <td>{a.quantity}</td>
                                        <td><span className={`badge ${a.status === 'confirmed' ? 'badge-green' : 'badge-yellow'}`}>{a.status}</span></td>
                                        <td>{new Date(a.created_at).toLocaleDateString()}</td>
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
