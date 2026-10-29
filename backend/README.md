# AURELIS Backend (Phase 2)

REST API for **AURELIS — Recurring Expense Anomaly Detector**.
Built with **Node.js, Express 5, MongoDB Atlas and Mongoose**, following an MVC structure.

```
Browser (existing HTML/CSS/JS)  →  Express REST API  →  Mongoose  →  MongoDB Atlas
```

The browser never connects to MongoDB directly and never sees the database password or the JWT secret.

---

## 1. Quick start (local)

Requirements: **Node.js 20+** and a MongoDB Atlas cluster (the free M0 tier is enough).

```bash
cd backend
npm install
cp .env.example .env        # then edit .env, see section 2
npm run dev                 # restarts automatically when files change (nodemon)
```

When it is ready you will see:

```
MongoDB connected: <cluster-host>/aurelis
AURELIS API ready on http://localhost:5050 (development)
```

Open **http://localhost:5050**. The backend also serves the frontend from `frontend/` (`index.html`, `login.html`, `dashboard.html`, `css/`, `js/`), so the whole app runs from one command.

> The default port is **5050**, not 5000. On macOS, port 5000 is used by *AirPlay Receiver*.

`npm start` runs the server without nodemon (this is what Render uses).

---

## 2. Environment variables

Copy `.env.example` to `.env`. The real `.env` is git-ignored and must never be committed.

| Variable | Required | Example / default | Purpose |
|---|---|---|---|
| `MONGODB_URI` | **yes** | `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/aurelis?retryWrites=true&w=majority` | Atlas connection string. Include the database name (`/aurelis`). |
| `JWT_SECRET` | **yes** | 96 random hex characters | Signs login tokens. Must be at least 32 characters in production. |
| `PORT` | no | `5050` | Port to listen on. Render sets this itself. |
| `JWT_EXPIRES_IN` | no | `7d` | How long a login lasts. |
| `CLIENT_URL` | production only | `https://aurelis.netlify.app` | Comma-separated list of frontend origins allowed by CORS. Not needed if the backend serves the frontend. |
| `NODE_ENV` | no | `development` | Use `production` on Render. |
| `SERVE_FRONTEND` | no | `true` | Also serve the HTML/CSS/JS frontend from this server. |
| `ENABLE_DEMO_LOGIN` | no | `true` | Enables the "Sign In as Demo User" button. |

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Creating the MongoDB Atlas database

1. Sign in at <https://cloud.mongodb.com> and create a free **M0** cluster.
2. **Database Access** → *Add New Database User* → choose a username and password. Give it the *Read and write to any database* role.
3. **Network Access** → *Add IP Address*. For local development add your current IP. For Render, add `0.0.0.0/0`, because Render's free tier has no fixed outbound IP.
4. **Clusters → Connect → Drivers** → copy the connection string. Replace `<password>` and add `/aurelis` before the `?`:
   `mongodb+srv://aurelis_app:<password>@cluster0.abcde.mongodb.net/aurelis?retryWrites=true&w=majority`
5. Paste it into `MONGODB_URI` in `.env`.

The `users`, `transactions` and `settings` collections are created automatically on first use.

---

