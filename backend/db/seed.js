const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { migrate, query, withTx, close } = require('./pool');

async function seed() {
    await migrate();

    await withTx(async (c) => {
        await c.query('TRUNCATE admin_actions, notifications, tickets, events, categories, users RESTART IDENTITY CASCADE');

        const hashed = bcrypt.hashSync('password123', 10);
        const users = [
            ['Admin User', 'admin@zestify.com', 'admin', 'Platform administrator', '555-0100'],
            ['Sarah Chen', 'sarah@zestify.com', 'organizer', 'Tech event organizer', '555-0101'],
            ['Marcus Johnson', 'marcus@zestify.com', 'organizer', 'Music festival curator', '555-0102'],
            ['Elena Rodriguez', 'elena@zestify.com', 'organizer', 'Wellness coach', '555-0103'],
            ['David Kim', 'david@zestify.com', 'organizer', 'Chef & culinary host', '555-0104'],
            ['Alex Thompson', 'alex@zestify.com', 'attendee', 'Tech enthusiast', '555-0201'],
            ['Maya Patel', 'maya@zestify.com', 'attendee', 'Digital artist', '555-0202'],
            ['James Wilson', 'james@zestify.com', 'attendee', 'Software engineer', '555-0203'],
            ['Lisa Wang', 'lisa@zestify.com', 'attendee', 'Marketing professional', '555-0204'],
            ['Chris Brown', 'chris@zestify.com', 'attendee', 'Fitness enthusiast', '555-0205'],
        ];
        for (const [name, email, role, bio, phone] of users) {
            await c.query('INSERT INTO users (name, email, password, role, bio, phone) VALUES ($1,$2,$3,$4,$5,$6)',
                [name, email, hashed, role, bio, phone]);
        }

        // Dummy users: password = email (for easy demo login)
        const dummyUsers = [
            ['Priya Sharma', 'priya@zestify.com', 'attendee', 'UX designer & event lover', '555-0301'],
            ['Ravi Kumar', 'ravi@zestify.com', 'attendee', 'Backend developer', '555-0302'],
            ['Anita Desai', 'anita@zestify.com', 'attendee', 'Data analyst', '555-0303'],
            ['Kevin Zhang', 'kevin@zestify.com', 'attendee', 'Product manager', '555-0304'],
            ['Tanya Miller', 'tanya@zestify.com', 'attendee', 'Startup founder', '555-0305'],
            ['Omar Farooq', 'omar@zestify.com', 'attendee', 'DevOps engineer', '555-0306'],
            ['Jessica Lee', 'jessica@zestify.com', 'attendee', 'Content strategist', '555-0307'],
            ['Ryan Brooks', 'ryan@zestify.com', 'organizer', 'Community event host', '555-0308'],
        ];
        for (const [name, email, role, bio, phone] of dummyUsers) {
            const emailHash = bcrypt.hashSync(email, 10);
            await c.query('INSERT INTO users (name, email, password, role, bio, phone) VALUES ($1,$2,$3,$4,$5,$6)',
                [name, email, emailHash, role, bio, phone]);
        }

        const categories = [
            ['Technology', 'technology', '💻', '#7c3aed', 'Tech conferences, hackathons, meetups'],
            ['Music', 'music', '🎵', '#ec4899', 'Concerts, festivals, live performances'],
            ['Food & Drink', 'food-drink', '🍕', '#f97316', 'Food festivals & culinary workshops'],
            ['Business', 'business', '💼', '#0ea5e9', 'Networking events & seminars'],
            ['Health & Wellness', 'health-wellness', '🧘', '#10b981', 'Yoga, fitness, wellness workshops'],
            ['Arts & Culture', 'arts-culture', '🎨', '#f43f5e', 'Exhibitions, theater, cultural events'],
            ['Sports', 'sports', '⚽', '#eab308', 'Sports events & tournaments'],
            ['Education', 'education', '📚', '#6366f1', 'Workshops, courses, seminars'],
            ['Charity', 'charity', '❤️', '#ef4444', 'Fundraisers, volunteer events'],
            ['Outdoors', 'outdoors', '🏕️', '#22c55e', 'Hiking, camping, outdoor adventures'],
        ];
        for (const [name, slug, icon, color, description] of categories) {
            await c.query('INSERT INTO categories (name, slug, icon, color, description) VALUES ($1,$2,$3,$4,$5)',
                [name, slug, icon, color, description]);
        }

        const events = [
            { title: 'SF Tech Summit 2026', slug: 'sf-tech-summit-2026',
              description: 'Biggest tech conference on the West Coast. Keynotes, workshops, networking with industry leaders. Topics: AI, cloud, cybersecurity, future of software development.',
              short: 'Biggest tech conference on the West Coast.',
              date: '2026-04-15', end_date: '2026-04-17', time: '09:00', end_time: '18:00',
              location: 'Moscone Center, San Francisco, CA', venue: 'Moscone Center', address: '747 Howard St',
              city: 'San Francisco', state: 'CA', zip: '94103', lat: 37.7849, lng: -122.4005,
              online: false, url: '', cap: 500, sold: 342, price: 0, org: 2, cat: 1, status: 'approved', feat: true, tags: 'tech,ai,cloud,networking',
              schedule: [{ time: '09:00', title: 'Registration', description: 'Check-in' }, { time: '10:00', title: 'Opening Keynote', description: 'AI trends' }] },
            { title: 'Neon Nights Music Festival', slug: 'neon-nights-music-festival',
              description: 'Three nights of live music under the stars. Electronic, indie, hip-hop, rock. Food trucks, art installations, VIP lounges.',
              short: 'Three nights of live music under the stars.',
              date: '2026-05-22', end_date: '2026-05-24', time: '16:00', end_time: '23:00',
              location: 'Golden Gate Park, San Francisco, CA', venue: 'Golden Gate Park Bandshell', address: '75 Hagiwara Tea Garden Dr',
              city: 'San Francisco', state: 'CA', zip: '94118', lat: 37.7694, lng: -122.4862,
              online: false, url: '', cap: 2000, sold: 1456, price: 49.99, org: 3, cat: 2, status: 'approved', feat: true, tags: 'music,festival,live,outdoor',
              schedule: [{ time: '16:00', title: 'Gates Open', description: '' }, { time: '19:00', title: 'Headliner', description: '' }] },
            { title: 'Mindful Living Retreat', slug: 'mindful-living-retreat',
              description: 'Weekend wellness retreat with meditation, yoga, and nature walks in Napa Valley.',
              short: 'Weekend retreat in Napa.',
              date: '2026-03-28', end_date: '2026-03-29', time: '08:00', end_time: '17:00',
              location: 'Wellness Valley Resort, Napa, CA', venue: 'Wellness Valley Resort', address: '1000 Main St',
              city: 'Napa', state: 'CA', zip: '94559', lat: 38.2975, lng: -122.2869,
              online: false, url: '', cap: 50, sold: 38, price: 0, org: 4, cat: 5, status: 'approved', feat: true, tags: 'wellness,yoga,meditation',
              schedule: [{ time: '08:00', title: 'Morning Meditation', description: '' }] },
            { title: 'Gourmet Street Food Festival', slug: 'gourmet-street-food-festival',
              description: '50+ vendors from 20+ countries serving authentic and fusion street food. Cooking demos, cocktail workshops.',
              short: 'Street food from around the world.',
              date: '2026-06-14', end_date: '2026-06-14', time: '11:00', end_time: '21:00',
              location: 'Ferry Building, San Francisco, CA', venue: 'Ferry Building Marketplace', address: '1 Ferry Building',
              city: 'San Francisco', state: 'CA', zip: '94105', lat: 37.7956, lng: -122.3934,
              online: false, url: '', cap: 1000, sold: 678, price: 15, org: 5, cat: 3, status: 'approved', feat: true, tags: 'food,festival,culinary',
              schedule: [{ time: '11:00', title: 'Festival Opens', description: '' }] },
            { title: 'Startup Pitch Night', slug: 'startup-pitch-night',
              description: '10 promising startups pitch to top VCs. Networking with founders and investors.',
              short: 'Startups pitch to VCs.',
              date: '2026-04-08', end_date: null, time: '18:00', end_time: '21:00',
              location: 'WeWork, 535 Mission St, San Francisco', venue: 'WeWork Mission', address: '535 Mission St',
              city: 'San Francisco', state: 'CA', zip: '94105', lat: 37.7890, lng: -122.3983,
              online: false, url: '', cap: 150, sold: 112, price: 0, org: 2, cat: 4, status: 'approved', feat: false, tags: 'startup,pitch,investing',
              schedule: [{ time: '18:00', title: 'Networking', description: '' }] },
            { title: 'Virtual Design Systems Workshop', slug: 'virtual-design-systems-workshop',
              description: 'Build a scalable design system from scratch. Component libraries, design tokens, documentation, collaboration.',
              short: 'Design systems from scratch.',
              date: '2026-03-20', end_date: null, time: '10:00', end_time: '16:00',
              location: 'Online (Zoom)', venue: '', address: '', city: '', state: '', zip: '',
              lat: null, lng: null, online: true, url: 'https://zoom.us/j/example',
              cap: 200, sold: 89, price: 0, org: 2, cat: 1, status: 'approved', feat: false, tags: 'design,workshop,virtual',
              schedule: [{ time: '10:00', title: 'Intro', description: '' }] },
            { title: 'Bay Area Marathon 2026', slug: 'bay-area-marathon-2026',
              description: 'Run through SF\'s most scenic routes. Marathon, half, or 10K. Finisher medal, race shirt, post-race party.',
              short: 'Marathon, half, or 10K.',
              date: '2026-07-12', end_date: null, time: '06:00', end_time: '14:00',
              location: 'Embarcadero, San Francisco, CA', venue: 'Embarcadero Plaza', address: 'Embarcadero',
              city: 'San Francisco', state: 'CA', zip: '94111', lat: 37.7949, lng: -122.3946,
              online: false, url: '', cap: 5000, sold: 3200, price: 75, org: 4, cat: 7, status: 'approved', feat: false, tags: 'marathon,running,sports',
              schedule: [{ time: '06:00', title: 'Start', description: '' }] },
            { title: 'Community Art Exhibition', slug: 'community-art-exhibition',
              description: '40+ local artists. Paintings, sculptures, photography, digital art. Wine and cheese.',
              short: '40+ local artists.',
              date: '2026-04-25', end_date: '2026-04-27', time: '10:00', end_time: '20:00',
              location: 'SoMa Arts Center, San Francisco, CA', venue: 'SoMa Arts Center', address: '934 Brannan St',
              city: 'San Francisco', state: 'CA', zip: '94103', lat: 37.7731, lng: -122.4053,
              online: false, url: '', cap: 300, sold: 145, price: 0, org: 3, cat: 6, status: 'approved', feat: false, tags: 'art,exhibition,gallery',
              schedule: [{ time: '10:00', title: 'Gallery Opens', description: '' }] },
            { title: 'Python for Data Science Bootcamp', slug: 'python-data-science-bootcamp',
              description: 'Intensive 2-day Python bootcamp. Pandas, NumPy, matplotlib, scikit-learn. Real-world projects.',
              short: '2-day Python bootcamp.',
              date: '2026-05-10', end_date: '2026-05-11', time: '09:00', end_time: '17:00',
              location: 'UC Berkeley Extension, Berkeley, CA', venue: 'UC Berkeley Extension', address: '1995 University Ave',
              city: 'Berkeley', state: 'CA', zip: '94704', lat: 37.8716, lng: -122.2727,
              online: false, url: '', cap: 40, sold: 35, price: 0, org: 2, cat: 8, status: 'approved', feat: false, tags: 'python,data-science,education',
              schedule: [{ time: '09:00', title: 'Python Fundamentals', description: '' }] },
            { title: 'Charity Gala: Hope for Tomorrow', slug: 'charity-gala-hope-for-tomorrow',
              description: 'Elegant evening of giving. Gourmet dinner, live entertainment, silent auction. Black-tie.',
              short: 'Charity gala with silent auction.',
              date: '2026-06-05', end_date: null, time: '18:00', end_time: '23:00',
              location: 'The Ritz-Carlton, San Francisco, CA', venue: 'The Ritz-Carlton', address: '600 Stockton St',
              city: 'San Francisco', state: 'CA', zip: '94108', lat: 37.7910, lng: -122.4085,
              online: false, url: '', cap: 250, sold: 189, price: 150, org: 4, cat: 9, status: 'approved', feat: true, tags: 'charity,gala,fundraiser',
              schedule: [{ time: '18:00', title: 'Cocktail Reception', description: '' }] },
            { title: 'Sunset Hike & Photography Walk', slug: 'sunset-hike-photography-walk',
              description: 'Sunset hike through Marin Headlands. Photography tips. Limited to 25 hikers.',
              short: 'Sunset hike with photo tips.',
              date: '2026-04-05', end_date: null, time: '16:30', end_time: '20:00',
              location: 'Marin Headlands, Sausalito, CA', venue: 'Marin Headlands Visitor Center', address: 'Field Rd',
              city: 'Sausalito', state: 'CA', zip: '94965', lat: 37.8270, lng: -122.4994,
              online: false, url: '', cap: 25, sold: 22, price: 0, org: 5, cat: 10, status: 'approved', feat: false, tags: 'hiking,photography,outdoors',
              schedule: [{ time: '16:30', title: 'Meet & Greet', description: '' }] },
            { title: 'Blockchain & Web3 Developer Conference', slug: 'blockchain-web3-dev-conference',
              description: 'Full-day conference on blockchain development. Smart contracts, DeFi, NFTs, dApps.',
              short: 'Web3 developer conference.',
              date: '2026-05-15', end_date: null, time: '09:00', end_time: '18:00',
              location: 'Computer History Museum, Mountain View, CA', venue: 'Computer History Museum', address: '1401 N Shoreline Blvd',
              city: 'Mountain View', state: 'CA', zip: '94043', lat: 37.4143, lng: -122.0777,
              online: false, url: '', cap: 300, sold: 0, price: 0, org: 2, cat: 1, status: 'pending', feat: false, tags: 'blockchain,web3,developer',
              schedule: [] },
            { title: 'Jazz in the Park', slug: 'jazz-in-the-park',
              description: 'Live jazz performances in Dolores Park. Picnic-friendly. Food trucks on site.',
              short: 'Live jazz in the park.',
              date: '2026-06-20', end_date: null, time: '12:00', end_time: '18:00',
              location: 'Dolores Park, San Francisco, CA', venue: 'Dolores Park', address: 'Dolores St & 19th St',
              city: 'San Francisco', state: 'CA', zip: '94114', lat: 37.7596, lng: -122.4269,
              online: false, url: '', cap: 500, sold: 0, price: 0, org: 3, cat: 2, status: 'pending', feat: false, tags: 'jazz,music,outdoor',
              schedule: [] },
        ];

        for (const e of events) {
            await c.query(
                `INSERT INTO events (title, slug, description, short_description, date, end_date, time, end_time,
          location, venue_name, address, city, state, zip, latitude, longitude, is_online, online_url,
          capacity, tickets_sold, price, image, organizer_id, category_id, status, is_featured, tags, schedule)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28::jsonb)`,
                [
                    e.title, e.slug, e.description, e.short, e.date, e.end_date, e.time, e.end_time,
                    e.location, e.venue, e.address, e.city, e.state, e.zip, e.lat, e.lng, e.online, e.url,
                    e.cap, e.sold, e.price, null, e.org, e.cat, e.status, e.feat, e.tags, JSON.stringify(e.schedule),
                ]
            );
        }

        // Tickets: original users + dummy users registered on various events
        // user_id, event_id, quantity, total_price, payment_method
        const tickets = [
            // Original attendees (ids 6-10)
            [6, 1, 1, 0, 'free'], [7, 1, 1, 0, 'free'], [8, 1, 1, 0, 'free'],
            [6, 2, 2, 99.98, 'mock_card'], [9, 2, 1, 49.99, 'mock_card'],
            [10, 3, 1, 0, 'free'], [7, 4, 1, 15, 'mock_card'],
            [8, 5, 1, 0, 'free'], [9, 6, 1, 0, 'free'], [10, 7, 1, 75, 'mock_card'],
            [6, 8, 1, 0, 'free'], [7, 9, 1, 0, 'free'],
            // Dummy users registrations (ids 11-18) spread across events
            [11, 1, 1, 0, 'free'], [12, 1, 1, 0, 'free'], [13, 1, 1, 0, 'free'],
            [14, 2, 1, 49.99, 'mock_card'], [15, 2, 1, 49.99, 'mock_card'],
            [16, 2, 1, 49.99, 'mock_card'], [17, 2, 1, 49.99, 'mock_card'],
            [11, 3, 1, 0, 'free'], [12, 3, 1, 0, 'free'],
            [13, 4, 1, 15, 'mock_card'], [14, 4, 1, 15, 'mock_card'],
            [15, 4, 1, 15, 'mock_card'], [16, 4, 1, 15, 'mock_card'],
            [11, 5, 1, 0, 'free'], [12, 5, 1, 0, 'free'], [13, 5, 1, 0, 'free'],
            [14, 5, 1, 0, 'free'],
            [15, 6, 1, 0, 'free'], [16, 6, 1, 0, 'free'], [17, 6, 1, 0, 'free'],
            [11, 7, 1, 75, 'mock_card'], [12, 7, 1, 75, 'mock_card'],
            [13, 7, 1, 75, 'mock_card'],
            [14, 8, 1, 0, 'free'], [15, 8, 1, 0, 'free'], [16, 8, 1, 0, 'free'],
            [17, 8, 1, 0, 'free'],
            [11, 9, 1, 0, 'free'], [14, 9, 1, 0, 'free'],
            [12, 10, 1, 150, 'mock_card'], [15, 10, 1, 150, 'mock_card'],
            [16, 10, 1, 150, 'mock_card'],
            [13, 11, 1, 0, 'free'], [17, 11, 1, 0, 'free'],
            [18, 1, 1, 0, 'free'], [18, 4, 1, 15, 'mock_card'], [18, 7, 1, 75, 'mock_card'],
        ];
        for (const [u, e, q, p, m] of tickets) {
            await c.query(
                `INSERT INTO tickets (ticket_code, user_id, event_id, quantity, total_price, status, payment_method, payment_status)
         VALUES ($1,$2,$3,$4,$5,'confirmed',$6,'completed')`,
                [uuidv4().slice(0, 8).toUpperCase(), u, e, q, p, m]
            );
        }

        // Recompute tickets_sold from actual ticket rows (authoritative)
        await c.query(`
            UPDATE events e SET tickets_sold = COALESCE((
                SELECT SUM(quantity) FROM tickets t
                WHERE t.event_id = e.id AND t.status = 'confirmed'
            ), 0)
        `);

        const notifs = [
            [6, 'ticket_confirmation', 'Ticket Confirmed!', 'Your ticket for SF Tech Summit 2026 has been confirmed.', '/events/1', true],
            [6, 'event_reminder', 'Event Reminder', 'SF Tech Summit 2026 is in 3 days!', '/events/1', false],
            [7, 'ticket_confirmation', 'Ticket Confirmed!', 'Your ticket for SF Tech Summit 2026 has been confirmed.', '/events/1', true],
            [2, 'event_approved', 'Event Approved', 'Your event "SF Tech Summit 2026" has been approved.', '/events/1', true],
            [2, 'info', 'New Registration', 'Alex Thompson registered for SF Tech Summit 2026.', '/dashboard/attendees/1', false],
            [3, 'event_approved', 'Event Approved', 'Your event "Neon Nights Music Festival" has been approved.', '/events/2', true],
            [9, 'ticket_confirmation', 'Ticket Confirmed!', 'Your ticket for Virtual Design Systems Workshop has been confirmed.', '/events/6', false],
            [10, 'ticket_confirmation', 'Ticket Confirmed!', 'Your ticket for Bay Area Marathon 2026 has been confirmed.', '/events/7', false],
            [11, 'ticket_confirmation', 'Ticket Confirmed!', 'Your ticket for SF Tech Summit 2026 has been confirmed.', '/events/1', true],
            [12, 'ticket_confirmation', 'Ticket Confirmed!', 'Your ticket for Mindful Living Retreat has been confirmed.', '/events/3', false],
            [13, 'ticket_confirmation', 'Ticket Confirmed!', 'Your ticket for Gourmet Street Food Festival has been confirmed.', '/events/4', true],
            [14, 'ticket_confirmation', 'Ticket Confirmed!', 'Your ticket for Neon Nights Music Festival has been confirmed.', '/events/2', false],
            [15, 'ticket_confirmation', 'Ticket Confirmed!', 'Your ticket for Bay Area Marathon 2026 has been confirmed.', '/events/7', true],
            [16, 'ticket_confirmation', 'Ticket Confirmed!', 'Your ticket for Charity Gala has been confirmed.', '/events/10', false],
        ];
        for (const [u, t, ti, m, l, r] of notifs) {
            await c.query('INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES ($1,$2,$3,$4,$5,$6)',
                [u, t, ti, m, l, r]);
        }

        console.log('Seed complete: 18 users, 10 categories, 13 events, 47 tickets, 14 notifications.');
    });

    await close();
}

if (require.main === module) {
    seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { seed };
