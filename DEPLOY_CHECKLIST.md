# 🚀 Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Get Census API Key
- [ ] Visit https://api.census.gov/data/key_signup.html
- [ ] Fill out form (Organization: "Personal Project")
- [ ] Check email for API key (arrives instantly)
- [ ] Save key somewhere safe

### 2. Generate Admin Secret
```bash
openssl rand -hex 32
```
- [ ] Run command above
- [ ] Copy the output (64-character hex string)
- [ ] Save this secret - you'll need it for Railway

### 3. Create GitHub Repository
- [ ] Create new public repository on GitHub
- [ ] Name it: `poststrat-demo` or similar
- [ ] Don't initialize with README (we have one)

---

## 🚂 Railway Deployment

### 4. Push to GitHub
```bash
cd poststrat-demo
git init
git add .
git commit -m "Initial commit: Census Poststrat API"
git remote add origin https://github.com/YOUR_USERNAME/poststrat-demo.git
git push -u origin main
```
- [ ] Commands executed successfully
- [ ] Repository visible on GitHub

### 5. Create Railway Account
- [ ] Go to https://railway.app
- [ ] Click "Login with GitHub"
- [ ] Authorize Railway

### 6. Deploy Application
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Select your `poststrat-demo` repository
- [ ] Wait for initial build (~1 minute)

### 7. Add PostgreSQL
- [ ] Click "+ New" in your project
- [ ] Select "Database" → "Add PostgreSQL"
- [ ] Wait for database to provision (~30 seconds)
- [ ] Verify `DATABASE_URL` appears in Variables

### 8. Set Environment Variables
In Railway → Your Service → Variables tab:

- [ ] Add `CENSUS_API_KEY` = (your Census key)
- [ ] Add `ADMIN_SECRET` = (your generated secret)
- [ ] DO NOT set `PORT` (Railway handles this)

### 9. Trigger Redeploy
- [ ] Click "Deployments" tab
- [ ] Click "Redeploy"
- [ ] Watch logs for successful start (~2 minutes)

### 10. Generate Public URL
- [ ] Click "Settings" tab
- [ ] Scroll to "Domains"
- [ ] Click "Generate Domain"
- [ ] Copy the URL (e.g., `poststrat-demo-production.up.railway.app`)

---

## 🧪 Testing

### 11. Test Health Endpoint
```bash
curl https://YOUR_APP.railway.app/api/health
```
- [ ] Returns `{"status":"ok"}`

### 12. Build Initial Table
```bash
curl -X POST https://YOUR_APP.railway.app/api/build/2022 \
  -H "X-Admin-Secret: YOUR_ADMIN_SECRET"
```
- [ ] Takes 15-30 seconds (be patient!)
- [ ] Returns success with 130,800 cells

### 13. Verify Data
```bash
curl https://YOUR_APP.railway.app/api/stats/2022
```
- [ ] Returns statistics showing 436 districts

### 14. Test Frontend
Open in browser:
```
https://YOUR_APP.railway.app/
```
- [ ] Page loads with gradient header
- [ ] "Available Years" section shows data
- [ ] All buttons work
- [ ] District lookup works (try TX-32)

---

## 📧 Client Handoff

### 15. Prepare Client Demo
- [ ] Test all features one more time
- [ ] Take screenshots of:
  - Home page
  - Table statistics
  - District lookup results
  - API responses

### 16. Send to Client

**Include:**
- [ ] Live URL
- [ ] Brief description (see email template in DEPLOYMENT.md)
- [ ] API documentation link (`/api/info`)
- [ ] Admin secret (if they need to build tables)
- [ ] Your contact info

**Example Email:**
```
Subject: Census Poststratification API - Live Demo

Hi [Client],

The Census Poststratification API is now live:
🔗 https://YOUR_APP.railway.app

Features:
✅ 130,800 demographic cells across 436 districts
✅ Interactive demo UI
✅ Full REST API
✅ Real-time Census data

Try it:
1. Open the URL above
2. Click "Get Statistics" to see 2022 data
3. Enter "TX-32" in District Lookup
4. Explore the API responses

Questions? Let me know!
```

---

## 📊 Post-Deployment

### 17. Monitor First 24 Hours
- [ ] Check Railway logs for errors
- [ ] Verify database doesn't exceed 500MB
- [ ] Test API responses are fast (<2 seconds)

### 18. Optional: Custom Domain
- [ ] Purchase domain (if needed)
- [ ] Add custom domain in Railway
- [ ] Configure DNS CNAME
- [ ] Wait for SSL (~5 minutes)

---

## 💰 Costs to Monitor

**Railway Free Tier:**
- $5/month credit (FREE)
- 500MB PostgreSQL (FREE)
- Covers ~500 hours uptime

**Typical Monthly Cost After Free Tier:**
- $5-10/month
- Monitor in Railway dashboard

---

## 🐛 Common Issues

### "Can't reach database server"
➡️ **Solution:** Verify PostgreSQL is added and `DATABASE_URL` is set

### "Census API error: missing key parameter"
➡️ **Solution:** Check `CENSUS_API_KEY` environment variable (no quotes)

### "POST /api/build/2022 timeout"
➡️ **Solution:** This is normal! Wait 30 seconds, then check `/api/stats/2022`

### App doesn't respond
➡️ **Solution:**
1. Check Railway logs
2. Verify Prisma migration succeeded
3. Redeploy

---

## ✅ Final Verification

Run this complete test:

```bash
# Set your Railway URL
export APP_URL="https://YOUR_APP.railway.app"
export ADMIN_SECRET="YOUR_SECRET_HERE"

# Test 1: Health check
curl $APP_URL/api/health

# Test 2: Available years
curl $APP_URL/api/available-years

# Test 3: Stats (should return data if table built)
curl $APP_URL/api/stats/2022

# Test 4: District lookup
curl $APP_URL/api/district/2022/TX-32

# Test 5: Info endpoint
curl $APP_URL/api/info
```

All tests passing? **You're done! 🎉**

---

## 📱 Share Links

Once deployed, share these with your client:

```
Live Demo:     https://YOUR_APP.railway.app
API Docs:      https://YOUR_APP.railway.app/api/info
Health Check:  https://YOUR_APP.railway.app/api/health
GitHub:        https://github.com/YOUR_USERNAME/poststrat-demo
```

---

**Estimated Time:** 20-30 minutes total

**Result:** Production-ready demo showcasing Census poststratification API

**Cost:** FREE (using Railway's free tier)

---

Need help? Refer to DEPLOYMENT.md for detailed troubleshooting.
