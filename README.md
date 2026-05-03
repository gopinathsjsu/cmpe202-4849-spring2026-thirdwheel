# Zestify - Event Management Platform

Zestify is a comprehensive full-stack event management platform inspired by Eventbrite. It enables users to discover, create, and manage events, while providing a seamless ticketing and RSVP experience.

## 🚀 Features

### For Users (Attendees)
- **User Authentication**: Secure signup and login with JWT and hashed passwords.
- **Event Discovery**: Browse upcoming events with details like date, time, location, and description.
- **Ticketing & RSVP**: Register for events, secure tickets, and track RSVPs.
- **My Tickets**: A dedicated dashboard to view all registered events and tickets.
- **Calendar & Email Integration**: Email notifications for event updates and calendar integrations.

### For Organizers
- **Event Creation**: Create rich events with custom images, locations, capacities, and scheduling.
- **Attendee Management**: View, track, and manage attendees for created events in real-time.
- **Organizer Dashboard**: Centralized dashboard to manage active, drafted, and past events.
- **Notifications**: Automated notifications for important event updates.

### For Administrators
- **Admin Panel**: Manage platform-wide users, events, and moderation.
- **Role-Based Access Control (RBAC)**: Distinct roles for regular users, organizers, and admins to ensure platform security.

## 🛠 Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React 19)
- **Styling**: Vanilla CSS for rich, responsive, and dynamic UI designs (animations, glassmorphism, modern aesthetics).
- **Architecture**: App Router pattern with distinct modules for dashboard, events, login/register, admin, and notifications.

### Backend
- **Server**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Database**: [SQLite](https://www.sqlite.org/) (via `better-sqlite3`) for lightweight, robust persistence.
- **Authentication**: `jsonwebtoken` (JWT) & `bcryptjs` for security.
- **Uploads & Notifications**: `multer` for image/file uploads and `nodemailer` for transactional emails.

## 📁 Project Structure

```text
Zestify/
├── frontend/                 # Next.js App
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── app/              # Next.js App Router pages & CSS
│   │   ├── components/       # Reusable UI components (Navbar, Footer, EventCard)
│   │   └── lib/              # API helpers, auth state, and toast notifications
│   ├── package.json
│   └── next.config.mjs
└── backend/                  # Express.js API
    ├── db/                   # Database schema, initialization, and seed data
    ├── middleware/           # Auth, Roles, and Validation middleware
    ├── routes/               # API routes (Auth, Events, Tickets, Users, Admin, Notifications)
    ├── utils/                # Helper utilities (Calendar, Email)
    ├── server.js             # Entry point
    └── package.json
```

## ⚙️ Requirements & Installation

### Prerequisites
- **Node.js** (v18.x or newer recommended)
- **npm** or **yarn**

### 1. Clone the Repository
```bash
git clone https://github.com/kalhar108/Zestify.git
cd Zestify
```

### 2. Setup Backend
```bash
cd backend
npm install
npm run seed  # Initialize and seed the SQLite database
npm run dev   # Start the Express server on http://localhost:5000
```

### 3. Setup Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev   # Start the Next.js development server on http://localhost:3000
```

## 🎨 Design & UI
The frontend follows a highly interactive, premium design standard. It focuses on visual excellence utilizing modern typography, dynamic hover interactions, and micro-animations to create a vibrant "Zesty" feel. No third-party UI libraries like Tailwind were used, ensuring full flexibility and a tailored vanilla CSS approach.

## 🔐 Environment Variables
*(Ensure you have a `.env` file in the backend root for secret management)*
```env
# Backend .env example
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_here
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```

## 📜 License
This project is for educational and portfolio purposes.
