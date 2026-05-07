'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { events as eventsApi, tickets as ticketsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import StripeCheckout from './StripeCheckout';
import './event-detail.css';

function RescheduleModal({ event, onClose, onSubmit }) {
    const [date, setDate] = useState(event.date);
    const [time, setTime] = useState(event.time);
    const [endDate, setEndDate] = useState(event.end_date || '');
    const [endTime, setEndTime] = useState(event.end_time || '');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📅 Reschedule Event</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
                        Change date/time for <strong>{event.title}</strong>. All registered attendees will receive an email + notification with the new schedule.
                    </p>
                    <div className="form-group">
                        <label className="form-label">New start date</label>
                        <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">New start time</label>
                        <input className="form-input" type="time" value={time} onChange={e => setTime(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">End date (optional)</label>
                        <input className="form-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">End time (optional)</label>
                        <input className="form-input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Reason (shown in email)</label>
                        <textarea className="form-input" rows={2} value={reason} onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Venue change, weather, scheduling conflict…" />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
                    <button className="btn btn-primary" disabled={busy} onClick={async () => {
                        setBusy(true);
                        try {
                            await onSubmit({ date, time, end_date: endDate || null, end_time: endTime || null, reason });
                        } finally { setBusy(false); }
                    }}>{busy ? 'Saving…' : 'Reschedule + Notify'}</button>
                </div>
            </div>
        </div>
    );
}

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
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        eventsApi.get(id).then(data => {
            setEvent(data.event);
            setHasTicket(data.hasTicket);
            setUserTicket(data.userTicket);
        }).catch(() => toast.error('Event not found'))
            .finally(() => setLoading(false));
    }, [id]);

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${hour % 12 || 12}:${m} ${ampm}`;
    };

    const handleRegister = async () => {
        if (!user) { router.push('/login'); return; }
        setTicketLoading(true);
        try {
            await ticketsApi.purchase({ event_id: event.id, quantity });
            toast.success('🎫 Ticket confirmed! Check your email.');
            setHasTicket(true);
            setShowTicketModal(false);
            // Refresh event data
            const data = await eventsApi.get(id);
            setEvent(data.event);
            setUserTicket(data.userTicket);
        } catch (err) {
            toast.error(err.error || 'Registration failed');
        } finally {
            setTicketLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!userTicket) return;
        try {
            await ticketsApi.cancel(userTicket.id);
            toast.success('Ticket cancelled');
            setHasTicket(false);
            setUserTicket(null);
            const data = await eventsApi.get(id);
            setEvent(data.event);
        } catch (err) {
            toast.error(err.error || 'Cancel failed');
        }
    };

    const handleCancelEvent = async () => {
        if (!confirm(`Cancel "${event.title}"? All registered attendees will be notified by email.`)) return;
        const reason = prompt('Reason (optional, shown in cancellation email):') || '';
        try {
            const r = await eventsApi.cancel(event.id, reason);
            toast.success(`Event cancelled. ${r.attendeesNotified || 0} attendees notified.`);
            const data = await eventsApi.get(id);
            setEvent(data.event);
            setHasTicket(false);
            setUserTicket(null);
        } catch (err) {
            toast.error(err.error || 'Cancel event failed');
        }
    };

    const handleReschedule = async ({ date, time, end_date, end_time, reason }) => {
        try {
            const r = await eventsApi.reschedule(event.id, { date, time, end_date, end_time, reason });
            toast.success(`Event rescheduled. ${r.attendeesNotified || 0} attendees notified.`);
            setShowRescheduleModal(false);
            const data = await eventsApi.get(id);
            setEvent(data.event);
        } catch (err) {
            toast.error(err.error || 'Reschedule failed');
        }
    };

    if (loading) {
        return (
            <div className="page-wrapper container">
                <div className="skeleton" style={{ height: 300, borderRadius: 16, marginBottom: 24 }}></div>
                <div className="skeleton" style={{ height: 40, width: '60%', marginBottom: 12 }}></div>
                <div className="skeleton" style={{ height: 20, width: '40%' }}></div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="page-wrapper container">
                <div className="empty-state">
                    <div className="empty-state-icon">😕</div>
                    <h3>Event not found</h3>
                    <Link href="/events" className="btn btn-primary">Browse Events</Link>
                </div>
            </div>
        );
    }

    const spotsLeft = event.spots_left;
    const isFull = spotsLeft <= 0;
    const isFree = event.price === 0;
    const schedule = event.schedule || [];

    return (
        <div className="page-wrapper">
            <div className="container">
                {/* Breadcrumb */}
                <div className="breadcrumb">
                    <Link href="/events">Events</Link>
                    <span>/</span>
                    <span>{event.title}</span>
                </div>

                <div className="event-detail-layout">
                    {/* Main Content */}
                    <div className="event-detail-main">
                        {/* Hero Banner */}
                        <div className="event-detail-banner" style={{ background: event.category_color ? `linear-gradient(135deg, ${event.category_color}22, ${event.category_color}08)` : 'var(--gradient-card)' }}>
                            <div className="banner-content">
                                <span className="banner-emoji">{event.category_icon || '📅'}</span>
                                {event.is_featured === 1 && <span className="event-card-featured">⭐ Featured</span>}
                            </div>
                        </div>

                        <div className="event-detail-content">
                            {/* Category */}
                            {event.category_name && (
                                <Link href={`/events?category=${event.category_slug}`} className="badge badge-violet" style={{ marginBottom: 12, display: 'inline-flex' }}>
                                    {event.category_icon} {event.category_name}
                                </Link>
                            )}

                            <h1 className="event-detail-title">{event.title}</h1>

                            <div className="event-detail-organizer">
                                <div className="organizer-avatar">{event.organizer_name?.charAt(0)}</div>
                                <div>
                                    <span className="organizer-label">Organized by</span>
                                    <span className="organizer-name">{event.organizer_name}</span>
                                </div>
                            </div>

                            <div className="event-detail-description">
                                <h3>About This Event</h3>
                                <p>{event.description}</p>
                            </div>

                            {/* Schedule */}
                            {schedule.length > 0 && (
                                <div className="event-detail-schedule">
                                    <h3>📋 Schedule</h3>
                                    <div className="schedule-list">
                                        {schedule.map((item, idx) => (
                                            <div key={idx} className="schedule-item">
                                                <div className="schedule-time">{formatTime(item.time)}</div>
                                                <div className="schedule-info">
                                                    <div className="schedule-title">{item.title}</div>
                                                    {item.description && <div className="schedule-desc">{item.description}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Map placeholder for location */}
                            {!event.is_online && event.latitude && event.longitude && (
                                <div className="event-detail-map">
                                    <h3>📍 Location</h3>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="map-container"
                                        style={{ display: 'block', position: 'relative' }}
                                        title="Open in Google Maps"
                                    >
                                        <iframe
                                            width="100%"
                                            height="300"
                                            style={{ border: 0, borderRadius: 12, pointerEvents: 'none' }}
                                            loading="lazy"
                                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude - 0.01},${event.latitude - 0.01},${event.longitude + 0.01},${event.latitude + 0.01}&layer=mapnik&marker=${event.latitude},${event.longitude}`}
                                        ></iframe>
                                        <span style={{
                                            position: 'absolute', bottom: 12, right: 12,
                                            background: 'rgba(0,0,0,0.75)', color: '#fff',
                                            padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                        }}>
                                            🔗 Open in Google Maps ↗
                                        </span>
                                    </a>
                                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                                        {event.address ? `${event.address}, ` : ''}{event.city}{event.state ? `, ${event.state}` : ''} {event.zip || ''}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="event-detail-sidebar">
                        <div className="sidebar-card card">
                            <div className="sidebar-price">
                                {isFree ? (
                                    <span className="price-free">FREE</span>
                                ) : (
                                    <span className="price-amount">${event.price}</span>
                                )}
                            </div>

                            <div className="sidebar-info">
                                <div className="sidebar-info-item">
                                    <span className="info-icon">📅</span>
                                    <div>
                                        <div className="info-label">Date</div>
                                        <div className="info-value">{formatDate(event.date)}</div>
                                        {event.end_date && event.end_date !== event.date && (
                                            <div className="info-value" style={{ fontSize: 12 }}>to {formatDate(event.end_date)}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="sidebar-info-item">
                                    <span className="info-icon">🕐</span>
                                    <div>
                                        <div className="info-label">Time</div>
                                        <div className="info-value">{formatTime(event.time)}{event.end_time ? ` - ${formatTime(event.end_time)}` : ''}</div>
                                    </div>
                                </div>
                                <div className="sidebar-info-item">
                                    <span className="info-icon">{event.is_online ? '💻' : '📍'}</span>
                                    <div>
                                        <div className="info-label">Location</div>
                                        <div className="info-value">{event.is_online ? 'Online Event' : event.location}</div>
                                        {event.venue_name && <div className="info-value" style={{ fontSize: 12 }}>{event.venue_name}</div>}
                                    </div>
                                </div>
                                <div className="sidebar-info-item">
                                    <span className="info-icon">👥</span>
                                    <div>
                                        <div className="info-label">Capacity</div>
                                        <div className="info-value">{spotsLeft > 0 ? `${spotsLeft} spots left` : 'Sold Out'} ({event.tickets_sold}/{event.capacity})</div>
                                        <div className="capacity-bar" style={{ marginTop: 6 }}>
                                            <div className="capacity-fill" style={{ width: `${(event.tickets_sold / event.capacity * 100)}%`, background: isFull ? 'var(--red)' : 'var(--violet)' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions — role-aware */}
                            <div className="sidebar-actions">
                                {(() => {
                                    const isAdmin = user?.role === 'admin';
                                    const isOwner = user && event.organizer_id === user.id;
                                    const isCancelled = event.status === 'cancelled';
                                    const isCompleted = event.status === 'completed';

                                    if (isCancelled) {
                                        return <div className="ticket-confirmed" style={{ background: '#ef4444' }}>
                                            <span>❌</span> Event Cancelled
                                        </div>;
                                    }
                                    if (isCompleted) {
                                        return <div className="ticket-confirmed" style={{ background: '#64748b' }}>
                                            <span>✓</span> Event Completed
                                        </div>;
                                    }

                                    // Admin: show cancel-event button (no register, since admins are not attendees here)
                                    if (isAdmin) {
                                        return <>
                                            <div style={{ background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                                                🛡️ <strong>Admin actions</strong>
                                            </div>
                                            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowRescheduleModal(true)}>
                                                📅 Reschedule Event
                                            </button>
                                            <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleCancelEvent}>
                                                ❌ Cancel Event
                                            </button>
                                        </>;
                                    }

                                    // Organizer of this event: cancel + reschedule (no register on own event)
                                    if (isOwner) {
                                        return <>
                                            <div style={{ background: 'rgba(124,58,237,0.1)', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                                                ✨ <strong>Your event</strong> — manage below
                                            </div>
                                            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowRescheduleModal(true)}>
                                                📅 Reschedule Event
                                            </button>
                                            <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleCancelEvent}>
                                                ❌ Cancel Event
                                            </button>
                                            <Link href={`/dashboard/attendees/${event.id}`} className="btn btn-ghost" style={{ width: '100%' }}>
                                                👥 View Attendees ({event.tickets_sold})
                                            </Link>
                                        </>;
                                    }

                                    // Attendee (or not logged in): register flow
                                    if (hasTicket) {
                                        return <>
                                            <div className="ticket-confirmed">
                                                <span>✅</span> You&apos;re registered!
                                                {userTicket && <div className="ticket-code">Code: {userTicket.ticket_code}</div>}
                                            </div>
                                            <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleCancel}>Cancel My Ticket</button>
                                        </>;
                                    }
                                    return <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={isFull} onClick={() => user ? setShowTicketModal(true) : router.push('/login')}>
                                        {isFull ? 'Sold Out' : isFree ? 'Register for Free' : `Get Tickets — $${event.price}`}
                                    </button>;
                                })()}

                                {event.google_calendar_url && event.status !== 'cancelled' && (
                                    <a href={event.google_calendar_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ width: '100%' }}>
                                        📅 Add to Google Calendar
                                    </a>
                                )}
                            </div>

                            {/* Tags */}
                            {event.tags && (
                                <div className="sidebar-tags">
                                    {event.tags.split(',').map((tag, i) => (
                                        <span key={i} className="badge badge-violet">{tag.trim()}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reschedule Modal */}
            {showRescheduleModal && (
                <RescheduleModal
                    event={event}
                    onClose={() => setShowRescheduleModal(false)}
                    onSubmit={handleReschedule}
                />
            )}

            {/* Ticket Modal */}
            {showTicketModal && (
                <div className="modal-backdrop" onClick={() => setShowTicketModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>🎫 Get Tickets</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowTicketModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <h4 style={{ marginBottom: 8 }}>{event.title}</h4>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
                                {formatDate(event.date)} at {formatTime(event.time)}
                            </p>
                            <div className="form-group">
                                <label className="form-label">Quantity</label>
                                <select className="form-select" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))}>
                                    {[1, 2, 3, 4, 5].filter(n => n <= spotsLeft).map(n => (
                                        <option key={n} value={n}>{n} {n === 1 ? 'ticket' : 'tickets'}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="ticket-total">
                                <span>Total</span>
                                <span className="ticket-total-price">{isFree ? 'FREE' : `$${(event.price * quantity).toFixed(2)}`}</span>
                            </div>
                            {!isFree && (
                                <div className="mock-payment-note">
                                    💳 Stripe test mode — use card <code>4242 4242 4242 4242</code> · any future date · any CVC.
                                </div>
                            )}
                            {!isFree && (
                                <div style={{ marginTop: 16 }}>
                                    <StripeCheckout
                                        eventId={event.id}
                                        quantity={quantity}
                                        onSuccess={async () => {
                                            toast.success('🎫 Payment confirmed! Ticket issued.');
                                            setHasTicket(true);
                                            setShowTicketModal(false);
                                            const data = await eventsApi.get(id);
                                            setEvent(data.event);
                                            setUserTicket(data.userTicket);
                                        }}
                                        onError={(msg) => toast.error(msg)}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowTicketModal(false)}>Cancel</button>
                            {isFree && (
                                <button className="btn btn-primary" onClick={handleRegister} disabled={ticketLoading}>
                                    {ticketLoading ? 'Processing...' : 'Confirm Registration'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
