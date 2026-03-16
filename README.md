# PikiShield — Full-Stack

Micro-protection for Kenya's boda boda riders. Bail bond, income stipend and funeral cover from KES 15/day.

---

## Project Structure

```
pikishield/
├── backend/              ← Node.js + Express + MongoDB API
│   ├── src/
│   │   ├── models/       ← Mongoose schemas (User, Policy, Claim, Payment, Document, Transaction)
│   │   ├── routes/       ← REST API routes (auth, users, policies, claims, payments, documents)
│   │   ├── middleware/   ← JWT auth middleware
│   │   └── utils/        ← seed.js
│   ├── uploads/          ← Uploaded KYC & claim documents (gitignored)
│   ├── .env              ← Local environment variables (pre-filled for dev)
│   └── package.json
│
├── frontend/             ← React 18 app (your existing code — unchanged)
│   ├── src/
│   │   ├── pages/        ← All 18 pages (Admin, Agent, Rider, NOK, Member)
│   │   ├── components/   ← Sidebar, NotificationBell, CameraCapture, etc.
│   │   ├── context/      ← AuthContext
│   │   └── utils/api.js  ← Axios client (auto dev/prod URL switching)
│   └── package.json      ← proxy: http://localhost:5000 (dev only)
│
├── package.json          ← Root — run both with one command
└── README.md
```

---

## Quick Start (Computer — Local Dev)

### 1. Requirements
- **Node.js** 18 or newer — https://nodejs.org
- **MongoDB** running locally — https://www.mongodb.com/try/download/community  
  OR use a free Atlas cloud cluster (update `MONGODB_URI` in `backend/.env`)

### 2. Install all dependencies
```bash
# From the root pikishield/ folder:
npm run install:all
```

### 3. Start both backend and frontend together
```bash
npm run dev
```

This opens:
- **Backend API**: http://localhost:5000
- **Frontend app**: http://localhost:3000 (opens in browser automatically)

### 4. Seed the database (first time only)
Open a second terminal and run:
```bash
npm run seed
```

This creates sample data including all 5 user roles with known passwords.

### 5. Login with seed credentials

| Role    | Phone / Login    | Password    |
|---------|-----------------|-------------|
| Admin   | 254700000001    | Admin@1234  |
| Agent   | 254700000002    | Agent@1234  |
| Rider   | 254712345678    | Rider@1234  |
| Member  | 254733111222    | Piki1234!   |
| NOK     | `NOK-00001`     | Nok@1234    |

> NOK logs in using their NOK number (printed by seed), not a phone number.

---

## Mobile Access (Same Wi-Fi)

Your phone can access the app running on your computer without any extra setup.

### 1. Find your computer's local IP address
- **Windows**: Open Command Prompt → type `ipconfig` → look for **IPv4 Address** (e.g. `192.168.1.5`)
- **Mac**: System Preferences → Network → look for the IP next to Wi-Fi
- **Linux**: `ip addr show` or `hostname -I`

### 2. Start the backend so it accepts connections from your network
The backend already listens on `0.0.0.0` (all interfaces), so no change needed.

### 3. Update the frontend proxy for your IP
In `frontend/package.json`, change:
```json
"proxy": "http://localhost:5000"
```
to:
```json
"proxy": "http://192.168.1.5:5000"
```
(Use your actual IP from step 1.)

### 4. Open the app on your phone
Make sure your phone is on the **same Wi-Fi network**, then open:
```
http://192.168.1.5:3000
```
The app is fully mobile-responsive with a bottom navigation bar for mobile.

### 5. Add to home screen (PWA)
- **iPhone**: Safari → Share button → "Add to Home Screen"
- **Android**: Chrome → three-dot menu → "Add to Home Screen" or "Install App"

The app will open full-screen like a native app.

---

## Production Deployment

### Backend (e.g. Render, Railway, or VPS)
1. Push `backend/` to your server
2. Set environment variables (see `backend/.env.example`)
3. Run `npm start`

### Frontend (e.g. Cloudflare Pages, Netlify, Vercel)
1. Set environment variable: `REACT_APP_API_URL=https://your-backend-domain.com`
2. Run `npm run build` in `frontend/`
3. Upload the `frontend/build/` folder to your host

