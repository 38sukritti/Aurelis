# AURELIS — Recurring Expense Anomaly Detector

> **Phase 2** · Vanilla JavaScript frontend · Node.js + Express REST API · MongoDB Atlas · Statistical Z-Score Detection
>
> Backend setup, API reference, Postman and deployment: see [`backend/README.md`](backend/README.md).

---

## 1. Problem Statement

Most expense trackers show you what you spent. They do not tell you **when your spending is statistically unusual compared to your own history**.

A ₹10,000 grocery bill might be perfectly normal for one person and a significant outlier for another. Generic alerts ignore this personal baseline. AURELIS solves this by analysing your own transaction history and flagging deviations that are mathematically significant.

---

## 2. Proposed Solution

AURELIS builds a **personal spending baseline** per category (mean + standard deviation) and calculates a **z-score** for every transaction. If the absolute z-score crosses a configurable threshold, the transaction is flagged as an anomaly.

---

## 3. Features (Phase 1)

- ✅ Public landing page with problem statement and algorithm explanation
- ✅ Secure accounts: passwords hashed with bcrypt, JWT login (Phase 2)
- ✅ Transactions and settings stored in MongoDB, available on any device (Phase 2)
- ✅ Add transactions with full form validation
- ✅ Import transactions from CSV files (FileReader API)
- ✅ Dashboard with KPI cards, category summary, recent transactions
- ✅ Delete transactions
- ✅ Full anomaly analysis table with z-score, mean, standard deviation
- ✅ Filter by: All / Anomalies / Normal / Category
- ✅ Configurable z-score threshold (2.0σ – 4.0σ)
- ✅ Edge case handling: σ=0, insufficient data (<3 transactions)
- ✅ Each transaction belongs to one MongoDB user; users cannot see each other's data
- ✅ Re-importing the same CSV does not create duplicates
- ✅ Responsive design (mobile + desktop)

---

## 4. Technology Stack (Phase 1)

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (Vanilla, no frameworks) |
| Logic | Vanilla JavaScript (ES6+) |
| Backend (Phase 2) | Node.js, Express 5 (MVC) |
| Database (Phase 2) | MongoDB Atlas via Mongoose |
| Auth (Phase 2) | bcryptjs + JSON Web Tokens |
| Data Exchange | JSON REST API |
| Import | CSV via FileReader API |
| API Testing | Postman, node:test + Supertest |
| Version Control | Git / GitHub |

**No** frontend framework (React, Bootstrap, Tailwind) and no ML libraries. The z-score detection still runs in the browser.

---

## 5. Architecture

```
                     USER
                      |
                      v
              index.html (Landing)
                      |
                      v
              login.html (Auth)
                      |
                      v
            dashboard.html (Workspace)
            /                        \
           /                          \
          v                            v
  Add Transaction                 Import CSV
  (Modal + Form)                  (FileReader)
          \                            /
           \                          /
            v                        v
              js/storage.js  →  js/api.js
                        |   fetch + JWT
                        v
          Express REST API (backend/)
          routes → middleware → controllers
                        |   Mongoose
                        v
                  MongoDB Atlas
          (users, transactions, settings)
                        |
                        v   transactions loaded into the browser
             anomalyDetector.js
             ┌─────────┴─────────┐
             v                   v
         Baselines           Z-Scores
         (mean + σ)          per tx
             └─────────┬─────────┘
                        v
                 Anomaly Results
                        |
                        v
             anomalies.html (Analysis Table)
```

---

## 6. Anomaly Detection Algorithm

### Step 1 — Group by Category
All transactions are grouped by their category (Food, Travel, etc.).

### Step 2 — Calculate Mean
```
mean = Σ(amounts) / n
```

### Step 3 — Calculate Standard Deviation (Population)
```
variance = Σ((x − mean)²) / n
σ = √variance
```

### Step 4 — Calculate Z-Score
```
z = (amount − mean) / σ
```

### Step 5 — Flag Anomaly
```
if |z| ≥ threshold → isAnomaly = true
```

