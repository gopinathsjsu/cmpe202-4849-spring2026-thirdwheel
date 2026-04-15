'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { events as eventsApi, tickets as ticketsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import './event-detail.css';

export default function EventDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const toast = useToast();
    const [event, setEvent] = useState(null);
    const [hasTicket, setHasTicket] = useState(false);
    const [userTicket, setUserTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ticketLoading, setTicketLoading] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        eventsApi.get(id).then(data => {
            setEvent(data.event);
            setHasTicket(data.hasTicket);
            setUserTicket(data.userTicket);
        }).catch(() => toast.error('Event not found'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleRegister = async () => {
        if (!user) { router.push('/login'); return; }
        setTicketLoading(true);
        try {
            await ticketsApi.purchase({ event_id: event.id, quantity });
            toast.success('Ticket confirmed');
            setHasTicket(true);
            setShowTicketModal(false);
            const data = await eventsApi.get(id);
            setEvent(data.event);
            setUserTicket(data.userTicket);
        } catch (err) {
            toast.error(err.error || 'Registration failed');
        } finally {
            setTicketLoading(false);
        }
    };

    if (loading) return <div className="container" style={{ padding: 60 }}>Loading…</div>;
    if (!event) return <div className="container" style={{ padding: 60 }}>Event not found.</div>;

    const isFree = !event.price || event.price === 0;
    const spotsLeft = event.capacity - event.tickets_sold;

    return (
        <div className="event-detail">
            <div className="container">
                <h1>{event.title}</h1>
                <p>{event.description}</p>
                {event.latitude && event.longitude && !event.is_online && (
                    <iframe
                        title="map"
                        width="100%" height="300" frameBorder="0" scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude - 0.01},${event.latitude - 0.01},${event.longitude + 0.01},${event.latitude + 0.01}&layer=mapnik&marker=${event.latitude},${event.longitude}`}
                    ></iframe>
                )}
                <a href={event.google_calendar_url} target="_blank" rel="noreferrer">Add to Google Calendar</a>
                <a href={`/api/events/${event.id}/calendar`}>Download .ics</a>
                <button className="btn btn-primary" onClick={() => setShowTicketModal(true)} disabled={hasTicket || spotsLeft <= 0}>
                    {hasTicket ? 'You have a ticket' : isFree ? 'Get Ticket' : `Buy Ticket — $${event.price}`}
                </button>
            </div>
            {showTicketModal && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <div className="modal-header"><h3>Confirm Registration</h3></div>
                        <div className="modal-body">
                            <p>{event.title}</p>
                            <select className="form-select" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))}>
                                {[1,2,3,4,5].filter(n => n <= spotsLeft).map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <p>Total: {isFree ? 'FREE' : `$${(event.price * quantity).toFixed(2)}`}</p>
                            {!isFree && <p>This is a mock payment — no real charges will be made.</p>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowTicketModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleRegister} disabled={ticketLoading}>
                                {ticketLoading ? 'Processing…' : 'Confirm Registration'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
