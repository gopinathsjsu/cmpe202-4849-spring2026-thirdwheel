'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { notifications as notifApi } from '@/lib/api';
import './Navbar.css';

export default function Navbar() {
    const { user, logout, loading } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (user) {
            notifApi.list({ unread_only: 'true' }).then(d => setUnreadCount(d.unreadCount)).catch(() => { });
        }
    }, [user]);

    const getDashboardLink = () => {
        if (!user) return '/login';
        if (user.role === 'admin') return '/admin';
        if (user.role === 'organizer') return '/dashboard/my-events';
        return '/dashboard/my-tickets';
    };

    return (
        <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
            <div className="navbar-inner container">
                <Link href="/" className="navbar-logo">
                    <span className="logo-icon">⚡</span>
                    <span className="logo-text">Zestify</span>
                </Link>

                <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                    <Link href="/events" className="nav-link" onClick={() => setMenuOpen(false)}>
                        Explore Events
                    </Link>
                    {user?.role === 'organizer' && (
                        <Link href="/events/create" className="nav-link" onClick={() => setMenuOpen(false)}>
                            Create Event
                        </Link>
                    )}
                    {user?.role === 'admin' && (
                        <Link href="/admin" className="nav-link" onClick={() => setMenuOpen(false)}>
                            Admin Panel
                        </Link>
                    )}

                    {loading ? (
                        <div className="skeleton" style={{ width: 100, height: 36 }}></div>
                    ) : user ? (
                        <div className="nav-user-section">
                            <Link href="/notifications" className="nav-notif-btn" onClick={() => setMenuOpen(false)}>
                                🔔
                                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                            </Link>
                            <Link href={getDashboardLink()} className="nav-link" onClick={() => setMenuOpen(false)}>
                                Dashboard
                            </Link>
                            <div className="nav-user-menu">
                                <button className="nav-avatar-btn">
                                    <span className="nav-avatar">{user.name?.charAt(0).toUpperCase()}</span>
                                    <span className="nav-username">{user.name?.split(' ')[0]}</span>
                                </button>
                                <div className="nav-dropdown">
                                    <Link href={getDashboardLink()} className="dropdown-item">Dashboard</Link>
                                    <Link href="/notifications" className="dropdown-item">Notifications</Link>
                                    <button className="dropdown-item dropdown-logout" onClick={logout}>Logout</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="nav-auth-btns">
                            <Link href="/login" className="nav-link" onClick={() => setMenuOpen(false)}>Log In</Link>
                            <Link href="/register" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>Sign Up</Link>
                        </div>
                    )}
                </div>

                <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
                    <span className={menuOpen ? 'ham-open' : ''}></span>
                    <span className={menuOpen ? 'ham-open' : ''}></span>
                    <span className={menuOpen ? 'ham-open' : ''}></span>
                </button>
            </div>
        </nav>
    );
}