### Edge Cases
| Situation | Handling |
|---|---|
| σ = 0 (all identical amounts) | z-score = 0, not flagged |
| < 3 transactions in category | Marked "Insufficient Data", not evaluated |
| threshold configurable | Default 3.0σ; range 2.0σ – 4.0σ in Settings |

### Severity Classification
| Z-Score (abs) | Severity |
|---|---|
| ≥ threshold | Moderate |
| ≥ threshold + 1.0 | High |
| ≥ threshold + 2.0 | Critical |

---

## 7. Data Structure

```js
// Transaction as returned by GET /api/transactions (stored in MongoDB)
{
  id:            "66c1f0...",          // MongoDB ObjectId
  userId:        "66c1ef...",          // owner (ObjectId of the user)
  amount:        1500,
  category:      "Food",
  merchant:      "Taj Hotel Dining",
  description:   "Taj Hotel Dining",
  date:          "2026-08-17",
  timestamp:     1786924800000,
  paymentMethod: "Credit Card",
  recurring:     false,
  notes:         "",
  source:        "manual"              // manual | csv | demo | legacy
}

// What the browser still keeps in localStorage
aurelis_token        → JWT for the API (no password is ever stored)
currentUser          → { id, name, email } for greeting the user
aurelis_transactions → Phase 1 data, kept only as a backup for migration
```

