# FixMyCity Portal - Production Deployment Guide

This guide will walk you through shipping the FixMyCity Portal system reliably to the internet using **Vercel** (Frontend), **Render** (Backend API), and **MongoDB Atlas** (Database).

---

## 🏗️ 1. Architecture Overview

- **Frontend:** Pure HTML/JS/CSS web application hosted statically.
- **Backend:** Node.js Express server offering REST endpoints and serving Socket.io traffic.
- **Database:** MongoDB Atlas cluster with auto-scaling.

Because of this separation, we will deploy the `/frontend` directory to Vercel, and the `/backend` directory to Render.

---

## 🗄️ 2. Database: MongoDB Atlas (Setup First)

1. Navigate to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and log in.
2. If you don't have a cluster, create a **Shared Cluster (Free Tier)**.
3. In your cluster dashboard, go to **Network Access** and add IP `0.0.0.0/0` (Allow Access From Anywhere) — Render's IPs change continuously so this is required.
4. Go to **Database Access** and create a Database User. Remember the password!
5. Go to **Databases** > **Connect** > **Drivers** and copy the Connection String.
6. Replace `<password>` with your user's password. Keep this string ready for the backend deployment. It should look like: `mongodb+srv://username:password@cluster.mongodb.net/cleanliness`

---

## 🚀 3. Backend: Render

### A. Environment Preparation
1. Make sure you have pushed all your latest code (including the `server.js` and `package.json` updates just performed) to your GitHub repository.

### B. Deploying on Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your GitHub repo.
4. **Configuration Settings**:
   - **Name**: `fixmycity-api` (or similar)
   - **Region**: Choose one closest to you.
   - **Branch**: `master` or `main`.
   - **Root Directory**: `backend` *(⚠️ Extremely Important: tell Render the backend code lives here)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. **Environment Variables**:
   Scroll down to Advanced > Environment Variables and click **Add Environment Variable**:
   - `MONGO_URI`: *(Paste the MongoDB Atlas connection string from step 2)*
   - `JWT_SECRET`: *(A long random string, e.g., `512bd9...`)*
   - `FRONTEND_URL`: Leave blank for now, we will come back to fill this once Vercel is set up. Example later: `https://my-fixmycity-app.vercel.app`
6. Click **Create Web Service**.
7. Wait ~2 minutes for the build to complete. Render will provide a URL like `https://fixmycity-api-xyz.onrender.com`. Copy this URL.

---

## 🌐 4. Frontend: Vercel

### A. Deploying on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project** and import your GitHub repository.
3. In the **Configure Project** section:
   - **Project Name**: `fixmycity-portal`
   - **Framework Preset**: `Other`
   - **Root Directory**: `frontend` *(⚠️ Click Edit and select the `frontend` folder)*
   - **Build Command**: *(Leave empty/override, we just want static serving)*
   - **Output Directory**: *(Leave empty/override, default is fine)*
4. **Environment Variables**:
   Expand the Environment Variables section and add:
   - `NEXT_PUBLIC_API_URL`: *(Paste the Render backend URL from step 3)*
   It should look like: `https://fixmycity-api-xyz.onrender.com`. **Do not include a trailing slash!**
5. Click **Deploy**.
6. Wait ~30 seconds. Vercel will give you a domain like `https://fixmycity-portal.vercel.app`. Copy this domain.

---

## 🔒 5. Finalizing Connections (CORS)

Now that we know the final Vercel frontend URL, we must tell our secure Render backend to allow traffic from it. 

1. Go back to your [Render Dashboard](https://dashboard.render.com).
2. Select your `fixmycity-api` web service.
3. Go to **Environment** on the left menu.
4. Add or update the variable:
   - `FRONTEND_URL`: *(Paste your Vercel URL, e.g., `https://fixmycity-portal.vercel.app`)*
5. Click **Save Changes**. Render will automatically quickly restart the service to apply the CORS rule.

---

## ✅ 6. Testing Production

You're done! Visit your Vercel frontend URL. 
- You should immediately be able to click around menus.
- Attempt to register a test user or log in. 
- Try to submit a report or open a map — this verifies MongoDB reads/writes and socket connections.

Your application now securely connects its static frontend to a scaled Node API, guarded by standard helmet/CORS limits and dynamically tracking routes.