---

## API Endpoints Reference

### Auth — `/api/auth`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/setup-status` | Check if first admin setup is needed |
| POST | `/setup-admin` | Create first admin (only when no admin exists) |
| POST | `/login` | Login (phone/NOK number + password) |
| POST | `/register` | Self-register as rider |
| POST | `/register-nok` | Register a Next of Kin |
| POST | `/register-member` | Agent registers a funeral member |
| GET | `/me` | Get logged-in user data |
| POST | `/forgot-password` | Request OTP |
| POST | `/verify-otp` | Verify OTP, receive reset token |
| POST | `/reset-password` | Set new password using reset token |
| POST | `/change-password` | Change own password |
| GET | `/notifications` | Get notifications |
| PATCH | `/notifications/:id/read` | Mark one notification read |
| PATCH | `/notifications/read-all` | Mark all notifications read |

### Policies — `/api/policies`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/packages` | List available packages (bail, bail_income, funeral) |
| GET | `/` | Rider's own policies |
| POST | `/subscribe` | Subscribe to a package |
| DELETE | `/:id` | Cancel a policy |

### Claims — `/api/claims`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Own claims (add `?all=1` for admin all-claims) |
| GET | `/:id` | Single claim detail |
| POST | `/` | Submit a new claim |
| PATCH | `/:id/status` | Update claim status (admin only) |

### Payments — `/api/payments`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/mpesa/initiate` | Trigger M-Pesa STK push |
| GET | `/mpesa/status/:id` | Poll payment status |
| POST | `/mpesa/callback` | Safaricom webhook |
| POST | `/manual` | Record manual payment (admin) |
| GET | `/history` | Rider's payment history |

### Documents — `/api/documents`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/types` | Required doc types per claim type |
| POST | `/upload-kyc` | Pre-auth KYC upload (no token needed) |
| POST | `/attach-kyc` | Attach KYC docs after registration |
| POST | `/upload` | Authenticated doc upload |
| POST | `/attach` | Attach docs to a claim |
| GET | `/claim/:id` | Docs for a claim |
| GET | `/user/:id` | Docs for a user |
| GET | `/:id/preview` | Inline preview (token via query or header) |
| GET | `/:id/download` | Download file |
| DELETE | `/:id` | Delete a document |
| PATCH | `/:id/verify` | Admin verifies a document |

### Users — `/api/users`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Rider dashboard stats |
| GET | `/admin/dashboard` | Admin overview data |
| GET | `/agent/dashboard` | Agent's enrolled users + stats |
| GET | `/admin/agents` | All agents report |
| GET | `/admin/pending-onboards` | Pending KYC users |
| GET | `/transactions` | Rider's transaction history |
| POST | `/tokens/earn` | Earn Shield Tokens |
| POST | `/tokens/redeem` | Redeem tokens |
| PATCH | `/profile` | Update profile |
| PATCH | `/:id/approve-kyc` | Admin approves KYC |
| PATCH | `/:id/reject-kyc` | Admin rejects KYC |
| PATCH | `/:id/suspend` | Admin suspends user |
| PATCH | `/:id/unsuspend` | Admin reinstates user |
| POST | `/admin/create-agent` | Admin creates an agent |
| POST | `/admin/create-admin` | Admin creates another admin |

---

## M-Pesa Configuration (Production)

1. Register at https://developer.safaricom.co.ke
2. Create an app and get your Consumer Key + Consumer Secret
3. Get your Lipa Na M-Pesa passkey from the production portal
4. Set all `MPESA_*` variables in `backend/.env`
5. Set `MPESA_ENV=production`
6. Set `MPESA_CALLBACK_URL` to your live backend URL

In development, M-Pesa is **simulated** — payments auto-complete after 5 seconds without any credentials needed.

---

## User Roles

| Role | Access |
|------|--------|
| **admin** | Full access — KYC review, claims approval, agent management, dashboard |
| **agent** | Enrol riders and funeral members on behalf of the company |
| **rider** | Main user — buy policies, submit claims, pay via M-Pesa, earn tokens |
| **member** | Funeral-cover-only member registered by agent — limited dashboard |
| **nok** | Next of Kin — logs in with NOK number, can lodge funeral claims |
