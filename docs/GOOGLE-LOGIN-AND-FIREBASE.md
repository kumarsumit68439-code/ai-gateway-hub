# Google Login + Firebase Backend Setup

Your app already uses **Supabase Auth** for login (email/password).
Google login is added on top of the same system — users who sign in with Google still get a normal Supabase session, so dashboard, keys, and middleware keep working.

Firebase in this project is used as an **optional backend database** (Firestore via `FIREBASE_SERVICE_ACCOUNT`), not for login.

---

## 1. Google login (Supabase OAuth) — required steps

### A. Google Cloud Console
1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized JavaScript origins**
   - `http://localhost:3000` (local)
   - `https://YOUR-DOMAIN.vercel.app` (production)
5. **Authorized redirect URIs** (important — use your Supabase project URL):
   - `https://YOUR_SUPABASE_REF.supabase.co/auth/v1/callback`
   - Example: `https://uunpxdnqebbbupnjyltr.supabase.co/auth/v1/callback`
6. Copy the **Client ID** and **Client Secret**.

### B. Supabase Dashboard
1. Open your project → **Authentication → Providers → Google**.
2. Enable Google.
3. Paste **Client ID** and **Client Secret** from Google Cloud.
4. Save.

### C. Supabase URL config
1. **Authentication → URL Configuration**
2. **Site URL**: `https://YOUR-DOMAIN.vercel.app`
3. **Redirect URLs** (add all of these):
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-DOMAIN.vercel.app/auth/callback`

### D. Deploy
No new env vars are required for Google itself (Client ID/Secret live in Supabase).
Push / redeploy on Vercel, open `/login`, click **Continue with Google**.

Flow:
1. User clicks Google → Google consent screen
2. Google redirects to Supabase → Supabase redirects to `/auth/callback`
3. App exchanges the code for a session cookie → user lands on `/dashboard`

---

## 2. Firebase backend — what to add

Firebase is already wired for **server-side Firestore** in `lib/firebase.js`.
It does **not** handle login. Use it only if you want to store app data in Firestore (e.g. via Backend keys).

### What you need in Firebase
1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** (production or test mode, then lock rules).
3. **Project settings → Service accounts → Generate new private key** → download JSON.
4. Put the **entire JSON as a single line** in Vercel env:

```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...", ...}
```

Important: in the private_key field, keep `\n` as the two characters `\n` (the code replaces them with real newlines).

### Optional client config (only if you later add Firebase client SDK)
Not required for the current Admin/Firestore usage. If you add a browser Firebase app later:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

### Firestore security
Because the server uses the **service account**, it bypasses client rules.
Still set rules so random clients cannot open your database if you ever expose a client key:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false; // only Admin SDK from your server
    }
  }
}
```

---

## 3. Summary

| Feature              | System used     | What you configure                                      |
|----------------------|-----------------|---------------------------------------------------------|
| Email/password login | Supabase Auth   | Already working                                         |
| Google login         | Supabase OAuth  | Google Cloud OAuth client + Supabase Google provider    |
| Session / middleware | Supabase cookies| Already working; `/auth/callback` added                 |
| Backend data store   | Firebase Admin  | `FIREBASE_SERVICE_ACCOUNT` env + Firestore enabled      |
| AI providers         | Groq etc.       | Existing `GROQ_API_KEY`, `OPENROUTER_API_KEY`, ...      |

You do **not** need Firebase Auth for Google login unless you want to replace Supabase entirely.
