# Second Brain - ADHD-Friendly Personal Organizer

## Overview
**Second Brain** is a mobile-first Progressive Web App (PWA) designed as an ADHD-friendly personal organizer. It combines reminders, bill tracking, notes, and a secure password vault in one calm, offline-first application.

**Current State:** Fully functional MVP with all core features implemented and working offline.

**Tech Stack:** 
- Vanilla HTML5, CSS3, JavaScript (ES6+)
- IndexedDB for local storage
- Web Crypto API for AES-GCM encryption
- Web Notifications API for alerts
- Service Worker for offline support
- PWA manifest for installability

## Recent Changes
- **2025-11-04:** Initial implementation of complete Second Brain PWA
  - Created five-tab navigation (Today, Bills, Vault, Focus, Settings)
  - Implemented IndexedDB wrapper for persistent offline storage
  - Built Web Crypto API wrapper for secure password encryption
  - Added sophisticated recurring bills engine with auto-pay tracking
  - Created password manager with spreadsheet view and generator
  - Implemented 60-second box-breathing Focus Reset exercise
  - Added light/dark/auto theme support
  - Configured PWA manifest and service worker
  - Seeded initial demo data (4 bills, 3 vault passwords, 2 sample tasks)

## Project Architecture

### File Structure
```
/
├── index.html              # Main HTML structure with 5-tab navigation
├── style.css              # Mobile-first CSS with light/dark themes
├── manifest.json          # PWA manifest for installability
├── service-worker.js      # Offline caching and PWA support
├── replit.md             # This file
└── js/
    ├── utils.js          # Utility functions (dates, notifications, toasts)
    ├── db.js             # IndexedDB wrapper for all data storage
    ├── crypto.js         # Web Crypto API wrapper (AES-GCM, PBKDF2)
    ├── tasks.js          # Today Dashboard module
    ├── bills.js          # Bills & Repeats module with recurrence engine
    ├── vault.js          # Password Vault with encryption
    ├── focus.js          # Focus Reset breathing exercise
    ├── settings.js       # Settings and theme management
    └── script.js         # Main app initialization and routing
```

### Key Features

#### 1. Today Dashboard (tasks.js)
- Quick-add button for Notes, Reminders, and Ideas
- Task filtering: All / Today / Upcoming / Completed
- Completion tracking with confetti animation
- Due date/time support with notifications
- Priority levels and tag system
- Clean card-based UI

#### 2. Bills & Repeats (bills.js)
- **Sophisticated Recurrence Engine:**
  - Weekly, Monthly, Yearly frequencies
  - Last day of month support
  - Skip weekends option (auto-move to next Monday)
  - Custom reminder offsets (e.g., 3 days before, 1 day before)
- **Auto-Pay Tracking:**
  - Auto-pay badge on bills
  - Configurable auto-pay day (days before due date)
  - Automatic payment recording
  - Next auto-pay date display
- **Payment History:**
  - Track all payments with dates, amounts, methods
  - CSV export for payment history
  - Manual and auto payment distinction
- **Smart Grouping:**
  - Overdue / Due Today / Upcoming sections
  - Filter by All / Unpaid / Paid / Auto Pay
- **Seed Data:** Car Payment (15th), Internet (last day, auto-pay), Mortgage (1st), Spotify (12th, auto-pay)

#### 3. Secure Password Vault (vault.js)
- **Military-Grade Encryption:**
  - AES-GCM encryption via Web Crypto API
  - PBKDF2 key derivation (SHA-256, 200,000 iterations)
  - Random salt and IV for each encryption
  - Master password unlocks vault
  - Auto-lock after 5 minutes (configurable)
  - Lock on tab hidden (visibilitychange event)
- **Spreadsheet View:**
  - Favorite star, Title, Username, URL, Password (masked)
  - Search across all fields and tags
  - Sort by favorite, then alphabetically
- **Password Generator:**
  - Configurable length (12-64 characters)
  - Options: uppercase, lowercase, digits, symbols
  - Real-time strength meter (weak/fair/good/strong)
- **Security Features:**
  - Reveal password for 10 seconds
  - Copy username/password with buttons
  - Auto-clear clipboard after 25 seconds (configurable)
  - No secrets logged
- **Export/Import:**
  - Export encrypted (.svault format)
  - Export plaintext CSV (with warning)
  - Import CSV with merge support
- **Seed Data:** 3 demo passwords (Hulu, Ford Login, Blue Ridge)

#### 4. Focus Reset (focus.js)
- Full-screen breathing exercise overlay
- 60-second box-breathing (4 cycles of 4-4-4-4)
- Phases: Inhale 4s → Hold 4s → Exhale 4s → Hold 4s
- Animated circular breathing guide
- Visual progress indicator
- Completion message with toast

