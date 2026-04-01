# Deploying Aeroscript Online

This guide covers deploying Aeroscript with a frontend on **Vercel** and backend on **Railway** (or Render), with MongoDB Atlas as the database.

---

## Architecture

```
┌─────────────────────────────────┐
│  Vercel (Frontend)              │
│  React + Vite                   │
│  https://your-app.vercel.app    │
└──────────────┬──────────────────┘
               │ REST API + WebSocket
               ▼
┌─────────────────────────────────┐
│  Railway (Backend)              │
│  Node.js + Express + Socket.IO │
│  https://your-app.railway.app  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  MongoDB Atlas (Database)       │
│  mongodb+srv://...              │
└─────────────────────────────────┘
```

---

## Step 1: MongoDB Atlas Setup (Free Tier)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a **Free Forever** cluster (M0 Sandbox)
3. Choose a region closest to your users
4. Create a database user:
   - Username: `aeroscript-admin`
   - Password: (generate a strong password)
5. Add IP whitelist:
   - Click **Network Access** → **Add IP Address**
   - Click **Allow Access from Anywhere** (0.0.0.0/0) for development
6. Get your connection string:
   - Click **Connect** → **Connect your application**
   - Copy the string like:
   ```
   mongodb+srv://aeroscript-admin:YOUR_PASSWORD@cluster.mongodb.net/aeroscript
   ```

---

## Step 2: Backend Deployment (Railway - Free Tier)

### Option A: Railway (Recommended — Free $5/month credit)

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your Aeroscript repository
4. Railway will auto-detect it's a Node.js app
5. Configure the root directory:
   - Go to **Settings** → **Root Directory**
   - Set to: `server`
6. Add environment variables (in **Variables** tab):

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `5002` |
   | `MONGODB_URI` | `mongodb+srv://aeroscript-admin:YOUR_PASSWORD@cluster.mongodb.net/aeroscript` |
   | `JWT_SECRET` | (generate at [lastpass.com/password-generator](https://www.lastpass.com/password-generator)) |
   | `GOOGLE_CLIENT_ID` | `your-google-client-id.apps.googleusercontent.com` |
   | `CORS_ORIGINS` | `https://your-app.vercel.app` |

7. Click **Deploy** and wait for the build to complete
8. Your backend URL will be: `https://your-app.up.railway.app`

### Option B: Render (Free Tier)

1. Go to [render.com](https://render.com) and sign up
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
5. Add the same environment variables as Railway
6. Set plan to **Free** (sleeps after 15 min inactivity — may affect real-time party mode)

### Option C: Self-Hosted (VPS)

```bash
# SSH into your VPS
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone your repo
git clone https://github.com/PREMSONTAKKE/Aeroscript.git
cd Aeroscript

# Configure environment
cp server/.env.example server/.env
nano server/.env  # Fill in your values

# Run with Docker
docker-compose up -d
```

Your app will be available at `http://your-server-ip`

---

## Step 3: Google OAuth Setup (Required for Sign In)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Go to **APIs & Services** → **Library**
4. Search and enable **Google+ API**
5. Go to **APIs & Services** → **Credentials**
6. Click **Create Credentials** → **OAuth client ID**
7. Application type: **Web application**
8. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (for local dev)
   - `https://your-app.vercel.app` (your Vercel URL)
9. Copy the **Client ID** (format: `123456789-xxxxxxxxxxxxxxxx.apps.googleusercontent.com`)
10. Add this Client ID to your backend `CORS_ORIGINS` and `GOOGLE_CLIENT_ID` env vars

---

## Step 4: Frontend Deployment (Vercel - Free)

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click **Add New** → **Project**
3. Import your Aeroscript repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables (click **Environment Variables**):

   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `https://your-backend.railway.app` (or your Railway URL) |
   | `VITE_SOCKET_URL` | `https://your-backend.railway.app` |
   | `VITE_HAND_TRACKING_URL` | (leave empty or your hand tracking server URL) |
   | `VITE_GOOGLE_CLIENT_ID` | `your-google-client-id.apps.googleusercontent.com` |

6. Click **Deploy**

Your app will be live at: `https://your-app.vercel.app`

---

## Step 5: Update Backend CORS (After Vercel Deployment)

After getting your Vercel URL, update your backend environment variable:

| Variable | Value |
|----------|-------|
| `CORS_ORIGINS` | `https://your-app.vercel.app` |

On Railway: Go to your project → Variables → Update `CORS_ORIGINS` → Redeploy

---

## Step 6: Update Google OAuth (After Vercel Deployment)

If your Vercel URL changed, update Google Cloud Console:

1. Go to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Add the new Vercel URL to **Authorized JavaScript origins**
4. Save

---

## Environment Variables Summary

### Backend (Railway/Render)

```
NODE_ENV=production
PORT=5002
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aeroscript
JWT_SECRET=your-very-long-random-secret-string
GOOGLE_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
CORS_ORIGINS=https://your-app.vercel.app
```

### Frontend (Vercel)

```
VITE_API_URL=https://your-backend.railway.app
VITE_SOCKET_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=123456789-xxx.apps.googleusercontent.com
```

---

## Troubleshooting

### Party Mode / Socket.IO Not Working

- Railway free tier spins down after 15 minutes of inactivity. Use Railway **Starter** plan or **Hetzner** VPS for always-on Socket.IO.
- Make sure `CORS_ORIGINS` in your backend includes your Vercel URL exactly (no trailing slash).
- Check browser console for CORS errors.

### MongoDB Connection Failed

- Verify your Atlas network access allows your IP (or allow from anywhere for dev)
- Make sure the `MONGODB_URI` password doesn't contain special characters — URL-encode them if needed
- Test the connection: `mongosh "your-connection-string"`

### Google Sign In Not Working

- Make sure the Vercel URL is added to Google Cloud Console **Authorized JavaScript origins**
- Check the OAuth consent screen is published (or set to testing with your test email)

### Build Fails on Vercel

- Make sure `frontend/package.json` has `"build": "vite build"` and `"dev": "vite"`
- Verify the Root Directory is set to `./frontend` (not the repo root)
- Check that all environment variables are set in Vercel dashboard

---

## Custom Domain (Optional)

1. **Vercel**: Go to Project Settings → Domains → Add your domain
2. **Railway**: Go to Settings → Networking → Add Custom Domain
3. Update `CORS_ORIGINS` on backend to include your custom domain
4. Update Google Cloud Console with the custom domain URL

---

## Updating Your Deployment

### After Code Changes

1. Push to GitHub
2. Vercel auto-deploys from main branch
3. Railway auto-deploys (enable in settings) or click **Redeploy**

### Manual Redeploy

- **Vercel**: Go to Deployments → Find latest → Click **...** → **Redeploy**
- **Railway**: Click on your deployment → **Redeploy**

---

## Cost Summary

| Service | Plan | Cost |
|---------|------|------|
| Vercel Frontend | Hobby (Free) | $0/month |
| Railway Backend | Starter | $5/month |
| MongoDB Atlas | M0 (Free) | $0/month |
| **Total** | | **$5/month** |

For a college project demo, you can use Railway's $5 credit/month on the Starter plan, effectively making it **free** for the first month.
