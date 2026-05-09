# Auth Flow

End-to-end walk-through of register → login → JWT round-trip → RBAC.

## Register

```
POST /api/auth/register
  body: { name, email, password, role? }
  ↓
validate (shared/middleware/validate.js)
  ↓
UserRepository.findByEmail (dedupe)
  ↓
bcrypt.hash(password, 10)
  ↓
UserRepository.create
  ↓
jwt.sign({ id, email, role, name }, JWT_SECRET, { expiresIn: '7d' })
  ↓
201 { user, token }
```

Password rules live in `shared/utils/passwordPolicy.js` — min 8 chars, mix of
letters + (uppercase OR digit). Mirrored client-side in `lib/passwordHint.js`
so the user sees errors before round-tripping.

## Login

```
POST /api/auth/login
  body: { email, password }
  ↓
loginThrottle (services/auth/loginThrottle.js)  ← per-email 5/5min
  ↓
UserRepository.findByEmailWithPassword
  ↓
bcrypt.compare(plain, hash)
  ↓
jwt.sign(...)
  ↓
200 { user, token }
```

Throttle keeps a Map<email, { count, first }> in process memory. Reset after
5 min sliding window. Same email from another VM is unaffected — that's a
documented trade-off (in-memory ≠ shared state).

## JWT shape

```json
{
  "id": 4,
  "email": "nihardharmeshkumar.patel@sjsu.edu",
  "role": "organizer",
  "name": "Nihar Patel",
  "iat": 1778442708,
  "exp": 1779047508
}
```

HS256 signed with `JWT_SECRET` env var. Rotation invalidates all in-flight
tokens (acceptable since 7-day expiry).

## Verification middleware

```js
// shared/middleware/auth.js
function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  // Same as authenticateToken but tolerates missing/invalid token by leaving req.user undefined.
}
```

`optionalAuth` is used on `/api/events` + `/api/events/:id` so anonymous users
get the listing but logged-in users get the `hasTicket` / `userTicket`
enrichment.

## RBAC

```js
// shared/middleware/roles.js
function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

Usage:

```js
router.post('/', authenticateToken, requireRole('organizer', 'admin'), asyncHandler(...));
```

## Quick-login (demo only)

The `/login` page exposes three buttons that auto-fill the email + password
fields with one of the team's seeded accounts:

| Button | Email | Role |
|--------|-------|------|
| 👑 Admin | `kalharpatel10@gmail.com` | admin |
| 🎯 Organizer | `nihardharmeshkumar.patel@sjsu.edu` | organizer |
| 🎫 Attendee | `sohamrajjain0007@gmail.com` | attendee |

Team accounts: password = email itself (e.g., `kalharpatel10@gmail.com` / `kalharpatel10@gmail.com`). **Demo only** — wired up via an
idempotent migration in `shared/db/schema.postgres.sql` that swaps seed user
emails to the team's real Gmail addresses on every container start.
