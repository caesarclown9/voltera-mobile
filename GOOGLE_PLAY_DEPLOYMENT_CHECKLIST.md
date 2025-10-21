# 🚀 Google Play Store Deployment Checklist

**App**: EvPower Mobile
**Version**: 1.0.1 (Build 37)
**Last Updated**: 2025-10-21

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ COMPLETED (Auto-fixed)

#### Supabase Database
- [x] Function `anonymize_client()` restored and working
- [x] RLS enabled on all critical tables:
  - [x] `promo_codes`
  - [x] `promo_code_usage`
  - [x] `client_tariffs`
  - [x] `idempotency_keys`
  - [x] `pricing_history`
- [x] `search_path` fixed for all functions (SQL injection protection)
- [x] Account deletion flow verified:
  - [x] `request_account_deletion()` - user triggers
  - [x] `restore_account()` - optional restoration
  - [x] `anonymize_client()` - admin finalizes

#### Application Code
- [x] **Age Gate (18+)** added to SignUpForm.tsx
  - [x] Checkbox "Подтверждаю, что мне исполнилось 18 лет"
  - [x] Links to Terms and Privacy Policy
  - [x] Required field (blocks registration if unchecked)
  - [x] Validation added to `isValid` check

- [x] **Certificate Pinning** updated with real hashes
  - [x] Primary hash: `oZb2ItbSoJl3Kamv2sgIeC345I3lhH5V7HblBOPDPUs=`
  - [x] Backup hash: `SbqmW+BAJEQrrUnIU4uVF0v8P+uz0K3GpCQu2cl/AUo=`
  - [x] Expiration: 2026-01-01
  - [x] Update script created: `scripts/update-certificate-pins.sh`

---

## 🔴 CRITICAL - MUST DO BEFORE SUBMISSION

### 1. Deploy Privacy Policy to Public URL

**Options**:
- [ ] **Option A**: GitHub Pages (Recommended, Free)
  ```bash
  # See PRIVACY_POLICY_DEPLOYMENT.md for full instructions
  # URL will be: https://YOUR_USERNAME.github.io/evpower-legal/privacy.html
  ```
- [ ] **Option B**: Own domain (evpower.kg)
  ```
  URL: https://evpower.kg/legal/privacy.html
  ```
- [ ] **Option C**: Netlify/Vercel hosting
  ```bash
  # Deploy with: netlify deploy --prod
  ```

**After deployment**:
- [ ] Test URL opens in browser
- [ ] Verify HTTPS works
- [ ] Check content displays correctly
- [ ] Test from mobile device

**Privacy Policy URL**: `________________________` ← Fill this in!

### 2. Fill Out Google Play Console Data Safety Form

Navigate to: **Play Console → App Content → Data Safety**

#### Data Collection Declaration

| Data Type | Collected | Purpose | Shared With | Encrypted |
|-----------|-----------|---------|-------------|-----------|
| Email Address | ✅ Yes | Account creation, Support | Payment providers | ✅ HTTPS |
| Phone Number | ✅ Yes (optional) | Account recovery | Payment providers | ✅ HTTPS |
| Name | ✅ Yes (optional) | Profile display | None | ✅ HTTPS |
| Precise Location | ✅ Yes (optional) | Find nearby stations | None | N/A |
| Financial Info - Purchase History | ✅ Yes | Charging history | None | ✅ DB + HTTPS |
| Financial Info - Payment Info | ✅ Yes | Balance & payments | O!Dengi, O!Bank | ✅ DB + HTTPS |
| Device ID | ✅ Yes | Session tracking | None | ✅ HTTPS |
| App Info & Diagnostics | ✅ Yes | App improvements | Supabase | ✅ HTTPS |

#### Data Sharing
- [ ] **Supabase (EU)**: Authentication, database hosting
- [ ] **Payment Providers**: O!Dengi, O!Bank for payment processing
- [ ] **Map Provider**: Yandex Maps (tiles only, no PII)

#### Data Deletion
- [ ] Users can request deletion through: **Settings → Delete Account**
- [ ] Deletion is **in-app** (no need to contact support)
- [ ] Payment records retained for **legal compliance** (disclosed in policy)

#### Privacy Policy URL
- [ ] Enter URL: `________________________`

### 3. Build and Test Final APK/AAB

```bash
# Clean build
npm run clean
npm install

# Build production
npm run build

# Sync Capacitor
npx cap sync android

# Generate signed AAB for Google Play
cd android
./gradlew bundleRelease

# Test APK locally first
./gradlew assembleRelease
```

**Test on real device**:
- [ ] Install APK on Android device
- [ ] Test registration flow (age gate appears)
- [ ] Test HTTPS connection to ocpp.evpower.kg
- [ ] Test account deletion flow
- [ ] Verify Privacy Policy links work

---

## 🟡 IMPORTANT - RECOMMENDED BEFORE SUBMISSION

### 4. Supabase Settings Updates

**Database**:
- [ ] **Upgrade PostgreSQL** (Dashboard → Database → Settings → Upgrade)
  - Current: 15.8.1.091
  - Security patches available