#### 5. Settings (settings.js)
- **Theme Management:**
  - Light / Dark / Auto modes
  - Persists across sessions
  - System preference detection
- **Notifications:**
  - Permission request button
  - Status indicator
  - Test notification on enable
- **Data Management:**
  - Export all data (JSON backup)
  - Import data (with confirmation)
  - Vault security settings (auto-lock, clipboard timeout)

### Technical Implementation

#### Data Storage (db.js)
- **IndexedDB Stores:**
  - `tasks` - Today dashboard items
  - `bills` - Recurring bills with payment history
  - `vault` - Encrypted password blob (never plaintext)
  - `vault-meta` - Encrypted vault data
  - `settings` - User preferences and configuration

#### Encryption (crypto.js)
- **Key Derivation:** PBKDF2 with SHA-256, 200k iterations
- **Encryption:** AES-GCM with 256-bit keys
- **Security:** Random salt (16 bytes) + IV (12 bytes) per encryption
- **Password Generator:** Cryptographically secure random values
- **Strength Estimation:** 7-point scoring system

#### Notifications (utils.js)
- Web Notifications API integration
- In-app toast fallback
- Permission checking and requesting
- Bill reminder scheduling
- Task due date alerts

#### PWA Features
- **Service Worker:** Caches all static assets for offline use
- **Manifest:** Installable on any device (mobile/desktop)
- **Offline-First:** All data stored locally in IndexedDB
- **Responsive:** Mobile-first design scales to tablet/desktop

### Design System

#### Colors (Light Mode)
- Primary: `#6ab7ff` (Calming blue)
- Success: `#6dd5a7` (Soft green)
- Warning: `#ffc875` (Gentle orange)
- Danger: `#ff8787` (Soft red)
- Background: `#f5f7fa` (Light gray)
- Cards: `#ffffff` (White)

#### Colors (Dark Mode)
- Background: `#1a1f2e` (Deep blue-gray)
- Cards: `#242b3d` (Lighter blue-gray)
- Text: `#e8ecf1` (Light gray)

#### Typography
- System font stack for native feel
- Large tap targets (min 44px height)
- Clear hierarchy with size and weight

#### Animations
- Smooth transitions (0.3s cubic-bezier)
- Confetti on task completion
- Pulse effects for interactions
- Breathing circle animation
- Toast slide-up animations

### Security Best Practices
1. **No Secret Logging:** Never console.log passwords or keys
2. **Clipboard Auto-Clear:** Default 25 seconds, configurable
3. **Auto-Lock:** Default 5 minutes of inactivity
4. **Visibility Lock:** Auto-lock when tab hidden
5. **Export Warnings:** Alert before plaintext CSV export
6. **Memory Cleanup:** Master password cleared on lock
7. **Web Crypto API:** Industry-standard encryption

### Offline Capabilities
- All features work 100% offline
- Service worker caches all static assets
- IndexedDB persists all user data
- No cloud dependencies
- Data stays on device

### First Run Experience
- Automatic seed data creation:
  - 2 sample tasks (welcome + focus reminder)
  - 4 sample bills (car, internet, mortgage, Spotify)
  - 3 demo vault passwords (on first unlock)
- Welcome toast notification
- All demo data can be edited or deleted

## User Preferences
*(None configured yet - user can set theme, notification preferences, auto-lock timeout)*

## Future Enhancements
- Recurring reminders in Today Dashboard (using bills recurrence engine)
- Password breach checking (Have I Been Pwned API)
- Biometric unlock (Web Authentication API)
- Encrypted cloud sync across devices
- Gamification dashboard (streaks, XP, achievements)
- Categories and smart filters for tasks
- Bill payment reminders with notification scheduling
- Calendar view for bills and tasks
- Data visualizations (spending trends, completion rates)

## Development Notes
- **No Build Tools:** Pure vanilla JS, no webpack/vite/bundler
- **No Frameworks:** No React/Vue/Angular - lightweight and fast
- **No External Dependencies:** Only browser APIs (except zxcvbn planned for password strength)
- **Mobile-First:** Designed for phone/tablet, scales to desktop
- **Accessibility:** Large tap targets, clear labels, semantic HTML
- **Performance:** Minimal JS, efficient IndexedDB queries, service worker caching

## Running the App
The app runs on port 5000 using http-server with cache disabled (`-c-1`) for development. In production, it can be served from any static file host.

**Workflow:** `http-server -p 5000 -c-1`

The app is fully offline-capable once the service worker is registered and cached.
