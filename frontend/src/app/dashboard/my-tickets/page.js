'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tickets as ticketsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import '../dashboard.css';

export default function MyTicketsPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [ticketsList, setTicketsList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        ticketsApi.my().then(d => setTicketsList(d.tickets)).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleCancel = async (id) => {
        if (!confirm('Are you sure you want to cancel this ticket?')) return;
        try {
            await ticketsApi.cancel(id);
            toast.success('Ticket cancelled');
            setTicketsList(prev => prev.map(t => t.id === id ? { ...t, status: 'cancelled' } : t));
        } catch (err) {
            toast.error(err.error || 'Cancel failed');
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="page-wrapper container">
                <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 24 }}></div>
                {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12 }}></div>)}
            </div>
        );
    }

    return (
        <div className="page-wrapper">
            <div className="container">
                <div className="dashboard-header">
                    <div>
                        <h1 className="section-title">🎫 My Tickets</h1>
                        <p className="section-subtitle" style={{ marginBottom: 0 }}>Manage your event registrations</p>
                    </div>
                    <Link href="/events" className="btn btn-primary">Browse Events</Link>
                </div>

                {ticketsList.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🎫</div>
                        <h3>No tickets yet</h3>
                        <p>Browse events and register to see your tickets here</p>
                        <Link href="/events" className="btn btn-primary">Explore Events</Link>
                    </div>
                ) : (
                    <div className="tickets-list">
                        {ticketsList.map(ticket => (
                            <div key={ticket.id} className={`ticket-card card ${ticket.status === 'cancelled' ? 'ticket-cancelled' : ''}`}>
                                <div className="ticket-card-left" style={{ background: 'var(--gradient-card)' }}>
                                    <span className="ticket-card-emoji">{ticket.category_icon || '🎫'}</span>
                                    <span className={`badge ${ticket.status === 'confirmed' ? 'badge-green' : ticket.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <div className="ticket-card-body">
                                    <Link href={`/events/${ticket.event_id}`} className="ticket-title">{ticket.event_title}</Link>
                                    <div className="ticket-details">
                                        <span>📅 {formatDate(ticket.event_date)}</span>
                                        <span>📍 {ticket.event_is_online ? 'Online' : ticket.event_location}</span>
                                        <span>🎫 Code: {ticket.ticket_code}</span>
                                        <span>💰 {ticket.total_price > 0 ? `$${ticket.total_price}` : 'Free'}</span>
                                    </div>
                                </div>
                                <div className="ticket-card-actions">
                                    {ticket.status === 'confirmed' && (
                                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(ticket.id)}>Cancel</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
