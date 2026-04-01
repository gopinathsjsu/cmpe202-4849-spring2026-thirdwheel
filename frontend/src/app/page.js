'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { events as eventsApi } from '@/lib/api';
import EventCard from '@/components/EventCard';
import './home.css';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      eventsApi.featured(),
      eventsApi.categories(),
      eventsApi.stats(),
    ]).then(([f, c, s]) => {
      setFeatured(f.events);
      setCategories(c.categories);
      setStats(s.stats);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
          <div className="hero-grid-pattern"></div>
        </div>
        <div className="container hero-content">
          <div className="hero-badge">⚡ Welcome to the future of events</div>
          <h1 className="hero-title">
            Discover Events That<br />
            <span className="hero-title-gradient">Ignite Your Passion</span>
          </h1>
          <p className="hero-subtitle">
            Find, create, and experience extraordinary events. From tech conferences to music festivals,
            your next unforgettable moment is just a click away.
          </p>
          <div className="hero-actions">
            <Link href="/events" className="btn btn-primary btn-lg">
              Explore Events →
            </Link>
            <Link href="/register" className="btn btn-secondary btn-lg">
              Start Organizing
            </Link>
          </div>
          {stats && (
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">{stats.totalEvents}+</span>
                <span className="hero-stat-label">Events</span>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat">
                <span className="hero-stat-value">{stats.totalUsers}+</span>
                <span className="hero-stat-label">Users</span>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat">
                <span className="hero-stat-value">{stats.totalTickets}+</span>
                <span className="hero-stat-label">Tickets</span>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat">
                <span className="hero-stat-value">{stats.totalOrganizers}+</span>
                <span className="hero-stat-label">Organizers</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Featured Events */}
      <section className="section container">
        <div className="section-header">
          <div>
            <h2 className="section-title">🔥 Featured Events</h2>
            <p className="section-subtitle">Handpicked events you don't want to miss</p>
          </div>
          <Link href="/events" className="btn btn-secondary">View All →</Link>
        </div>
        {loading ? (
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
        ) : (
          <div className="events-grid">
            {featured.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="section container">
        <div className="section-header">
          <div>
            <h2 className="section-title">🏷️ Browse by Category</h2>
            <p className="section-subtitle">Find events that match your interests</p>
          </div>
        </div>
        <div className="categories-grid">
          {categories.map(cat => (
            <Link href={`/events?category=${cat.slug}`} key={cat.id} className="category-card">
              <div className="category-icon-wrap" style={{ background: `${cat.color}20`, borderColor: `${cat.color}30` }}>
                <span className="category-icon">{cat.icon}</span>
              </div>
              <span className="category-name">{cat.name}</span>
              <span className="category-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Zestify */}
      <section className="section container">
        <div className="section-header" style={{ textAlign: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 className="section-title">✨ Why Zestify?</h2>
            <p className="section-subtitle">Everything you need to discover and create amazing events</p>
          </div>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Smart Discovery</h3>
            <p>Find events with powerful search, filters, and category-based browsing tailored to your interests.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎫</div>
            <h3>Seamless Ticketing</h3>
            <p>Register for events with one click. Track all your tickets and RSVPs in one place.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Calendar Sync</h3>
            <p>Add events to Google Calendar instantly. Never miss an event you&apos;re excited about.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Organizer Tools</h3>
            <p>Create events, track attendees, and manage RSVPs with powerful organizer dashboards.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>Maps & Location</h3>
            <p>Find events near you with integrated maps and location-based search.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔔</div>
            <h3>Notifications</h3>
            <p>Get real-time updates on event changes, ticket confirmations, and reminders.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container cta-content">
          <h2>Ready to Create Something Amazing?</h2>
          <p>Join Zestify as an organizer and bring your events to life.</p>
          <Link href="/register" className="btn btn-primary btn-lg">Get Started Free →</Link>
        </div>
      </section>
    </div>
  );
}