## 3. Folder structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js                    MongoDB connection (connect, disconnect, status)
│   ├── models/
│   │   ├── User.js                  name, email (unique), passwordHash
│   │   ├── Transaction.js           a user's expense records
│   │   └── Settings.js              one document per user: zScoreThreshold
│   ├── controllers/
│   │   ├── authController.js        register, login, demo login, current user
│   │   ├── transactionController.js CRUD, CSV import/export, demo data
│   │   └── settingsController.js    read / update the threshold
│   ├── routes/
│   │   ├── authRoutes.js            /api/auth/*
│   │   ├── transactionRoutes.js     /api/transactions/*
│   │   └── settingsRoutes.js        /api/settings
│   ├── middleware/
│   │   ├── authMiddleware.js        verifies the JWT, sets req.user
│   │   ├── databaseMiddleware.js    returns 503 if MongoDB is down
│   │   └── errorMiddleware.js       404 for unknown routes + safe JSON errors
│   ├── utils/
│   │   ├── transactionInput.js      validates and cleans transaction data
│   │   └── demoTransactions.js      sample dataset with deliberate outliers
│   ├── app.js                       builds the Express app (CORS, JSON, routes, health)
│   └── server.js                    checks .env, connects to MongoDB, then listens
├── tests/                           automated API tests (node:test + Supertest)
├── postman/                         Postman collection + Local/Render environments
├── .env.example                     documented variables (no real secrets)
├── .gitignore
└── package.json
```

`app.js` and `server.js` are separate so the tests can build the app without opening a network port.

---

## 4. MVC architecture

```
Frontend (fetch + "Authorization: Bearer <token>")
   │
   ▼
Route            routes/transactionRoutes.js   POST /api/transactions
   │
   ▼
Middleware       databaseMiddleware → authMiddleware (sets req.user from the token)
   │
   ▼
Controller       transactionController.createTransaction
   │             validates the body, sets userId = req.user._id
   ▼
Model            Transaction.create(...)  (Mongoose schema validation)
   │
   ▼
MongoDB Atlas    document saved → JSON response 201 → frontend updates the UI
```

- **Models** describe the data and its rules (types, limits, unique indexes). They also control what is sent back: `passwordHash` is never included.
- **Controllers** contain the request logic: validate input, check ownership, call the model, send the response.
- **Routes** only map URLs to controllers and attach middleware. There are no database queries in them.
- **Middleware** handles cross-cutting work: authentication, database availability and error formatting.
- **The View** is the existing frontend. It is unchanged and talks to the API through `js/api.js` and `js/storage.js`.

---

## 5. MongoDB collections

### `users`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | required, max 80 |
| `email` | String | required, **unique**, stored lowercase and trimmed |
| `passwordHash` | String | bcrypt hash (10 rounds). Excluded from queries by default and never returned. |
| `createdAt`, `updatedAt` | Date | automatic |

### `transactions`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | sent to the frontend as `id` |
| `userId` | ObjectId → `users` | owner, always taken from the login token |
| `amount` | Number | required, 0.01 – 1,000,000,000 |
| `category` | String | default `Other`, max 50. Free text, because the existing CSV import accepts any category. |
| `merchant` | String | max 120 |
| `description` | String | max 200 |
| `date` | Date | required, stored as midnight UTC. Sent as `"YYYY-MM-DD"` plus a numeric `timestamp`. |
| `paymentMethod` | String | default `Credit Card`, max 40 |
| `recurring` | Boolean | default `false` |
| `notes` | String | max 300 |
| `source` | String | `manual`, `csv`, `demo` or `legacy` (Phase 1 browser data) |
| `importRef` | String | ID of an imported row, used to skip duplicates |
| `createdAt`, `updatedAt` | Date | automatic |

Indexes: `{ userId, date }` for listing, and a unique `{ userId, importRef }` (only for rows that have an `importRef`).

There is no income/expense `type` field, because the existing app only tracks expenses.

### `settings`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | ObjectId → `users` | **unique**: one settings document per user |
| `zScoreThreshold` | Number | default **3.0**, allowed 2.0 – 4.0 (same as the Settings dropdown) |
| `createdAt`, `updatedAt` | Date | automatic |

Phase 1 also wrote `behavioralIntelligence`, `experimentalModel` and `showConfidenceScores`. Nothing in the app ever read them, so they were not carried over.

---

## 6. API reference

Base URL: `http://localhost:5050/api` locally, `https://<your-service>.onrender.com/api` on Render.

Protected endpoints need the header `Authorization: Bearer <token>`.

### Response format

```json
{ "success": true, "message": "Transaction created.", "data": { } }
{ "success": false, "message": "Amount must be greater than zero.", "errors": ["..."] }
```

| Status | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Invalid input (the message says what is wrong) |
| 401 | Missing, invalid or expired token, or wrong login |
| 403 | Origin not allowed by CORS, or demo login disabled |
| 404 | Not found, **including another user's transaction** (we don't reveal that it exists) |
| 409 | Email already registered |
| 413 | Request body larger than 2 MB |
| 503 | MongoDB unavailable |
| 500 | Unexpected error (details are only included when `NODE_ENV=development`) |

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | – | `200 {"status":"ok","database":"connected"}`, or **503** `{"status":"error","database":"disconnected"}` when MongoDB is down |

### Authentication

| Method | Endpoint | Auth | Body | Success |
|---|---|---|---|---|
| POST | `/api/auth/register` | – | `{ "name", "email", "password" }` (password ≥ 6 chars) | 201 `{ token, user }` |
| POST | `/api/auth/login` | – | `{ "email", "password" }` | 200 `{ token, user }` |
| GET | `/api/auth/me` | ✔ | – | 200 `{ user }` |
| POST | `/api/auth/demo` | – | – | 200 `{ token, user }` for the shared demo account |

### Transactions (all require a token)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transactions` | Your transactions, newest first. Optional: `?category=Food`, `?from=2026-08-01&to=2026-08-31`, `?page=1&limit=50` (limit ≤ 500). Without `limit` everything is returned, because the anomaly engine needs the full history. |
| GET | `/api/transactions/:id` | One of your transactions |
| POST | `/api/transactions` | Create |
| PUT | `/api/transactions/:id` | Update. Send any subset of fields. |
| DELETE | `/api/transactions/:id` | Delete one |
| DELETE | `/api/transactions` | Delete **all** of your transactions ("Clear All My Transactions") |
| POST | `/api/transactions/import` | Import rows parsed from a CSV file (see below) |
| GET | `/api/transactions/export` | Download your transactions as CSV |
| POST | `/api/transactions/demo` | Load the sample dataset. Earlier demo rows are replaced; your own rows are kept. |

Example create body:

```json
{
  "amount": 2500,
  "category": "Shopping",
  "merchant": "Apple Store",
  "description": "Apple Store",
  "date": "2026-08-14",
  "paymentMethod": "Credit Card",
  "recurring": false,
  "notes": "New headphones"
}
```

Any `userId` in the body is ignored. The owner always comes from the token.

Filtering by **anomaly status** is not done by the API. Anomaly detection is the existing z-score engine in the browser, and it needs all of the user's transactions to compute baselines. The Transactions and Anomalies views still filter by anomaly status as before.

#### CSV import

The browser reads the CSV file with the existing `js/csv.js` parser, so all the column names it already supports keep working. It then sends the rows as JSON:

```json
{
  "transactions": [
    { "importRef": "TXN001", "date": "2026-08-01", "amount": 350, "category": "Food", "merchant": "Starbucks Coffee", "paymentMethod": "Debit Card" }
  ]
}
```

- Every row is validated again on the server. Invalid rows are skipped and reported (`invalidCount`, `errors[]` with row numbers). If **every** row is invalid, the response is 400.
- At most 5,000 rows per request, and a 2 MB body limit.
- **Duplicate strategy:** each row gets an `importRef`. This is the CSV's `Transaction_ID` column if it has one; otherwise it is built from date + amount + category + merchant plus a counter for repeated rows in the same file. Rows whose `importRef` is already saved for this user are skipped (`duplicateCount`), so importing the same file twice is safe. Two identical purchases on the same day in one file are both kept.
- The response is 201 when something was imported, and 200 when everything was a duplicate.

#### CSV export

`GET /api/transactions/export` returns `date,merchant,category,amount,paymentMethod,recurring,notes`. These are the same columns as the Export CSV button, so the file can be imported again. It only ever contains the logged-in user's rows.

### Settings (require a token)

| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET | `/api/settings` | – | `{ "zScoreThreshold": 3 }`. Created with the default on first access. |
| PUT | `/api/settings` | `{ "zScoreThreshold": 2.5 }` | Must be a number from 2.0 to 4.0 |

---

## 7. Security

- Passwords are hashed with **bcrypt** and never stored or returned in plain text. Login answers "Invalid email or password" either way, so it doesn't reveal which emails exist.
- Every transaction and settings query is filtered by `req.user._id`, which comes from the verified JWT. A client cannot pick a different `userId`.
- Only whitelisted fields are copied from request bodies (`utils/transactionInput.js`).
- **CORS:** in production, only origins listed in `CLIENT_URL` (and the server's own origin) are allowed. In development, localhost and `file://` pages are allowed too.
- Errors return safe messages, never stack traces. `.env` is git-ignored and `JWT_SECRET` has no hard-coded fallback.
- The server refuses to start if `MONGODB_URI` or `JWT_SECRET` is missing, or if MongoDB cannot be reached. If MongoDB drops later, API requests get **503** instead of a false success.
- When the backend serves the frontend, it only exposes the five HTML pages plus `css/` and `js/`, never the `backend/` folder.

### Why a bearer token instead of a cookie

The frontend is a static site and may be hosted on a different domain from the API, for example GitHub Pages plus Render. Cross-site cookies need `SameSite=None; Secure` and are blocked by default in Safari and increasingly in Chrome. So the API returns a JWT that the frontend stores in `localStorage` (`aurelis_token`) and sends as `Authorization: Bearer ...`.

**Risk:** any script running on the page (for example through an XSS bug) can read `localStorage`, and so the token. To limit this, tokens expire (`JWT_EXPIRES_IN`, default 7 days), no password is ever stored in the browser, and signing out removes the token. The redirects in the HTML pages are only for convenience; **real access control is done by the API**.

---

## 8. Tests

```bash
npm test
```

The tests use **node:test + Supertest** against an **in-memory MongoDB** (`mongodb-memory-server`), so no Atlas credentials are needed. The first run downloads a MongoDB binary (~100 MB) into `node_modules/.cache`.

What is covered (35 tests):

- **Auth:** register, password stored only as a bcrypt hash, duplicate email (409, case-insensitive), invalid input, login, wrong password, missing / forged / expired token, `/me`, demo login seeding only once, demo email reserved.
- **Transactions:** create (frontend shape), client `userId` ignored, invalid data rejected, list scoped to the user, category filter + pagination, get/update/delete, cross-user read/edit/delete → 404, malformed ID, auth required, **persistence after a server restart**, **database down → 503 rather than a false success** (and health → 503), clear-all keeps other users' data, demo loader replaces only demo rows.
- **Settings:** default 3.0, update, out-of-range / non-number rejected, users isolated, persistence after restart, auth required.
- **CSV:** import assigns the logged-in user even if rows claim another, re-import skips duplicates, rows without IDs deduped, mixed valid/invalid rows, all-invalid / malformed JSON rejected, export contains only the user's rows and escapes quotes and commas.

---

## 9. Testing with Postman

1. In Postman: **Import** → select the three files in `backend/postman/`:
   - `AURELIS.postman_collection.json`
   - `AURELIS-Local.postman_environment.json` (`baseUrl = http://localhost:5050/api`)
   - `AURELIS-Render.postman_environment.json` (edit `baseUrl` to your Render URL)
2. Select the **AURELIS - Local** environment (top right) and start the server with `npm run dev`.
3. Run the folders in order, either one request at a time or with **Run collection**:
   1. Health Check
   2. Authentication: *Register* creates a fresh `student<timestamp>@example.com` account and **saves the JWT into `token`** automatically
   3. Transactions: *Create transaction* **saves `transactionId`**, and the following requests use it
   4. Settings
   5. CSV Import and Export
4. Each request has tests that check the expected status code (201, 400, 401, 404, 409 …), visible in the *Test Results* tab.
5. To test the deployed API, switch the environment to **AURELIS - Render** and run it again.

The collection uses the bearer token at collection level. Requests that must work without a token (register, login, health, "no token" checks) override it with *No Auth*. The test password `Postman123` is only a placeholder for throwaway accounts.

---

## 10. Deploying to Render

1. Push the repository to GitHub (the backend lives in `backend/` in the same repo).
2. On <https://render.com>: **New → Web Service** → connect the `Aurelis` repository.
3. Settings:
   | Setting | Value |
   |---|---|
   | Root Directory | `backend` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Health Check Path | `/api/health` |
4. **Environment** → add:
   - `MONGODB_URI` = your Atlas connection string
   - `JWT_SECRET` = a new long random secret (don't reuse the local one)
   - `NODE_ENV` = `production`
   - `CLIENT_URL` = the URL where the frontend is hosted, if it is not this Render service (e.g. `https://38sukritti.github.io`)
5. In Atlas **Network Access**, allow `0.0.0.0/0` so Render can connect.
6. Deploy, then check:
   - `https://<service>.onrender.com/api/health` → `{"status":"ok","database":"connected"}`
   - Run the Postman collection with the **AURELIS - Render** environment.

### Connecting the frontend

- **Option A (simplest): let Render serve the frontend too.** `SERVE_FRONTEND` is on by default, so `https://<service>.onrender.com/` opens the app and `js/api.js` automatically uses the same origin (`/api`). Nothing to configure.
- **Option B: the frontend stays on its own hosting** (GitHub Pages, Netlify, …). In `js/api.js` set
  `const DEPLOYED_API_URL = 'https://<service>.onrender.com/api';`
  and add that frontend's origin to `CLIENT_URL` on Render.

Render's free tier sleeps after ~15 minutes without traffic, so the first request afterwards can take 30–60 seconds. Open `/api/health` a minute before a presentation.

---

## 11. Migrating Phase 1 (localStorage) data

Phase 1 kept everything in the browser: `aurelis_users`, `currentUser` / `aurelis_current_user`, `aurelis_transactions` (tagged with the user's **email**) and `aurelis_settings`. None of that is moved to MongoDB automatically.

- **Accounts:** Phase 1 passwords were stored in plain text and are **not** migrated. Everyone registers again.
- **Transactions:** register (or log in) with the **same email** you used in Phase 1, in the **same browser**. The dashboard finds your old transactions and asks once whether to import them. They are validated and saved with `source: "legacy"` under your new MongoDB user ID.
  - Each old row's ID becomes `importRef: "legacy:<old id>"`, so retrying never creates duplicates.
  - The old `aurelis_transactions` data is **never deleted**, so it stays as a backup until you remove it yourself.
  - If you clicked *Cancel*, you can still import later from the browser console on the dashboard: `StorageModule.importLegacyTransactions('you@example.com')`.
- **Settings:** the old threshold is not migrated; set it again in Settings (default 3.0σ).
- The shared demo account (`demo@aurelis.io`) never imports browser data.

---

## 12. Known limitations

- The z-score detection runs in the browser (unchanged from Phase 1). The API stores data but does not compute anomalies, so `?anomaly=` filtering is not available server-side.
- There is no rate limiting on login, and no password reset or email verification.
- Bearer token in `localStorage` (see section 7). Logging out does not revoke a token that was already copied elsewhere; it expires after `JWT_EXPIRES_IN`.
- The demo account is shared: anyone who clicks *Sign In as Demo User* sees and can change the same demo data. Set `ENABLE_DEMO_LOGIN=false` to turn it off.
- In the existing anomaly algorithm, an outlier counts toward its own category's baseline. In small categories (e.g. 7 rows), one outlier can therefore never reach a high z-score. This is unchanged Phase 1 behaviour.
