const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

function getToken() {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('zestify_token');
    }
    return null;
}

function setToken(token) {
    if (typeof window !== 'undefined') {
        localStorage.setItem('zestify_token', token);
    }
}

function removeToken() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('zestify_token');
        localStorage.removeItem('zestify_user');
    }
}

function getUser() {
    if (typeof window !== 'undefined') {
        const user = localStorage.getItem('zestify_user');
        return user ? JSON.parse(user) : null;
    }
    return null;
}

function setUser(user) {
    if (typeof window !== 'undefined') {
        localStorage.setItem('zestify_user', JSON.stringify(user));
    }
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw { status: response.status, ...data };
    }

    return data;
}

// Auth
export const auth = {
    register: (body) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => apiRequest('/auth/me'),
    updateProfile: (body) => apiRequest('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
};

// Events
export const events = {
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/events?${query}`);
    },
    get: (id) => apiRequest(`/events/${id}`),
    create: (body) => apiRequest('/events', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => apiRequest(`/events/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => apiRequest(`/events/${id}`, { method: 'DELETE' }),
    featured: () => apiRequest('/events/featured'),
    categories: () => apiRequest('/events/categories'),
    stats: () => apiRequest('/events/stats'),
    attendees: (id) => apiRequest(`/events/${id}/attendees`),
};

// Tickets
export const tickets = {
    purchase: (body) => apiRequest('/tickets', { method: 'POST', body: JSON.stringify(body) }),
    my: () => apiRequest('/tickets/my'),
    cancel: (id) => apiRequest(`/tickets/${id}`, { method: 'DELETE' }),
};

// Admin
export const admin = {
    events: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/admin/events?${query}`);
    },
    pendingEvents: () => apiRequest('/admin/events?status=pending'),
    moderateEvent: (id, body) => {
        const action = body.action === 'approve' ? 'approve' : 'reject';
        return apiRequest(`/admin/events/${id}/${action}`, { method: 'PUT', body: JSON.stringify(body) });
    },
    approveEvent: (id, body = {}) => apiRequest(`/admin/events/${id}/approve`, { method: 'PUT', body: JSON.stringify(body) }),
    rejectEvent: (id, body = {}) => apiRequest(`/admin/events/${id}/reject`, { method: 'PUT', body: JSON.stringify(body) }),
    users: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/admin/users?${query}`);
    },
    changeRole: (id, body) => apiRequest(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify(body) }),
    toggleUser: (id) => apiRequest(`/admin/users/${id}/toggle`, { method: 'PUT', body: JSON.stringify({}) }),
    toggleActive: (id) => apiRequest(`/admin/users/${id}/toggle`, { method: 'PUT', body: JSON.stringify({}) }),
    stats: () => apiRequest('/admin/stats'),
};

// Users
export const users = {
    myEvents: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/users/me/events?${query}`);
    },
    myStats: () => apiRequest('/users/me/stats'),
};


// Notifications
export const notifications = {
    list: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/notifications?${query}`);
    },
    markRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () => apiRequest('/notifications/read-all', { method: 'PUT' }),
};

export { getToken, setToken, removeToken, getUser, setUser };
