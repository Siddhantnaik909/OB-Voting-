# Deployment Guide - Render

## Prerequisites

1. MongoDB Atlas account (free tier works)
2. Render account
3. Code pushed to GitHub/GitLab

## Step 1: MongoDB Atlas Setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database user with read/write permissions
3. Whitelist IP addresses (or use `0.0.0.0/0` for all IPs)
4. Get your connection string

## Step 2: Backend Deployment (Web Service)

1. In Render Dashboard, click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `ob-voting-api`
   - **Environment**: `Node`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   ```
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ob-voting
   JWT_SECRET=your_random_secret_key
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your_secure_admin_password
   ```
5. Click "Create Web Service"

## Step 3: Frontend Deployment (Static Site)

1. In Render Dashboard, click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `ob-voting-client`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add Environment Variable:
   ```
   VITE_API_URL=https://ob-voting-api.onrender.com
   ```
5. Click "Create Static Site"

## Step 4: Update CORS (if needed)

After deployment, update the `CLIENT_URL` in your backend environment variables to match your static site URL.

## Environment Variables Reference

### Backend
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `10000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret for JWT signing | `super-secret-key-123` |
| `ADMIN_USERNAME` | Admin login username | `admin` |
| `ADMIN_PASSWORD` | Admin login password | `SecurePass123!` |
| `CLIENT_URL` | Frontend URL for CORS | `https://ob-voting.onrender.com` |

### Frontend
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://ob-voting-api.onrender.com` |

## Post-Deployment

1. Visit your frontend URL
2. Test voting functionality
3. Access admin dashboard at `/admin`
4. Default admin credentials: `admin` / `your_secure_admin_password`
