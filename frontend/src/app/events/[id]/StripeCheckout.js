'use client';
import { useEffect, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { payments as paymentsApi, tickets as ticketsApi } from '@/lib/api';

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

function PaymentForm({ eventId, quantity, onSuccess, onError, processing, setProcessing }) {
    const stripe = useStripe();
    const elements = useElements();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setProcessing(true);
        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: { return_url: window.location.href },
                redirect: 'if_required',
            });
            if (error) {
                onError(error.message || 'Payment failed');
                setProcessing(false);
                return;
            }
            if (paymentIntent && paymentIntent.status === 'succeeded') {
                await ticketsApi.purchase({
                    event_id: eventId,
                    quantity,
                    payment_method: 'stripe',
                    payment_intent_id: paymentIntent.id,
                });
                onSuccess();
            } else {
                onError(`Payment status: ${paymentIntent?.status || 'unknown'}`);
            }
        } catch (err) {
            onError(err.error || err.message || 'Payment failed');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement options={{ layout: 'tabs' }} />
            <button
                type="submit"
                className="btn btn-primary"
                disabled={!stripe || processing}
                style={{ marginTop: 16, width: '100%' }}
            >
                {processing ? 'Processing...' : 'Pay now'}
            </button>
            <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                🔒 Test card: <code>4242 4242 4242 4242</code> · any future date · any CVC.
            </p>
        </form>
    );
}

export default function StripeCheckout({ eventId, quantity, onSuccess, onError }) {
    const [clientSecret, setClientSecret] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [initError, setInitError] = useState(null);

    useEffect(() => {
        if (!stripePromise) {
            setInitError('Stripe not configured: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY missing on frontend.');
            return;
        }
        paymentsApi
            .createIntent({ event_id: eventId, quantity })
            .then((data) => setClientSecret(data.clientSecret))
            .catch((err) => setInitError(err.error || 'Could not initialize payment'));
    }, [eventId, quantity]);

    if (initError) {
        return <div style={{ color: '#ff7a7a', padding: 12 }}>{initError}</div>;
    }
    if (!clientSecret) {
        return <div style={{ padding: 12, color: 'var(--text-muted)' }}>Loading payment form…</div>;
    }
    return (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
            <PaymentForm
                eventId={eventId}
                quantity={quantity}
                onSuccess={onSuccess}
                onError={onError}
                processing={processing}
                setProcessing={setProcessing}
            />
        </Elements>
    );
}
