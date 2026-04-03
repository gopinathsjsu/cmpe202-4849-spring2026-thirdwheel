'use client';
import Link from 'next/link';
import './EventCard.css';

export default function EventCard({ event }) {
    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${m} ${ampm}`;
    };

    const spotsLeft = event.capacity - event.tickets_sold;
    const spotsPercent = ((event.tickets_sold / event.capacity) * 100).toFixed(0);
    const isAlmostFull = spotsPercent > 80;
    const isFree = event.price === 0;

    return (
        <Link href={`/events/${event.id}`} className="event-card card">
            <div className="event-card-image" style={{ background: event.category_color ? `linear-gradient(135deg, ${event.category_color}33, ${event.category_color}11)` : 'var(--gradient-card)' }}>
                <div className="event-card-image-content">
                    <span className="event-card-emoji">{event.category_icon || '📅'}</span>
                </div>
                {event.is_featured === 1 && <span className="event-card-featured">⭐ Featured</span>}
                <span className="event-card-price">{isFree ? 'FREE' : `$${event.price}`}</span>
            </div>

            <div className="event-card-body">
                <div className="event-card-meta">
                    {event.category_name && (
                        <span className="event-card-category" style={{ color: event.category_color }}>{event.category_icon} {event.category_name}</span>
                    )}
                </div>

                <h3 className="event-card-title">{event.title}</h3>

                <div className="event-card-details">
                    <div className="event-card-detail">
                        <span className="detail-icon">📅</span>
                        <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="event-card-detail">
                        <span className="detail-icon">🕐</span>
                        <span>{formatTime(event.time)}</span>
                    </div>
                    <div className="event-card-detail">
                        <span className="detail-icon">{event.is_online ? '💻' : '📍'}</span>
                        <span className="detail-location">{event.is_online ? 'Online Event' : event.city || event.location}</span>
                    </div>
                </div>

                <div className="event-card-footer">
                    <div className="event-card-capacity">
                        <div className="capacity-bar">
                            <div className="capacity-fill" style={{ width: `${spotsPercent}%`, background: isAlmostFull ? 'var(--coral)' : 'var(--violet)' }}></div>
                        </div>
                        <span className={`capacity-text ${isAlmostFull ? 'almost-full' : ''}`}>
                            {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Sold Out'}
                        </span>
                    </div>
                    {event.organizer_name && (
                        <span className="event-card-organizer">by {event.organizer_name}</span>
                    )}
                </div>
            </div>
        </Link>
    );
}
