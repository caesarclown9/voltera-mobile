# Google Play Data Safety Declaration
## Для заполнения формы в Google Play Console

**App:** EvPower - EV Charging
**Version:** 1.0.0
**Date:** 2 октября 2025

---

## 1. Does your app collect or share user data?
**Ответ:** ✅ **Yes**

---

## 2. Data Types Collected

### 2.1 Personal Information

#### ✅ Email Address
- **Collected:** Yes
- **Shared:** No
- **Optional:** No
- **Purpose:**
  - Account management
  - App functionality
- **Ephemeral:** No

#### ✅ Phone Number
- **Collected:** Yes
- **Shared:** No
- **Optional:** Yes
- **Purpose:**
  - Account management
  - Communications
- **Ephemeral:** No

#### ✅ Name
- **Collected:** Yes
- **Shared:** No
- **Optional:** Yes
- **Purpose:**
  - Account management
  - Personalization
- **Ephemeral:** No

---

### 2.2 Financial Information

#### ✅ Purchase History
- **Collected:** Yes
- **Shared:** No
- **Optional:** No
- **Purpose:**
  - App functionality
  - Account management
- **Ephemeral:** No

#### ✅ Payment Info (через платежные системы)
- **Collected:** No (собирается третьими лицами - платежными системами)
- **Shared:** No
- **Optional:** No
- **Purpose:**
  - Payment processing
- **Note:** Карточные данные обрабатываются платежными провайдерами, НЕ хранятся в нашем приложении

---

### 2.3 Location

#### ✅ Approximate Location
- **Collected:** Yes
- **Shared:** No
- **Optional:** Yes (можно использовать без геолокации)
- **Purpose:**
  - App functionality (отображение ближайших станций)
  - Personalization
- **Ephemeral:** Yes (не хранится постоянно)

#### ✅ Precise Location
- **Collected:** Yes
- **Shared:** No
- **Optional:** Yes
- **Purpose:**
  - App functionality (навигация к станциям)
- **Ephemeral:** Yes (не хранится постоянно)

---

### 2.4 App Activity

#### ✅ App Interactions
- **Collected:** Yes
- **Shared:** No
- **Optional:** No
- **Purpose:**
  - Analytics
  - App functionality
- **Examples:**
  - Выбранные зарядные станции
  - История зарядок
  - Настройки приложения

---

### 2.5 Device or Other IDs

#### ✅ Device IDs
- **Collected:** Yes
- **Shared:** No
- **Optional:** No
- **Purpose:**
  - Push notifications
  - Analytics
  - Fraud prevention
- **Examples:**
  - Firebase Push Token
  - Installation ID

---

## 3. Data NOT Collected

### ❌ NOT Collected:
- Health and Fitness data
- Photos or Videos
- Audio files
- Files and Documents
- Calendar events
- Contacts
- SMS or MMS messages
- Web browsing history
- Search history
- Voice or Sound recordings
- Music files
- Other app activity

---

## 4. Security Practices

### ✅ Data Encryption in Transit
**Ответ:** Yes
- All data transferred using HTTPS/TLS encryption

### ✅ Data Encryption at Rest
**Ответ:** Yes
- Database encryption via Supabase
- Secure storage for sensitive data

### ✅ Users can request deletion
**Ответ:** Yes
- Users can request account deletion via support@evpower.kg
- Data deleted within 30 days

### ✅ Committed to follow Play Families Policy
**Ответ:** No (app is 18+)

### ✅ Independent security review
**Ответ:** No (planned for v2.0)

---

## 5. Data Sharing

### Shared with Third Parties?
**Ответ:** ✅ **Yes** (для функциональности)

#### Partners:

1. **Supabase** (Database & Auth)
   - Purpose: App functionality, account management
   - Data: Email, name, phone, purchase history
   - Legal: Data Processing Agreement

2. **Payment Providers** (Банки, O!Dengi)
   - Purpose: Payment processing
   - Data: Transaction amount, payment status
   - Legal: PCI DSS compliant

3. **Firebase Cloud Messaging** (Push Notifications)
   - Purpose: Push notifications
   - Data: Device token
   - Legal: Google Cloud Terms

4. **Yandex Maps**
   - Purpose: Map display
   - Data: Approximate location (temporary)
   - Legal: Yandex Maps API Terms

---

## 6. Data Retention

### Account Active:
- All data retained while account is active

### Account Deletion:
- Data deleted within 30 days of deletion request
- Transaction history kept for 5 years (legal requirement)

### Inactive Accounts:
- Deleted after 24 months of inactivity

---

## 7. Children's Privacy

### Age Restriction:
**18+** - App requires users to be 18 years or older

### Reason:
- Financial transactions
- Payment processing
- Legal liability for electric vehicle charging

---

## 8. Contact Information

**Developer Email:** support@evpower.kg
**Privacy Policy URL:** https://evpower.kg/privacy (или укажите другой URL)
**Support URL:** https://evpower.kg/support

---

## 9. Additional Notes for Google Play Review

### App Functionality Explanation:

EvPower is an electric vehicle charging app that:
1. Helps users find EV charging stations
2. Enables remote start/stop of charging sessions
3. Manages user balance for charging services
4. Tracks charging history and expenses

### Why we need permissions:

- **Location:** To show nearby charging stations
- **Internet:** To communicate with charging stations and process payments
- **Camera:** To scan QR codes on charging stations (optional)
- **Notifications:** To alert users about charging status

### Data Usage Justification:

All collected data is essential for:
- Providing EV charging services
- Managing user accounts and payments
- Ensuring security and preventing fraud
- Improving user experience

---

## 10. Compliance Checklist

✅ Privacy Policy created and accessible
✅ Terms of Service created
✅ Data Safety form completed accurately
✅ No deceptive practices
✅ No sensitive permissions without justification
✅ No hidden data collection
✅ User data can be deleted
✅ HTTPS encryption for all data transfers
✅ Age restriction (18+) properly set
✅ All third-party SDKs disclosed

---

**Status:** ✅ Ready for submission
**Review Date:** 2 октября 2025
**Reviewed by:** Development Team