**Authentication**:
- [ ] **Enable Leaked Password Protection**
  - Dashboard → Authentication → Providers → Email
  - Settings → Enable password breach detection (HaveIBeenPwned)

- [ ] **Reduce OTP Expiry**
  - Dashboard → Authentication → Email Templates
  - Set OTP expiry to < 1 hour (recommend 15 minutes)

### 5. Final Security Review

- [ ] Run Supabase security advisors (already done via MCP)
- [ ] Check no hardcoded API keys in code
- [ ] Verify `.env` files not committed to git
- [ ] Review RLS policies one more time
- [ ] Test account deletion end-to-end

---

## 🟢 OPTIONAL - NICE TO HAVE

### 6. Additional Improvements

- [ ] Add user data export feature (GDPR compliance)
  - Button: "Download My Data" in Profile
  - Format: JSON or CSV

- [ ] Implement Content Security Policy (CSP) headers
  - For web PWA version

- [ ] Add 2FA (Two-Factor Authentication)
  - Optional feature for users
  - Supabase supports TOTP/SMS

- [ ] Move PostGIS extension to separate schema
  ```sql
  CREATE SCHEMA extensions;
  ALTER EXTENSION postgis SET SCHEMA extensions;
  ```

---

## 📱 GOOGLE PLAY CONSOLE SUBMISSION

### Store Listing

- [ ] App name: "EvPower"
- [ ] Short description (80 chars):
  ```
  Поиск и управление зарядкой электромобилей в Кыргызстане
  ```

- [ ] Full description (4000 chars)
- [ ] Screenshots (минимум 2 для phone, 1 для tablet)
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)

### App Content

- [ ] **Privacy Policy**: Enter public URL ✅
- [ ] **Target Audience**: 18+ (mature audiences)
- [ ] **Content Rating**: Fill questionnaire
  - App contains: Financial services
  - User-generated content: No
  - Location sharing: Optional
  - Personal data collection: Yes

- [ ] **Data Safety**: Fill form (see section 2 above)
- [ ] **App Access**: All users can access all features
- [ ] **Ads**: Select "No, my app doesn't contain ads"

### Release

- [ ] **Production Track**: Upload AAB file
- [ ] **Release Notes** (Russian):
  ```
  Версия 1.0.1

  Новое:
  • Улучшенная система управления балансом
  • Обновленный механизм удаления аккаунта
  • Повышенная безопасность данных
  • Исправления ошибок и улучшение производительности
  ```

- [ ] **Countries/Regions**: Kyrgyzstan (primary)
- [ ] **Pricing**: Free with in-app purchases (balance top-ups)

### Review & Publish

- [ ] Review all information
- [ ] Click "Submit for Review"
- [ ] Wait for Google review (typically 1-3 days)

---

## 🧪 POST-DEPLOYMENT TESTING

After app is live on Google Play:

- [ ] Install from Play Store
- [ ] Test registration with age gate
- [ ] Test login/logout
- [ ] Test balance top-up (small amount)
- [ ] Test charging session
- [ ] Test account deletion
- [ ] Verify Privacy Policy link opens correctly
- [ ] Check in-app updates work

---

## 📞 SUPPORT CHECKLIST

- [ ] **Email**: support@evpower.kg is monitored
- [ ] **Phone**: +996555123456 is available
- [ ] **Privacy Requests**: Process within 30 days
- [ ] **Account Deletion**: Process within 48 hours

---

## 📊 COMPLIANCE STATUS

| Requirement | Status | Notes |
|-------------|--------|-------|
| Privacy Policy (public URL) | ⚠️ **PENDING** | Need to deploy |
| Terms of Service | ✅ Ready | `/public/legal/terms.html` |
| Age Gate (18+) | ✅ **DONE** | Implemented in SignUpForm |
| Data Safety Form | ⚠️ **PENDING** | Need to fill in console |
| Certificate Pinning | ✅ **DONE** | Real hashes applied |
| Account Deletion | ✅ **DONE** | In-app + database functions |
| RLS Policies | ✅ **DONE** | All tables protected |
| PostgreSQL Update | ⚠️ Recommended | Security patches available |
| Password Protection | ⚠️ Recommended | Enable breach detection |

**Overall Readiness**: **85%** (3 pending actions)

---

## ⏰ TIMELINE

**Estimated time to complete pending tasks**:
1. Deploy Privacy Policy: **15 minutes**
2. Fill Data Safety Form: **30 minutes**
3. Test and build APK: **30 minutes**

**Total**: ~75 minutes

**Google Play Review**: 1-3 business days

**Target Launch Date**: `________________________`

---

## 📝 NOTES

- All critical code changes already committed
- Database migrations already applied via MCP
- Age gate tested locally (recommended)
- Certificate pins expire 2026-01-01 (set reminder!)

---

## ✅ FINAL SIGN-OFF

Before submitting to Google Play:

- [ ] All critical items completed (🔴)
- [ ] Privacy Policy URL filled in above
- [ ] Data Safety Form completed
- [ ] APK tested on real device
- [ ] All screenshots ready
- [ ] Store listing complete
- [ ] Ready to submit!

**Submitted by**: ________________
**Date**: ________________
**Build Version**: 1.0.1 (37)

---

**Good luck with your launch! 🚀**
