import Link from 'next/link';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-glow"></div>
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <Link href="/" className="footer-logo">
                            <span className="logo-icon">⚡</span>
                            <span className="logo-text">Zestify</span>
                        </Link>
                        <p className="footer-tagline">Discover, create, and experience amazing events. Your next unforgettable moment starts here.</p>
                    </div>

                    <div className="footer-col">
                        <h4>Discover</h4>
                        <Link href="/events">All Events</Link>
                        <Link href="/events?category=technology">Technology</Link>
                        <Link href="/events?category=music">Music</Link>
                        <Link href="/events?category=food-drink">Food & Drink</Link>
                    </div>

                    <div className="footer-col">
                        <h4>Organize</h4>
                        <Link href="/events/create">Create Event</Link>
                        <Link href="/dashboard/my-events">Manage Events</Link>
                        <Link href="/dashboard/my-tickets">My Tickets</Link>
                    </div>

                    <div className="footer-col">
                        <h4>Connect</h4>
                        <a href="#">Help Center</a>
                        <a href="#">Community</a>
                        <a href="#">Blog</a>
                        <a href="#">Contact Us</a>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© 2026 Zestify. All rights reserved.</p>
                    <div className="footer-bottom-links">
                        <a href="#">Privacy</a>
                        <a href="#">Terms</a>
                        <a href="#">Cookies</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
