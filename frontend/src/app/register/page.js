'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import '../login/auth.css';

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'attendee' });
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const toast = useToast();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(form);
            toast.success('Account created! Welcome to Zestify 🎉');
            router.push('/events');
        } catch (err) {
            toast.error(err.error || err.details?.[0] || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    return (
        <div className="auth-page page-wrapper">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <h1>Create Account</h1>
                        <p>Join Zestify and start discovering events</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input type="text" className="form-input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="John Doe" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-input" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="password" className="form-input" value={form.password} onChange={e => update('password', e.target.value)} placeholder="At least 6 characters" required minLength={6} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">I want to</label>
                            <div className="role-selector">
                                <div className={`role-option ${form.role === 'attendee' ? 'selected' : ''}`} onClick={() => update('role', 'attendee')}>
                                    <div className="role-option-emoji">🎫</div>
                                    <div className="role-option-title">Attend Events</div>
                                    <div className="role-option-desc">Discover and join events</div>
                                </div>
                                <div className={`role-option ${form.role === 'organizer' ? 'selected' : ''}`} onClick={() => update('role', 'organizer')}>
                                    <div className="role-option-emoji">🎯</div>
                                    <div className="role-option-title">Organize Events</div>
                                    <div className="role-option-desc">Create and manage events</div>
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Already have an account? <Link href="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
