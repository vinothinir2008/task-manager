# Task Management Application
Live Demo: https://task-manager-e8mk.onrender.com/
HTML, CSS, JavaScript + Node.js/Express + MongoDB (Mongoose). Features: register/login (bcrypt + JWT),
per-user tasks with create, edit, delete, status, priority, due date and filters, responsive layout.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env`, fill in `MONGODB_URI` (database name `taskmanager`) and `JWT_SECRET`
3. `node server.js` and open http://localhost:3000

## Deploy (Render)
Build command `npm install`, start command `node server.js`, environment variables `MONGODB_URI` and `JWT_SECRET`.
