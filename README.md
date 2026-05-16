# PayRemind — Mini Payment Reminder System

A full-stack payment reminder system built for a small business internship assignment.

![Stack](https://img.shields.io/badge/React-18-blue) ![Stack](https://img.shields.io/badge/Tailwind_CSS-v4-teal) ![Stack](https://img.shields.io/badge/Express-4-green) ![Stack](https://img.shields.io/badge/SQLite-sql.js-yellow)

## Features

- **Dashboard** — Total invoices, unpaid amount, overdue count, paid vs unpaid donut chart
- **Invoice Management** — Create, view, search (by name/email), and filter (by status)
- **Email Reminders** — Send real reminder emails via EmailJS (client-side)
- **Auto-Overdue** — Invoices past due date are automatically marked overdue
- **Reminder History** — Full audit trail of sent reminders per invoice
- **Responsive** — Mobile-first design with bottom nav, desktop sidebar

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Tailwind CSS v4 (Vite) |
| Backend | Node.js + Express |
| Database | SQLite via sql.js |
| Email | EmailJS (client-side) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### 1. Clone & Install

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure EmailJS (Optional)

1. Create a free account at [emailjs.com](https://www.emailjs.com/)
2. Create a service and email template
3. Copy `client/.env.example` to `client/.env` and fill in your keys:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

**Template variables available:**
- `{{to_name}}` — Client name
- `{{to_email}}` — Client email
- `{{invoice_id}}` — Invoice ID
- `{{amount}}` — Formatted amount (₹)
- `{{due_date}}` — Due date
- `{{description}}` — Invoice description

### 3. Run

```bash
# Terminal 1: Start backend (port 3001)
cd server
npm run dev

# Terminal 2: Start frontend (port 5173)
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/invoices` | List invoices (`?search=`, `?status=`) |
| GET | `/api/invoices/stats` | Dashboard statistics |
| GET | `/api/invoices/:id` | Single invoice |
| POST | `/api/invoices` | Create invoice |
| PATCH | `/api/invoices/:id` | Update invoice |
| GET | `/api/reminders/invoice/:id` | Reminder history |
| POST | `/api/reminders` | Log reminder |

## Database Schema

**invoices**: `id`, `client_name`, `client_email`, `amount`, `due_date`, `status`, `description`, `created_at`, `reminder_count`, `last_reminder_sent`

**reminders**: `id`, `invoice_id`, `sent_at`, `status_at_time`

## Status Flow

```
pending → reminder_sent → overdue → paid
```

- `pending` → Initial state
- `reminder_sent` → After first reminder is sent
- `overdue` → Auto-set when due_date passes
- `paid` → Manually marked by user

## License

MIT
