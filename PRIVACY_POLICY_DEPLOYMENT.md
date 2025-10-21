# Privacy Policy Deployment Guide

## Overview
Google Play Store requires that your Privacy Policy is accessible via a **public URL**. This guide explains how to deploy your privacy policy.

## Current Status
- ✅ Privacy Policy exists: `/public/legal/privacy.html`
- ✅ Terms of Service exists: `/public/legal/terms.html`
- ❌ Not yet publicly accessible (required by Google Play)

## Deployment Options

### Option 1: GitHub Pages (Recommended - Free)

**Steps:**

1. **Create a new repository** (or use existing):
   ```bash
   cd /mnt/d/Projects
   mkdir evpower-legal
   cd evpower-legal
   git init
   ```

2. **Copy legal files**:
   ```bash
   cp /mnt/d/Projects/Evpower-mobile/public/legal/privacy.html ./
   cp /mnt/d/Projects/Evpower-mobile/public/legal/terms.html ./
   ```

3. **Create index.html** (optional):
   ```html
   <!DOCTYPE html>
   <html lang="ru">
   <head>
       <meta charset="UTF-8">
       <title>EvPower Legal</title>
   </head>
   <body>
       <h1>EvPower Legal Documents</h1>
       <ul>
           <li><a href="privacy.html">Privacy Policy</a></li>
           <li><a href="terms.html">Terms of Service</a></li>
       </ul>
   </body>
   </html>
   ```

4. **Commit and push**:
   ```bash
   git add .
   git commit -m "Add legal documents"
   git remote add origin https://github.com/YOUR_USERNAME/evpower-legal.git
   git push -u origin main
   ```

5. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from main branch
   - Wait 2-3 minutes

6. **Your URLs will be**:
   ```
   Privacy: https://YOUR_USERNAME.github.io/evpower-legal/privacy.html
   Terms:   https://YOUR_USERNAME.github.io/evpower-legal/terms.html
   ```

### Option 2: Own Domain (evpower.kg)

If you have hosting for evpower.kg:

1. **Upload files** to your web server:
   ```
   /var/www/evpower.kg/legal/privacy.html
   /var/www/evpower.kg/legal/terms.html
   ```

2. **Configure nginx/apache** to serve static files

3. **Your URLs will be**:
   ```
   Privacy: https://evpower.kg/legal/privacy.html
   Terms:   https://evpower.kg/legal/terms.html
   ```

### Option 3: Netlify/Vercel (Free Hosting)

**Netlify:**
```bash
npm install -g netlify-cli
netlify login
cd /path/to/legal/files
netlify deploy --prod
```

**Vercel:**
```bash
npm install -g vercel
cd /path/to/legal/files
vercel --prod
```

## After Deployment

### 1. Update Google Play Console

1. Go to Google Play Console
2. Navigate to: App Content → Data Safety → Privacy Policy
3. Enter your public URL:
   ```
   https://YOUR_CHOSEN_URL/privacy.html
   ```
4. Save changes

### 2. Verify Links Work

Test from different devices:
- ✅ Opens in browser
- ✅ No CORS errors
- ✅ HTTPS enabled
- ✅ Content displays correctly

### 3. Update App Links (if needed)

If you update links in the app:

**File**: `/src/pages/AboutPage.tsx` or `/src/pages/SettingsPage.tsx`

Replace:
```typescript
href="/legal/privacy.html"  // Local path
```

With:
```typescript
href="https://YOUR_URL/privacy.html"  // Public URL
```

## Important Notes

1. **Keep URLs Stable**: Once submitted to Google Play, changing URLs requires resubmission
2. **HTTPS Required**: Google Play requires HTTPS URLs
3. **Update When Policy Changes**: Keep deployment in sync with app updates
4. **Accessibility**: Must be accessible 24/7 (no authentication required)

## Current Privacy Policy Details

- **Version**: 1.0.1
- **Last Updated**: October 8, 2025
- **Language**: Russian (Русский)
- **Format**: HTML
- **Size**: ~8 KB

## Checklist Before Submission

- [ ] Privacy policy deployed to public URL
- [ ] Terms of service deployed to public URL
- [ ] URLs use HTTPS
- [ ] URLs accessible without authentication
- [ ] Content matches app's data collection practices
- [ ] Email contact visible: support@evpower.kg
- [ ] Version and date visible in document
- [ ] Links tested from mobile devices
- [ ] URL entered in Google Play Console
- [ ] Google Play Console saved successfully

## Support

If you need help with deployment:
- GitHub Pages: https://pages.github.com/
- Netlify: https://docs.netlify.com/
- Vercel: https://vercel.com/docs

---

**Generated**: 2025-10-21
**For**: EvPower Mobile App v1.0.1
