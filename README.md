# CleanCity Portal / Public Space Cleanliness System

## 🌍 About The Project

The **CleanCity Portal** (also referred to as the Public Space Cleanliness System) is a comprehensive web platform designed to empower citizens, NGOs, and local authorities to collaborate on maintaining and improving the cleanliness of public spaces. 

Through real-time reporting, AI integration, community networking, and a reward system, this platform facilitates an end-to-end workflow for tracking, resolving, and auditing civic cleanliness issues.

## 🏗️ Architecture & Tech Stack

This project is built using a decoupled architecture separating the client-side presentation from the server-side API and database.

- **Frontend:** Pure HTML5, CSS3, and Vanilla JavaScript. (Designed for static hosting on Vercel).
- **Backend:** Node.js, Express.js, and Socket.io for REST APIs and real-time WebSocket communication. (Designed for hosting on Render).
- **Database:** MongoDB Atlas (Mongoose ODM).

## 🚀 Core Features & Logic

1. **Issue Reporting & Management:** Citizens can report cleanliness issues which are then tracked by authorities and NGOs until resolution.
2. **Real-Time Communication:** Powered by Socket.io, the platform supports real-time chat, notifications, and updates (e.g., the global NGO network chat).
3. **AI Integration:** Smart analysis and categorization of incoming reports.
4. **Gamification & Rewards:** A built-in reward mechanic encourages continuous civic participation.
5. **Funding & Donations:** Integrated donation flows to support cleanup operations and NGOs.
6. **Security & Performance:** The backend relies on `helmet` for HTTP header security, `cors` for safe cross-origin traffic, and `compression` for reducing payload sizes.
7. **Self-Healing Infrastructure:** The backend includes a self-pinging warmup script (`/ping`) that keeps the Render server alive, preventing cold starts and ensuring low latency.

## 📁 Repository Structure

- `/frontend` - Contains all static files (HTML, JS, CSS, assets) representing the UI. It can be easily deployed to static site hosts without server-side rendering logic.
- `/backend` - Contains the Express server, Mongoose models, routing, and controllers.
- `deployment_guide.md` - Detailed step-by-step instructions for taking this project live on Vercel, Render, and MongoDB Atlas.

## ⚙️ How the System Connects (The Plan)

1. **User Interaction:** A user accesses the Vercel-hosted Frontend.
2. **API Communication:** The frontend sends asynchronous HTTP requests (via standard REST) to the Render-Hosted Node API.
3. **Data Persistence:** The Node API validates the requests, sanitizes the inputs, and reads/writes to the MongoDB Atlas cluster.
4. **Real-time Updates:** Whenever a critical event happens (like a new report or chat message), the Backend pushes an event via Socket.io back to the connected clients on the Frontend.

## 🛠️ Local Development Setup

To run this application locally, you will need two terminal windows.

### Backend Setup
1. Navigate to `cd backend`
2. Run `npm install`
3. Create a `.env` file referencing `.env.example` with your MongoDB connection string and JWT Secret.
4. Run `npm start` (Server will run on `http://localhost:3000`)

### Frontend Setup
1. Navigate to `cd frontend`
2. You can serve the static files using any local server such as VS Code's Live Server or the `serve` npm package.
3. Make sure the frontend points its API calls to `http://localhost:3000` (Configure `NEXT_PUBLIC_API_URL` or equivalent if running in a build environment).

---
*For full production deployment instructions, please read `deployment_guide.md`.*
