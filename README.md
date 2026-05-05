# OB Voting System

A web-based voting system to track student issues during the online exam for "Organizational Behavior" subject.

## Features

- **Student Voting**: Simple Yes/No voting on subject visibility
- **Duplicate Prevention**: IP tracking + browser fingerprinting
- **Real-time Updates**: Live statistics without page refresh
- **Admin Dashboard**: Secure login with vote visualization
- **Excel Export**: Download complete voting records
- **Mobile Responsive**: Works on all devices

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Excel Export**: SheetJS (xlsx)

## Quick Start

```bash
# Install all dependencies
npm run install-all

# Run development (both server and client)
npm run dev
```

## Deployment on Render

See `DEPLOYMENT.md` for detailed instructions.

## Environment Variables

### Server (.env)
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ob-voting
JWT_SECRET=your_jwt_secret_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

### Client (.env)
```
VITE_API_URL=http://localhost:5000
```
