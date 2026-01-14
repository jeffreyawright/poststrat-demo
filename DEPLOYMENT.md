# Railway Deployment Guide

## Step-by-Step Deployment to Railway

### Prerequisites

✅ GitHub account
✅ Census API key (free from https://api.census.gov/data/key_signup.html)

---

## Part 1: Prepare Your Repository

### 1. Push to GitHub

```bash
cd poststrat-demo

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Census Poststratification API demo"

# Create GitHub repo and push
gh repo create poststrat-demo --public --source=. --remote=origin --push
# OR manually: create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/poststrat-demo.git
git push -u origin main
```

---

## Part 2: Deploy to Railway

### 2. Sign Up for Railway

1. Go to https://railway.app
2. Click "Login" → "Login with GitHub"
3. Authorize Railway to access your GitHub

### 3. Create New Project

1. Click "**New Project**"
2. Select "**Deploy from GitHub repo**"
3. Select your `poststrat-demo` repository
4. Railway will automatically detect it's a Node.js app

### 4. Add PostgreSQL Database

1. In your Railway project dashboard, click "**+ New**"
2. Select "**Database**" → "**Add PostgreSQL**"
3. Railway will automatically:
   - Create a PostgreSQL instance
   - Set the `DATABASE_URL` environment variable
   - Connect it to your app

### 5. Configure Environment Variables

Click on your service → "**Variables**" tab

Add these variables:

```
CENSUS_API_KEY=your_census_api_key_here
ADMIN_SECRET=your_random_secret_here
```

**How to get Census API Key:**
1. Visit: https://api.census.gov/data/key_signup.html
2. Fill out the form (Organization: "Personal Project")
3. Receive key via email instantly (usually < 1 minute)

**How to generate Admin Secret:**
```bash
openssl rand -hex 32
```

Or use https://randomkeygen.com/ and copy a "CodeIgniter Encryption Key"

### 6. Trigger Deployment

Railway will automatically deploy when you add variables. If not:

1. Click "**Deployments**" tab
2. Click "**Redeploy**"

### 7. Wait for Build

Watch the logs:
- ⏳ Installing dependencies (~30 seconds)
- ⏳ Running Prisma generate (~10 seconds)
- ⏳ Running `prisma db push` (~5 seconds)
- ✅ Server starts

### 8. Get Your URL

1. Click "**Settings**" tab
2. Scroll to "**Domains**"
3. Click "**Generate Domain**"
4. Copy the URL (e.g., `https://poststrat-demo-production.up.railway.app`)

---

## Part 3: Test Your Deployment

### Test 1: Health Check

```bash
curl https://your-app.railway.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "Poststratification Table Builder",
  "version": "1.0.0"
}
```

### Test 2: Build Table

```bash
curl -X POST https://your-app.railway.app/api/build/2022 \
  -H "X-Admin-Secret: YOUR_ADMIN_SECRET"
```

This will take 15-30 seconds. Expected response:
```json
{
  "success": true,
  "year": 2022,
  "districtsProcessed": 436,
  "cellsGenerated": 130800
}
```

### Test 3: Check Stats

```bash
curl https://your-app.railway.app/api/stats/2022
```

Expected response:
```json
{
  "success": true,
  "year": 2022,
  "totalCells": 130800,
  "districtsCount": 436,
  "totalPopulation": 260961909
}
```

### Test 4: View Demo UI

Open in browser:
```
https://your-app.railway.app/
```

You should see a beautiful interactive demo interface!

---

## Part 4: Share with Your Client

### What to Send

✅ **Live URL:** `https://your-app.railway.app`
✅ **API Documentation:** Point them to the demo UI
✅ **Admin Secret:** (for building new tables)
✅ **GitHub Repo:** (if you want to share code)

### Email Template

```
Hi [Client Name],

I've deployed the Census Poststratification API demo for your review.

Live Demo: https://your-app.railway.app/

The demo includes:
- Interactive UI showcasing all API capabilities
- Live Census data for 436 congressional districts
- 130,800 demographic cells (300 per district)
- Full API documentation

Try these features:
1. View table statistics (pre-built 2022 data)
2. Query specific districts (e.g., TX-32, CA-12)
3. Explore demographic breakdowns

Technical specs:
- 6 age groups (ANES convention)
- 5 race/ethnicity categories
- 5 education levels
- ~260M total population (voting age 18+)

Questions? Let me know!

Best,
[Your Name]
```

---

## Costs

**Railway Free Tier:**
- $5 free credit per month
- Enough for ~500 hours of uptime
- PostgreSQL 500MB free (plenty for this app)

**After free tier:**
- ~$5-10/month typical cost
- Pay only for what you use

---

## Troubleshooting

### Database connection errors

**Problem:** `Error: Can't reach database server`

**Solution:**
1. Check that PostgreSQL is added to your project
2. Verify `DATABASE_URL` is set in Variables
3. Redeploy after adding database

### Census API errors

**Problem:** `Census API error (400): error: missing key parameter`

**Solution:**
1. Check `CENSUS_API_KEY` is set correctly
2. Verify key is valid at https://api.census.gov/data.html
3. No spaces or quotes in the key

### Build timeouts

**Problem:** `POST /api/build/2022` times out

**Solution:**
- This is normal! Census API takes 15-30 seconds
- Wait patiently, watch Railway logs
- Increase timeout in your curl command: `--max-time 60`

### App not starting

**Problem:** Deployment succeeds but app doesn't respond

**Solution:**
1. Check Railway logs for errors
2. Verify `prisma db push` succeeded
3. Check that `PORT` environment variable is NOT set (Railway sets it automatically)

---

## Advanced: Custom Domain

Want to use your own domain?

1. In Railway project → **Settings** → **Domains**
2. Click "**Custom Domain**"
3. Enter your domain (e.g., `census-api.yourdomain.com`)
4. Add CNAME record to your DNS:
   - Name: `census-api`
   - Value: (Railway provides this)
5. Wait for SSL certificate (automatic, 1-2 minutes)

---

## Updating Your App

Make changes locally:

```bash
git add .
git commit -m "Update: description of changes"
git push
```

Railway will automatically redeploy when you push to GitHub!

---

## Monitoring

### View Logs

In Railway dashboard:
1. Click your service
2. Click "**Deployments**"
3. Click latest deployment
4. View real-time logs

### Check Metrics

Railway provides:
- CPU usage
- Memory usage
- Network traffic
- Database size

---

## Support

**Railway Docs:** https://docs.railway.app
**Railway Discord:** https://discord.gg/railway
**Census API Docs:** https://www.census.gov/data/developers/data-sets/acs-1year.html

---

**Deployment complete! 🎉**

Your Census Poststratification API is now live and ready to showcase to clients.
