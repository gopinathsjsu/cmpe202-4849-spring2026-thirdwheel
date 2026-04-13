'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import './auth.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const toast = useToast();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await login(email, password);
            toast.success('Welcome back! 🎉');
            if (data.user.role === 'admin') router.push('/admin');
            else if (data.user.role === 'organizer') router.push('/dashboard/my-events');
            else router.push('/events');
        } catch (err) {
            toast.error(err.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const quickLogin = (email) => {
        setEmail(email);
        setPassword('password123');
    };

    return (
        <div className="auth-page page-wrapper">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-header">
                        <h1>Welcome Back</h1>
                        <p>Sign in to continue to Zestify</p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="auth-divider"><span>Quick Login</span></div>
                    <div className="quick-login-btns">
                        <button className="btn btn-ghost btn-sm" onClick={() => quickLogin('admin@zestify.com')}>👑 Admin</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => quickLogin('sarah@zestify.com')}>🎯 Organizer</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => quickLogin('alex@zestify.com')}>🎫 Attendee</button>
                    </div>

                    <p className="auth-switch">
                        Don&apos;t have an account? <Link href="/register">Sign up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
