# 🚀 Deployment Guide - GitHub & Netlify

## Step 1: GitHub Setup

### Create Repository
1. Go to [GitHub.com](https://github.com)
2. Click the **+** icon → **New repository**
3. Repository name: `trading-journal`
4. Description: "Professional Trading Journal with GBP support"
5. Set as **Public** (or Private if you prefer)
6. **DON'T** initialize with README (we already have one)
7. Click **Create repository**

### Push Code to GitHub
Open terminal/command prompt in your project folder:

```bash
# Initialize git
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit - Trading Journal with GBP support"

# Add GitHub remote (replace with YOUR repository URL)
git remote add origin https://github.com/YOUR_USERNAME/trading-journal.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Netlify Deployment

### Method 1: Deploy from GitHub (Recommended)

1. Go to [Netlify.com](https://netlify.com)
2. Sign up/Login (you can use GitHub account)
3. Click **"Add new site"** → **"Import an existing project"**
4. Choose **GitHub**
5. Authorize Netlify to access your GitHub
6. Select your `trading-journal` repository
7. Build settings:
   - **Build command**: (leave empty)
   - **Publish directory**: `.` (just a dot)
8. Click **Deploy site**

### Method 2: Drag & Drop (Quick Test)

1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag your entire project folder to the browser
3. Wait for upload
4. Your site is live!

## Step 3: Custom Domain (Optional)

### In Netlify:
1. Go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Enter your domain (e.g., `trading.yourdomain.com`)
4. Follow DNS configuration instructions

## Step 4: Updates

### To update your site:
```bash
# Make changes to your code

# Add changes
git add .

# Commit
git commit -m "Description of changes"

# Push to GitHub
git push

# Netlify will auto-deploy!
```

## URLs After Deployment

Your app will be available at:
- **Netlify URL**: `https://YOUR-APP-NAME.netlify.app`
- **Custom Domain**: `https://your-domain.com` (if configured)

## Environment Variables (Not needed for this app)

This app uses LocalStorage only, no environment variables needed.

## Troubleshooting

### Site not updating?
- Check Netlify dashboard for build logs
- Clear browser cache (Ctrl+F5)
- Check if git push was successful

### Chart.js not loading?
- Make sure you have internet connection
- Chart.js loads from CDN, requires internet

### Data not saving?
- Check if LocalStorage is enabled in browser
- Try in incognito mode
- Check browser console for errors

## Features Working on Netlify

✅ All JavaScript functionality
✅ LocalStorage persistence  
✅ Chart.js from CDN
✅ Responsive design
✅ Dark/Light mode
✅ GBP currency display
✅ Import/Export JSON

## Quick Commands Reference

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/trading-journal.git

# Check status
git status

# View commit history
git log --oneline

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main

# Merge branch
git merge feature-name
```

## Support

- **Netlify Docs**: https://docs.netlify.com
- **GitHub Docs**: https://docs.github.com
- **Chart.js Docs**: https://www.chartjs.org/docs

---

🎉 **Congratulations!** Your Trading Journal is now live!
