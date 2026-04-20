'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { events as eventsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import './create-event.css';

export default function CreateEventPage() {
    const { user } = useAuth();
    const router = useRouter();
    const toast = useToast();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: '', description: '', short_description: '',
        date: '', end_date: '', time: '09:00', end_time: '17:00',
        location: '', venue_name: '', address: '', city: '', state: '', zip: '',
        latitude: null, longitude: null, map_link: '',
        is_online: false, online_url: '',
        capacity: 100, price: 0, category_id: '', tags: '',
        schedule: [{ time: '09:00', title: '', description: '' }],
    });

    useEffect(() => {
        if (user && user.role !== 'organizer' && user.role !== 'admin') {
            router.push('/events');
            return;
        }
        eventsApi.categories().then(d => setCategories(d.categories)).catch(() => { });
    }, [user]);

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    // Parse a Google Maps link or "lat,lng" pair into latitude + longitude.
    // Supports: https://www.google.com/maps/place/.../@LAT,LNG,zoomZ/...
    //           https://maps.google.com/?q=LAT,LNG
    //           "37.7749,-122.4194"
    const parseMapLink = (input) => {
        if (!input) return null;
        const at = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
        const q = input.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
        const ll = input.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (ll) return { lat: parseFloat(ll[1]), lng: parseFloat(ll[2]) };
        const pair = input.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
        if (pair) return { lat: parseFloat(pair[1]), lng: parseFloat(pair[2]) };
        return null;
    };

    const onMapInputChange = (raw) => {
        update('map_link', raw);
        const parsed = parseMapLink(raw);
        if (parsed) {
            update('latitude', parsed.lat);
            update('longitude', parsed.lng);
        }
    };

    const addScheduleItem = () => {
        setForm(prev => ({ ...prev, schedule: [...prev.schedule, { time: '', title: '', description: '' }] }));
    };

    const updateSchedule = (idx, field, value) => {
        setForm(prev => {
            const schedule = [...prev.schedule];
            schedule[idx] = { ...schedule[idx], [field]: value };
            return { ...prev, schedule };
        });
    };

    const removeScheduleItem = (idx) => {
        setForm(prev => ({ ...prev, schedule: prev.schedule.filter((_, i) => i !== idx) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { map_link, ...rest } = form;
            const body = {
                ...rest,
                capacity: parseInt(form.capacity),
                price: parseFloat(form.price) || 0,
                category_id: form.category_id ? parseInt(form.category_id) : null,
                is_online: form.is_online ? 1 : 0,
                schedule: JSON.stringify(form.schedule.filter(s => s.title)),
            };
            const data = await eventsApi.create(body);
            toast.success('Event created! Pending admin approval.');
            router.push('/dashboard/my-events');
        } catch (err) {
            toast.error(err.error || err.details?.[0] || 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper">
            <div className="container" style={{ maxWidth: 800 }}>
                <h1 className="section-title">Create New Event</h1>
                <p className="section-subtitle">Fill in the details below to create your event. It will be reviewed by an admin before going live.</p>

                <form onSubmit={handleSubmit} className="create-event-form card" style={{ padding: 32 }}>
                    {/* Basic Info */}
                    <div className="form-section">
                        <h3 className="form-section-title">📝 Basic Info</h3>
                        <div className="form-group">
                            <label className="form-label">Event Title</label>
                            <input type="text" className="form-input" value={form.title} onChange={e => update('title', e.target.value)} placeholder="Give your event a catchy title" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Short Description</label>
                            <input type="text" className="form-input" value={form.short_description} onChange={e => update('short_description', e.target.value)} placeholder="One-line summary" maxLength={200} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Full Description</label>
                            <textarea className="form-textarea" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe your event in detail..." rows={5} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-select" value={form.category_id} onChange={e => update('category_id', e.target.value)}>
                                    <option value="">Select category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tags (comma separated)</label>
                                <input type="text" className="form-input" value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="tech, ai, networking" />
                            </div>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="form-section">
                        <h3 className="form-section-title">📅 Date & Time</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Start Date</label>
                                <input type="date" className="form-input" value={form.date} onChange={e => update('date', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date (optional)</label>
                                <input type="date" className="form-input" value={form.end_date} onChange={e => update('end_date', e.target.value)} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Start Time</label>
                                <input type="time" className="form-input" value={form.time} onChange={e => update('time', e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Time</label>
                                <input type="time" className="form-input" value={form.end_time} onChange={e => update('end_time', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="form-section">
                        <h3 className="form-section-title">📍 Location</h3>
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input type="checkbox" checked={form.is_online} onChange={e => update('is_online', e.target.checked)} />
                                This is an online event
                            </label>
                        </div>
                        {form.is_online ? (
                            <div className="form-group">
                                <label className="form-label">Online Event URL</label>
                                <input type="url" className="form-input" value={form.online_url} onChange={e => update('online_url', e.target.value)} placeholder="https://zoom.us/..." />
                            </div>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Location</label>
                                    <input type="text" className="form-input" value={form.location} onChange={e => update('location', e.target.value)} placeholder="Venue, City, State" required />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Venue Name</label>
                                        <input type="text" className="form-input" value={form.venue_name} onChange={e => update('venue_name', e.target.value)} placeholder="Convention Center" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">City</label>
                                        <input type="text" className="form-input" value={form.city} onChange={e => update('city', e.target.value)} placeholder="San Francisco" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Google Maps link or coordinates</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.map_link}
                                        onChange={e => onMapInputChange(e.target.value)}
                                        placeholder="Paste Google Maps URL or lat,lng (e.g. 37.7749,-122.4194)"
                                    />
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        Tip: open Google Maps → click venue → "Share" → copy link.
                                        Auto-extracts latitude + longitude.
                                    </span>
                                </div>
                                {form.latitude && form.longitude && (
                                    <div className="form-group">
                                        <label className="form-label">Map preview</label>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${form.latitude},${form.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ display: 'block', position: 'relative', borderRadius: 12, overflow: 'hidden' }}
                                            title="Open in Google Maps"
                                        >
                                            <iframe
                                                width="100%"
                                                height="240"
                                                style={{ border: 0, pointerEvents: 'none' }}
                                                loading="lazy"
                                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${form.longitude - 0.01},${form.latitude - 0.01},${form.longitude + 0.01},${form.latitude + 0.01}&layer=mapnik&marker=${form.latitude},${form.longitude}`}
                                            />
                                            <span style={{
                                                position: 'absolute', bottom: 12, right: 12,
                                                background: 'rgba(0,0,0,0.75)', color: '#fff',
                                                padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                                            }}>
                                                🔗 Open in Google Maps ↗
                                            </span>
                                        </a>
                                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                                            lat: {form.latitude.toFixed(6)} · lng: {form.longitude.toFixed(6)}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Capacity & Price */}
                    <div className="form-section">
                        <h3 className="form-section-title">🎫 Ticketing</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Capacity</label>
                                <input type="number" className="form-input" value={form.capacity} onChange={e => update('capacity', e.target.value)} min={1} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Price ($)</label>
                                <input type="number" className="form-input" value={form.price} onChange={e => update('price', e.target.value)} min={0} step="0.01" />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Set to 0 for free events</span>
                            </div>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="form-section">
                        <h3 className="form-section-title">📋 Schedule (optional)</h3>
                        {form.schedule.map((item, idx) => (
                            <div key={idx} className="schedule-form-item">
                                <div className="form-row" style={{ gridTemplateColumns: '120px 1fr auto' }}>
                                    <input type="time" className="form-input" value={item.time} onChange={e => updateSchedule(idx, 'time', e.target.value)} />
                                    <input type="text" className="form-input" value={item.title} onChange={e => updateSchedule(idx, 'title', e.target.value)} placeholder="Session title" />
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeScheduleItem(idx)}>✕</button>
                                </div>
                            </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-sm" onClick={addScheduleItem}>+ Add Schedule Item</button>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Event'}
                    </button>
                </form>
            </div>
        </div>
    );
}
