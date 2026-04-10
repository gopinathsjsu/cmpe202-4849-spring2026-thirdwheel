'use client';
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { events as eventsApi } from '@/lib/api';
import EventCard from '@/components/EventCard';
import './events.css';

function EventsContent() {
    const searchParams = useSearchParams();
    const [eventsList, setEventsList] = useState([]);
    const [categories, setCategories] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        category: searchParams.get('category') || '',
        city: searchParams.get('city') || '',
        is_online: searchParams.get('is_online') || '',
        sort: 'date',
        page: 1,
    });

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.search) params.search = filters.search;
            if (filters.category) params.category = filters.category;
            if (filters.city) params.city = filters.city;
            if (filters.is_online) params.is_online = filters.is_online;
            params.sort = filters.sort;
            params.page = filters.page;
            params.limit = 12;

            const data = await eventsApi.list(params);
            setEventsList(data.events);
            setPagination(data.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        eventsApi.categories().then(d => setCategories(d.categories)).catch(() => { });
    }, []);

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    };

    return (
        <div className="page-wrapper">
            <div className="container">
                <div className="events-page-header">
                    <h1 className="section-title">Explore Events</h1>
                    <p className="section-subtitle" style={{ marginBottom: 0 }}>Discover events that match your interests</p>
                </div>

                {/* Filters */}
                <div className="events-filters">
                    <div className="filter-search">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search events..."
                            value={filters.search}
                            onChange={e => updateFilter('search', e.target.value)}
                        />
                    </div>
                    <select className="form-select" value={filters.category} onChange={e => updateFilter('category', e.target.value)}>
                        <option value="">All Categories</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="City..."
                        value={filters.city}
                        onChange={e => updateFilter('city', e.target.value)}
                        style={{ maxWidth: 160 }}
                    />
                    <select className="form-select" value={filters.is_online} onChange={e => updateFilter('is_online', e.target.value)} style={{ maxWidth: 150 }}>
                        <option value="">All Types</option>
                        <option value="false">In-Person</option>
                        <option value="true">Online</option>
                    </select>
                    <select className="form-select" value={filters.sort} onChange={e => updateFilter('sort', e.target.value)} style={{ maxWidth: 140 }}>
                        <option value="date">Date</option>
                        <option value="title">Title</option>
                        <option value="price">Price</option>
                        <option value="created">Newest</option>
                    </select>
                </div>

                {/* Active filters */}
                {(filters.search || filters.category || filters.city || filters.is_online) && (
                    <div className="active-filters">
                        {filters.search && <span className="active-filter" onClick={() => updateFilter('search', '')}>Search: {filters.search} ✕</span>}
                        {filters.category && <span className="active-filter" onClick={() => updateFilter('category', '')}>Category: {filters.category} ✕</span>}
                        {filters.city && <span className="active-filter" onClick={() => updateFilter('city', '')}>City: {filters.city} ✕</span>}
                        {filters.is_online && <span className="active-filter" onClick={() => updateFilter('is_online', '')}>{filters.is_online === 'true' ? 'Online' : 'In-Person'} ✕</span>}
                        <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ search: '', category: '', city: '', is_online: '', sort: 'date', page: 1 })}>
                            Clear All
                        </button>
                    </div>
                )}

                {/* Results */}
                {loading ? (
                    <div className="events-grid">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="card" style={{ height: 380 }}>
                                <div className="skeleton" style={{ height: 180 }}></div>
                                <div style={{ padding: 16 }}>
                                    <div className="skeleton" style={{ height: 20, marginBottom: 8 }}></div>
                                    <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 6 }}></div>
                                    <div className="skeleton" style={{ height: 14, width: '40%' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : eventsList.length > 0 ? (
                    <>
                        <div className="events-result-count">
                            Showing {eventsList.length} of {pagination?.total || 0} events
                        </div>
                        <div className="events-grid">
                            {eventsList.map(event => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>
                        {pagination && pagination.totalPages > 1 && (
                            <div className="pagination">
                                <button disabled={pagination.page === 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>← Prev</button>
                                {Array.from({ length: pagination.totalPages }, (_, i) => (
                                    <button key={i + 1} className={pagination.page === i + 1 ? 'active' : ''} onClick={() => setFilters(p => ({ ...p, page: i + 1 }))}>
                                        {i + 1}
                                    </button>
                                ))}
                                <button disabled={pagination.page === pagination.totalPages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>Next →</button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <h3>No events found</h3>
                        <p>Try adjusting your filters or search terms</p>
                        <button className="btn btn-secondary" onClick={() => setFilters({ search: '', category: '', city: '', is_online: '', sort: 'date', page: 1 })}>
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function EventsPage() {
    return (
        <Suspense fallback={
            <div className="page-wrapper">
                <div className="container">
                    <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 24 }}></div>
                    <div className="events-grid">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="card" style={{ height: 380 }}>
                                <div className="skeleton" style={{ height: 180 }}></div>
                                <div style={{ padding: 16 }}>
                                    <div className="skeleton" style={{ height: 20, marginBottom: 8 }}></div>
                                    <div className="skeleton" style={{ height: 14, width: '60%' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        }>
            <EventsContent />
        </Suspense>
    );
}
