# Census Poststratification API - Demo

A standalone API that builds demographic lookup tables from U.S. Census ACS data for Multilevel Regression with Poststratification (MRP) modeling.

## 🎯 What This Does

Fetches Census American Community Survey (ACS) 1-year estimates at the Congressional District level and cross-tabulates demographic data into ~300 cells per district for use in MRP statistical models.

**Demographic Dimensions:**
- Age Groups: 6 categories (18-24, 25-34, 35-44, 45-54, 55-64, 65+)
- Sex: 2 categories (Female, Male)
- Race/Ethnicity: 5 categories (White, Black, Hispanic, Asian, Other)
- Education: 5 levels (Less Than HS, High School, Some College, BA/BS, Post-Grad)
- Census Regions: 5 regions (Northeast, Midwest, South, West, DC)

**Total:** ~130,000 cells for all 436 Congressional Districts

---

## 🚀 Deploy to Railway (Recommended)

### One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/yourusername/poststrat-demo)

### Manual Deployment

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select this repository

3. **Add PostgreSQL Database**
   - In your project, click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

4. **Set Environment Variables**

   In Railway project settings → Variables, add:

   ```
   CENSUS_API_KEY=your_census_key_here
   ADMIN_SECRET=generate_random_secret_here
   ```

   **Get Census API Key (FREE):**
   - Visit: https://api.census.gov/data/key_signup.html
   - Fill out form (no credit card required)
   - Receive key via email instantly

   **Generate Admin Secret:**
   ```bash
   openssl rand -hex 32
   ```

5. **Deploy**
   - Railway will automatically build and deploy
   - Your API will be live at: `https://your-app.railway.app`

---

## 💻 Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Census API key

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/poststrat-demo.git
   cd poststrat-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Set up database**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Start server**
   ```bash
   npm start
   ```

6. **Open browser**
   ```
   http://localhost:3000
   ```

---

## 📡 API Endpoints

### Public Endpoints

#### `GET /api/health`
Health check

#### `GET /api/info`
API information and capabilities

#### `GET /api/available-years`
List available ACS years

**Response:**
```json
{
  "success": true,
  "years": [2024, 2023, 2022],
  "recommended": 2023
}
```

#### `GET /api/stats/:year`
Get table statistics

**Example:** `GET /api/stats/2022`

**Response:**
```json
{
  "success": true,
  "year": 2022,
  "totalCells": 130800,
  "districtsCount": 436,
  "totalPopulation": 260961909,
  "averageCellsPerDistrict": 300
}
```

#### `GET /api/district/:year/:cd`
Get cells for specific district

**Example:** `GET /api/district/2022/TX-32`

**Response:**
```json
{
  "success": true,
  "year": 2022,
  "cd": "TX-32",
  "cellCount": 300,
  "totalPopulation": 612952,
  "cells": [ /* 300 demographic cells */ ]
}
```

### Admin Endpoints

Require `X-Admin-Secret` header

#### `POST /api/build/:year`
Build poststrat table from Census data

**Example:**
```bash
curl -X POST https://your-app.railway.app/api/build/2022 \
  -H "X-Admin-Secret: your_secret"
```

**Takes:** 15-30 seconds (fetches Census data, builds table)

**Response:**
```json
{
  "success": true,
  "year": 2022,
  "districtsProcessed": 436,
  "cellsGenerated": 130800,
  "cellsStored": 130800
}
```

#### `DELETE /api/table/:year`
Delete table for year

---

## 🎨 Demo UI

The demo includes an interactive frontend at the root URL (`/`) that showcases all API functionality with live examples.

**Features:**
- Fetch available years
- View table statistics
- Query specific districts
- Build new tables (admin only)

---

## 📊 Data Schema

### PoststratCell Table

```sql
CREATE TABLE poststrat_cells (
  id            TEXT PRIMARY KEY,
  year          INTEGER,
  state         TEXT,
  cd            TEXT,
  ageGroup      TEXT,
  sex           TEXT,
  raceEth       TEXT,
  education     TEXT,
  censusRegion  TEXT,
  population    INTEGER,
  createdAt     TIMESTAMP,
  updatedAt     TIMESTAMP
);
```

**Unique constraint:** `(year, state, cd, ageGroup, sex, raceEth, education, censusRegion)`

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Railway provides) |
| `CENSUS_API_KEY` | Yes | Free API key from census.gov |
| `ADMIN_SECRET` | Yes | Random secret for admin endpoints |
| `PORT` | No | Server port (default: 3000, Railway sets automatically) |

---

## 📈 Performance

**Build Time:** 15-30 seconds per year
- 2 Census API requests (50-variable limit)
- Cross-tabulation of 6×2×5×5×5 = 1,500 combinations
- ~300 non-zero cells per district
- Batch database insertion (5,000 cells per batch)

**Database Size:**
- ~130,000 rows per year
- ~20MB per year

---

## 🛠️ Technical Stack

- **Runtime:** Node.js 18+
- **Framework:** Express 5.2
- **Database:** PostgreSQL + Prisma ORM
- **Data Source:** Census ACS 1-Year API
- **Frontend:** Vanilla HTML/CSS/JavaScript

---

## 📝 Use Cases

This API is designed for:

1. **Political Science Research** - MRP modeling of public opinion
2. **Survey Analytics** - Poststratifying survey samples to match population
3. **Demographic Analysis** - Understanding Congressional district composition
4. **Policy Modeling** - Estimating district-level policy preferences

---

## 🤝 Contributing

This is a demo project. For production use or contributions, please contact the maintainer.

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙋 Support

**Questions?** Open an issue or contact: your@email.com

**Demo:** https://your-app.railway.app

**Built by:** DemographAI
