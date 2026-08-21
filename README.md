# AURELIS — Recurring Expense Anomaly Detector

> **Phase 1** · Vanilla JavaScript · LocalStorage · Statistical Z-Score Detection

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
- ✅ LocalStorage-based demo authentication (register, login, logout)
- ✅ Add transactions with full form validation
- ✅ Import transactions from CSV files (FileReader API)
- ✅ Dashboard with KPI cards, category summary, recent transactions
- ✅ Delete transactions
- ✅ Full anomaly analysis table with z-score, mean, standard deviation
- ✅ Filter by: All / Anomalies / Normal / Category
- ✅ Configurable z-score threshold (2.0σ – 4.0σ)
- ✅ Edge case handling: σ=0, insufficient data (<3 transactions)
- ✅ Transactions associated with user ID (Phase 2 readiness)
- ✅ Responsive design (mobile + desktop)

---

## 4. Technology Stack (Phase 1)

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (Vanilla, no frameworks) |
| Logic | Vanilla JavaScript (ES6+) |
| Persistence | Browser LocalStorage |
| Data Exchange | JSON |
| Import | CSV via FileReader API |
| Version Control | Git / GitHub |

**No:** React, Node.js, Express, MongoDB, JWT, Bootstrap, Tailwind, or ML libraries.

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
                  LocalStorage
                  (transactions)
                        |
                        v
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
// Transaction object (LocalStorage)
{
  id:          "TXN-1723906800000-A3B2",
  userId:      "user@example.com",   // Phase 2 readiness
  amount:      1500,
  category:    "Food",
  description: "Taj Hotel Dining",
  date:        "2026-08-17",
  timestamp:   1723906800000
}

// LocalStorage keys
aurelis_users        → Array of { name, email, password }  // Phase 1 only
aurelis_current_user → { name, email }
aurelis_transactions → Array of transaction objects
aurelis_settings     → { zScoreThreshold, ... }
```

---

## 8. CSV Import Format

```csv
date,category,amount,description
2026-08-10,Food,250,Lunch
2026-08-11,Travel,800,Cab fare
2026-08-12,Shopping,4500,New clothes
```

- **Required columns:** `date`, `category`, `amount`
- `description` is optional
- Invalid rows are skipped with a count shown in the import summary

---

## 9. Folder Structure

```
aurelis/
│
├── index.html          ← Public landing page
├── login.html          ← Login / Register (Phase 1 LocalStorage auth)
├── dashboard.html      ← Main dashboard workspace
├── anomalies.html      ← Anomaly analysis table
├── app.html            ← Advanced SPA (original Aurelis shell)
│
├── css/
│   ├── style.css       ← Shared base + color system
│   ├── components.css  ← Shared UI components
│   ├── responsive.css  ← Shared responsive utilities
│   ├── home.css        ← Landing page styles
│   ├── auth.css        ← Login / register styles
│   ├── dashboard.css   ← Dashboard styles
│   └── anomalies.css   ← Anomaly page styles
│
├── js/
│   ├── storage.js          ← LocalStorage abstraction (M1)
│   ├── transactions.js     ← Transaction helpers (M1)
│   ├── anomalyDetector.js  ← Z-score engine (M1)
│   ├── auth.js             ← Authentication (M3)
│   ├── dashboard.js        ← Dashboard logic (M3)
│   ├── anomalies.js        ← Anomaly page logic (M3)
│   ├── csv.js              ← CSV import (M3)
│   └── utils.js            ← Shared utilities (M3, all review)
│
└── assets/images/      ← Static images
```

---

## 10. Phase 1 Scope

Phase 1 is a **frontend-only demonstration** using:
- HTML + CSS + Vanilla JavaScript
- Browser DOM APIs
- LocalStorage for persistence
- FileReader API for CSV import

**Authentication disclaimer:** Credentials are stored in plain text in LocalStorage for demonstration purposes. This is NOT secure. Phase 2 replaces this with proper JWT authentication.

---

## 11. Phase 2 — Future Scope

> Phase 2 is planned but NOT yet implemented.

| Feature | Technology |
|---|---|
| Secure authentication | Express.js + JWT + bcrypt |
| Database | MongoDB (`users`, `transactions`, `categoryBaselines`) |
| REST API | `/api/transactions/anomalies` |
| Frontend | React with controlled components |
| Server-side detection | Node.js anomaly engine |
| Frequency-based detection | Recurring pattern analysis |

---

## 12. Team Members

| Member | Name | Role | Primary Files |
|---|---|---|---|
| Member 1 | **Sukritti** | Algorithm & Data Logic | `js/anomalyDetector.js`, `js/storage.js`, `js/transactions.js`, `js/statistics.js`, `js/anomalyEngine.js`, `js/data.js`, `js/dnnSimulation.js` |
| Member 2 | **Harshita** | UI / HTML / CSS | `index.html`, `login.html`, `css/style.css`, `css/home.css`, `css/auth.css`, `css/components.css`, `css/responsive.css`, `css/dashboard.css`, `css/anomalies.css`, `js/ui.js` |
| Member 3 | **Simran** | Dashboard / Integration / CSV | `dashboard.html`, `anomalies.html`, `app.html`, `js/dashboard.js`, `js/anomalies.js`, `js/csv.js`, `js/auth.js`, `js/utils.js`, `js/charts.js`, `js/insights.js`, `js/router.js`, `js/app.js` |

---

## 13. How to Run

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-org>/aurelis.git
   cd aurelis
   ```

2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari) or run a local server:
   ```bash
   python3 -m http.server 3000
   ```
   - **No build step required.**
   - **No npm install required.**

3. Application flow:
   ```
   index.html → login.html → dashboard.html → anomalies.html
   ```

4. For the advanced SPA view: open `app.html` or visit `http://localhost:3000/app.html`.

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

*AURELIS Phase 1 — Built for educational demonstration of JavaScript concepts and statistical anomaly detection.*
