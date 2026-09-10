# FraudLens AI - Cloud Deployment Guide

This guide outlines how to deploy FraudLens AI to the cloud using the included **Render.com Blueprint** (`render.yaml`).

---

## 🚀 One-Click Blueprint Deployment via Render.com

Render allows deploying the complete multi-service stack (Python FastAPI + Node.js Express + React 19 Frontend) directly from your GitHub repository using **Infrastructure as Code (IaC)**.

### Step 1: Sign In to Render
1. Navigate to **[https://render.com](https://render.com)**.
2. Sign in using your GitHub account (**`Ruchith4560`**).

### Step 2: Create a New Blueprint Instance
1. In the Render Dashboard, click the **"New +"** button in the top navigation bar.
2. Select **"Blueprint"** (or go to [https://dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)).
3. Connect your GitHub repository:
   * **`Ruchith4560/finiancial-fraud-investigation-platform`**
4. Render will automatically detect the **`render.yaml`** file in the repository root.

### Step 3: Review & Deploy
Render will display the 3 services defined in the blueprint:
1. **`fraudlens-intelligence`** (Python 3.11 Web Service — FastAPI ML & Graph Engine)
2. **`fraudlens-backend`** (Node.js 20 Web Service — Express API & Case Engine)
3. **`fraudlens-frontend`** (Static Site — React 19 SPA with automatic rewrite routing)

Click **"Apply"** to trigger the automated build and deployment for all three services!

---

## 🗄️ Optional: Connecting Persistent MongoDB Atlas

By default, the backend boots with **`MONGODB_URI=memory`**, running a zero-config in-memory database server.

If you want data to persist across server restarts on Render's free tier:
1. Create a free **M0 Sandbox Cluster** on **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas)**.
2. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere).
3. Under **Database Access**, create a user with read/write permissions.
4. Copy your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/fraudlens?retryWrites=true&w=majority
   ```
5. In the Render Dashboard, open the **`fraudlens-backend`** service $\to$ **Environment** $\to$ update **`MONGODB_URI`** with your Atlas connection string.
6. Click **"Save Changes"** — Render will automatically redeploy the backend!

---

## 🌐 Live URLs & Access

Once deployed, Render provides public HTTPS endpoints for each service:
* **Frontend Web App**: `https://fraudlens-frontend.onrender.com`
* **Node.js Express API**: `https://fraudlens-backend.onrender.com/api/v1/health`
* **Python Swagger Docs**: `https://fraudlens-intelligence.onrender.com/api/v1/docs`

Default login credentials:
* **Username**: `admin` | **Password**: `password123`
* **Username**: `investigator` | **Password**: `password123`
