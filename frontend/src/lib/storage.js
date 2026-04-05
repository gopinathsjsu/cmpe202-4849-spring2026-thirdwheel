// Tiny SSR-safe localStorage wrapper used by auth + toast modules.
const isClient = typeof window !== 'undefined';

export function get(key) {
    if (!isClient) return null;
    try { return window.localStorage.getItem(key); } catch { return null; }
}

export function set(key, value) {
    if (!isClient) return;
    try { window.localStorage.setItem(key, value); } catch {}
}

export function remove(key) {
    if (!isClient) return;
    try { window.localStorage.removeItem(key); } catch {}
}