Full MongoDB schemas: see [`backend/README.md`](backend/README.md#mongodb-collections).

---

## 8. CSV Import Format

```csv
date,category,amount,description
2026-08-10,Food,250,Lunch
2026-08-11,Travel,800,Cab fare
2026-08-12,Shopping,4500,New clothes
```

- **Required columns:** `date`, `amount` (`category` defaults to `Other`)
- `description` / `merchant`, `payment_method` and `transaction_id` are optional
- Invalid rows are skipped with a count shown in the import summary
- Rows are validated again by the server before they are saved
- Importing the same file twice skips rows that are already saved (matched by `transaction_id`, or by date + amount + category + merchant when there is no ID column)

---

## 9. Folder Structure

```
aurelis/
│
├── frontend/           ← Client application (HTML5, Vanilla CSS3, Vanilla JS)
│   ├── index.html      ← Public landing page
│   ├── login.html      ← Login / Register (backend JWT auth)
│   ├── dashboard.html  ← Main dashboard workspace
│   ├── anomalies.html  ← Anomaly analysis table
│   ├── app.html        ← Advanced SPA (original Aurelis shell)
│   ├── css/
│   │   ├── style.css       ← Shared base + color system
│   │   ├── components.css  ← Shared UI components
│   │   ├── responsive.css  ← Shared responsive utilities
│   │   ├── home.css        ← Landing page styles
│   │   ├── auth.css        ← Login / register styles
│   │   ├── dashboard.css   ← Dashboard styles
│   │   └── anomalies.css   ← Anomaly page styles
│   └── js/
│       ├── api.js              ← API base URL + fetch helper (Phase 2)
│       ├── storage.js          ← Data layer: API calls + in-memory cache (M1, Phase 2)
│       ├── transactions.js     ← Transaction helpers (M1)
│       ├── anomalyDetector.js  ← Z-score engine (M1)
│       ├── auth.js             ← Authentication (M3)
│       ├── dashboard.js        ← Dashboard logic (M3)
│       ├── anomalies.js        ← Anomaly page logic (M3)
│       ├── csv.js              ← CSV import (M3)
│       └── utils.js            ← Shared utilities (M3, all review)
│
└── backend/            ← Phase 2 REST API (Node.js + Express + MongoDB)
    ├── src/
    │   ├── config/db.js        ← MongoDB connection
    │   ├── models/             ← User, Transaction, Settings (Mongoose)
    │   ├── controllers/        ← auth, transaction, settings logic
    │   ├── routes/             ← URL → controller mapping
    │   ├── middleware/         ← JWT auth, DB check, error handler
    │   ├── utils/              ← input validation, demo dataset
    │   ├── app.js              ← Express app setup & static frontend serving
    │   └── server.js           ← connects to MongoDB, then starts listening
    ├── tests/                  ← automated API tests
    ├── postman/                ← Postman collection + environments
    ├── .env.example
    └── README.md
```

---

## 10. Phase 1 Scope

Phase 1 is a **frontend-only demonstration** using:
- HTML + CSS + Vanilla JavaScript
- Browser DOM APIs
- LocalStorage for persistence
- FileReader API for CSV import

**Authentication disclaimer (Phase 1 only):** Credentials were stored in plain text in LocalStorage. Phase 2 replaced this with bcrypt-hashed passwords and JWT authentication.

---

## 11. Phase 2 — Backend Migration (Implemented)

| Feature | Technology | Status |
|---|---|---|
| Secure authentication | Express.js + JWT + bcrypt | ✅ Done |
| Database | MongoDB Atlas (`users`, `transactions`, `settings`) | ✅ Done |
| REST API | `/api/auth`, `/api/transactions`, `/api/settings`, `/api/health` | ✅ Done |
| Frontend | Existing HTML/CSS/JS kept as-is (no React) | ✅ Kept unchanged |
| Detection | Still the browser z-score engine on data from the API | ✅ Unchanged |
| Server-side detection, frequency-based detection | — | Future scope |

The frontend design was not changed. Only the data layer (`js/storage.js`, new `js/api.js`) and the code that saves data (`js/auth.js`, `js/app.js`, the write actions in `js/router.js`, `js/csv.js`) were updated to call the API.

**Existing browser data:** data saved by Phase 1 is not moved to MongoDB automatically. After you register with the same email you used before, the dashboard offers once to import the old transactions. The old browser copy is never deleted. Phase 1 passwords are not migrated, so every user must register again.

---

## 12. Team Collaboration

All team members contributed collaboratively across both Frontend and Backend architecture:

| Member | Name | Full-Stack Responsibilities |
|---|---|---|
| Member 1 | **Sukritti Singla** | Database & Server Setup, Mongoose Schemas, Client Storage Engine, Statistical Detection |
| Member 2 | **Harshita Malhotra** | Frontend Folder Structure, Workspace UI & Layouts, User Auth Models, Route Handlers |
| Member 3 | **Simran Kapoor** | Backend API Controllers, Middleware & JWT Security, Client API Services, Test Automation |

---

## 13. How to Run

1. Clone the repository and install the backend:
   ```bash
   git clone https://github.com/38sukritti/Aurelis.git
   cd Aurelis/backend
   npm install
   cp .env.example .env      # then fill in MONGODB_URI and JWT_SECRET
   npm run dev
   ```

2. Open **http://localhost:5050**. The backend serves the existing frontend as well as the API, so no second server is needed.
   - You can still use VS Code Live Server or `python3 -m http.server`. `js/api.js` then calls the backend on `http://localhost:5050/api`.

3. Application flow:
   ```
   index.html → login.html → dashboard.html (#/dashboard, #/transactions, #/anomalies, ...)
   ```

4. Run the API tests: `cd backend && npm test`.

Full details (environment variables, API reference, Postman, Render deployment): [`backend/README.md`](backend/README.md).

---

## 14. Git Workflow

```bash
# Before pushing
git pull origin main

# Commit with descriptive messages
git add .
git commit -m "feat: implement z-score anomaly detection"
git push origin main
```

### Commit Convention
| Prefix | Use |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `style:` | CSS / UI changes |
| `test:` | Algorithm testing |
| `chore:` | Cleanup, docs |

---

## 15. 6-Day Commit Plan

| Day | Commit No. | Author | Commit Message | Key Files |
|:---:|:---:|:---|:---|:---|
| **Day 1** | **#01** | Harshita | `feat(design): initialize core color tokens, typography and reset styles` | `css/style.css` |
| **Day 1** | **#02** | Sukritti | `feat(storage): implement LocalStorage schema, user session and transaction persistence` | `js/storage.js` |
| **Day 1** | **#03** | Sukritti | `feat(utils): create currency formatting, date helpers and DOM utility functions` | `js/utils.js` |
| **Day 1** | **#04** | Sukritti | `feat(math): implement mean, variance, sample standard deviation and Z-score calculations` | `js/statistics.js` |
| **Day 2** | **#05** | Harshita | `feat(ui): design card containers, badge variants, buttons and modal dialogs` | `css/components.css` |
| **Day 2** | **#06** | Harshita | `style: implement landing page hero, feature grids, and showcase sections` | `css/home.css` |
| **Day 2** | **#07** | Harshita | `feat(landing): build interactive landing page with statistical simulator` | `index.html` |
| **Day 2** | **#08** | Sukritti | `feat(data): seed realistic transaction categories, baseline profiles, and synthetic generator` | `js/data.js` |
| **Day 3** | **#09** | Sukritti | `feat(detector): build multi-category Z-score anomaly detector and threshold logic` | `js/anomalyDetector.js` |
| **Day 3** | **#10** | Sukritti | `feat(engine): pipeline transactions through baseline calculation and decorate outliers` | `js/anomalyEngine.js` |
| **Day 3** | **#11** | Sukritti | `feat(csv): implement CSV file parsing, validation and transaction batch import` | `js/csv.js` |
| **Day 3** | **#12** | Harshita | `feat(auth): design authentication tabbed cards, inputs and responsive forms` | `css/auth.css` |
| **Day 4** | **#13** | Harshita | `feat(auth): create sign in and account registration interface` | `login.html` |
| **Day 4** | **#14** | Simran | `feat(auth): client-side authentication controller, demo login and session guards` | `js/auth.js` |
| **Day 4** | **#15** | Sukritti | `feat(transactions): transaction CRUD helpers, validation and category tagging` | `js/transactions.js` |
| **Day 4** | **#16** | Simran | `feat(charts): build Canvas 2D spending trend timeline and anomaly rate gauge` | `js/charts.js` |
| **Day 5** | **#17** | Simran | `feat(insights): generate plain-English spending anomalies and actionable insights` | `js/insights.js` |
| **Day 5** | **#18** | Harshita | `feat(ui): dynamic table rendering, toast notification system and badge helpers` | `js/ui.js` |
| **Day 5** | **#19** | Simran | `feat(router): build SPA hash router and view renderers for statistical dashboard` | `js/router.js` |
| **Day 5** | **#20** | Harshita | `feat(dashboard): style financial KPI cards, sidebar navigation and metric widgets` | `css/dashboard.css` |
| **Day 5** | **#21** | Harshita | `feat(anomalies): style statistical anomaly table, filter chips and Z-score gauges` | `css/anomalies.css` |
| **Day 6** | **#22** | Harshita | `feat(responsive): mobile breakpoints, touch optimizations and adaptive grid layouts` | `css/responsive.css` |
| **Day 6** | **#23** | Simran | `feat(dashboard): create main AURELIS workspace shell with left sidebar navigation` | `dashboard.html` |
| **Day 6** | **#24** | Simran | `feat(app): SPA shell container and left sidebar navigation system` | `app.html` |
| **Day 6** | **#25** | Simran | `feat(anomalies): standalone statistical anomaly inspector and sensitivity controls` | `anomalies.html` |
| **Day 6** | **#26** | Simran | `feat(dashboard): dashboard event listeners, modal controllers and CSV wiring` | `js/dashboard.js` |
| **Day 6** | **#27** | Simran | `feat(anomalies): anomaly filter handlers, threshold slider and table updates` | `js/anomalies.js` |
| **Day 6** | **#28** | Simran | `feat(app): SPA bootstrap initialization and global lifecycle event listeners` | `js/app.js` |
| **Day 6** | **#29** | Sukritti | `refactor: archive experimental DNN simulations in favor of Phase 1 statistical engine` | `js/dnnSimulation.js` |
| **Day 6** | **#30** | Simran | `docs: finalize comprehensive project documentation and team deliverables` | `README.md` |

---

*AURELIS — Phase 1 (frontend + statistical detection) and Phase 2 (Node.js/Express/MongoDB backend). Built for educational demonstration.*
