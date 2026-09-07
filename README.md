# 🎓 Adaptive Learning Management & Real-Time EdTech Platform

<div align="center">

![Full-Stack Engineering](https://img.shields.io/badge/Architecture-Full--Stack%20Enterprise-6366f1?style=for-the-badge&logo=codewars&logoColor=white)
![React 18](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61dafb?style=for-the-badge&logo=react&logoColor=black)
![Node.js & Express](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%205-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%7C%20Mongoose%209-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![AWS S3](https://img.shields.io/badge/Cloud%20Storage-AWS%20S3%20Presigned-FF9900?style=for-the-badge&logo=amazons3&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO%20WebSockets-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

<p align="center">
  <b>A Production-Grade, Resilient Distributed Educational Operating System</b><br>
  Engineered with Adaptive Mastery Quizzes, AWS S3 Direct Streaming, WebSockets, Embedded Monaco IDE, and Enterprise RBAC.
</p>

---

</div>

## 📌 Executive Summary

This platform represents a **resilient, scalable, and secure distributed educational operating system** built from the ground up to solve modern e-learning challenges. Rather than a standard CRUD application, it showcases deep full-stack engineering across cloud media streaming, real-time bidirectional communication, algorithmic mastery evaluation, fine-grained access control, and browser-based developer tooling.

---

## 🛠️ Master Technical Skills Matrix

| Domain | Core Technologies & Protocols | Practical Engineering Application in this Project |
| :--- | :--- | :--- |
| **Frontend Architecture** | React 18, Vite, React Router 6, Context API, Lucide Icons | Component-driven architecture, custom hooks, atomic state isolation, multi-stage routing, zero-prop-drilling state synchronization. |
| **UI/UX & Design Systems** | Tailwind CSS, Glassmorphism, CSS Transitions & Keyframes | Ultra-modern dark-mode design, responsive island navigation, micro-interactions, custom scrollbars, accessible interactive states. |
| **Backend Engineering** | Node.js (ES Modules), Express.js 5, RESTful API Design | Layered architecture (Controllers, Services, Models, Middlewares), asynchronous error boundaries, modular route structuring. |
| **Database & Modeling** | MongoDB, Mongoose 9, Aggregation Framework | Relational data integrity in NoSQL (populate, cascades), schema validation, indexing, mastery scoring models, dynamic queries. |
| **Real-Time & WebSockets** | Socket.IO, WebSockets, Bi-directional Event Hub | Real-time classroom presence, instant notification dispatch, unread message badges, collaborative live attendance sync. |
| **Cloud & Distributed Media** | AWS SDK v3 (`@aws-sdk/client-s3`), Pre-signed URLs, Multer | Direct client-to-S3 multi-part resumable uploads, fallback local disk pipeline, Sharp image optimization buffer stream. |
| **Auth & App Security** | JWT (Dual Access/Refresh Token rotation), OAuth 2.0, BCrypt | Google & GitHub OAuth integrations, HTTP-only cookie tokens, Helmet HTTP headers, CORS whitelisting, Express Rate-Limiting. |
| **Code Sandbox & EdTech** | Monaco Editor (`@monaco-editor/react`), AST / Code Submissions | Browser-based IDE, multi-language execution simulation, automated student code validation, plagiarism analysis reports. |
| **DevOps & Tooling** | Git, Nodemon, Dotenv, Postman, Vite Rollup Bundler | Clean environment variable isolation, hot module replacement, optimized production bundles, linting & code cleanliness. |

---

## 🏗️ System Architecture & Data Flow

```
                                 +-------------------------------------------------------+
                                 |                    Client Browser                     |
                                 |  (React 18 + Vite + Tailwind CSS + Context API + UI)  |
                                 +---------------------------+---------------------------+
                                                             |
                                      HTTPS REST APIs        |     WSS Socket.IO Events
                                                             v
+------------------------------------------------------------+-----------------------------------------------------------+
|                                                   Node.js / Express 5 API Server                                       |
|                                                                                                                        |
|  [Security Gateways]                                                                                                   |
|    ├── Helmet.js (HTTP Headers)           ├── Express Rate-Limiter (DDoS / Brute Force Mitigation)                     |
|    ├── CORS Whitelist Filtering           └── Cookie-Parser & Request Sanitize                                         |
|                                                                                                                        |
|  [Authentication & RBAC Middleware]                                                                                    |
|    ├── JWT Access/Refresh Token Verifier (Bearer / HttpOnly)                                                           |
|    ├── Role-Based Access Control (Admin / Instructor / Student)                                                        |
|    └── Granular Permission Enforcement Engine                                                                          |
|                                                                                                                        |
|  [Business Logic Controllers]                                                                                          |
|    ├── Auth & OAuth Controller (Google + GitHub)      ├── Video & S3 Stream Controller (Chunking & Presigned URLs)      |
|    ├── Adaptive Quiz & Mastery Engine                 ├── Live Session & Attendance Sync Controller                    |
|    ├── Ticket & Support Desk Lifecycle                └── Notification & User Profile Studio Controller                |
+------------------------------------+---------------------------------------------------+-------------------------------+
                                     |                                                   |
                     Mongoose ODM    v                                                   v   AWS SDK Presigned Put
+------------------------------------+-----------------------+   +-----------------------+-------------------------------+
|                       MongoDB Database                     |   |                 Amazon S3 Cloud Storage               |
|                                                            |   |                                                       |
|  • Users & Profiles      • Quizzes & Attempts              |   |  • Video Lecture Media (.mp4, .m3u8)                  |
|  • Dynamic Roles/Perms   • Student Mastery Tracking        |   |  • User Profile Avatars & Banner Assets               |
|  • Courses & Videos      • Support Tickets & Audit Logs    |   |  • Automated Presigned Upload Keys (Zero-Load Server) |
|  • Live Sessions         • Real-Time Notifications         |   +-------------------------------------------------------+
+------------------------------------------------------------+
```

---

## 💡 Core Features & Engineering Accomplishments

### 1. Robust Authentication & Enterprise RBAC Architecture
- **Dual-Token System**: Stateless short-lived **JWT Access Tokens** paired with persistent **Refresh Tokens** to mitigate unauthorized session hijacking.
- **Social OAuth 2.0 Integration**: Native authentication supporting **Google Identity Services** and **GitHub OAuth**, featuring automatic profile unification and avatar synchronization.
- **Granular Permissions System**:
  - Dynamic roles (`Admin`, `Manager/Instructor`, `Student`).
  - Decoupled permissions from static roles via dedicated `Permission.js` and `Role.js` schemas, enabling runtime permission enforcement via middleware without redeploying code.

### 2. High-Performance Media Pipeline & Cloud Engineering
- **Direct-to-Cloud Uploads**: Utilizes `@aws-sdk/s3-request-presigner` to generate cryptographically signed PUT URLs, offloading video and heavy file transfers from the backend server directly to **Amazon S3**.
- **Resumable Chunk Uploader**: Engineered a front-end resumable multipart uploader (`ResumableUploader.jsx`) capable of uploading gigabyte-scale video assets in deterministic slices with client retry logic.
- **Image Processing & Transcoding**: Integrated `sharp` for in-memory image compression, re-encoding user avatars and course thumbnails before cloud storage.

### 3. Real-Time Distributed Communication (WebSockets)
- **Persistent Socket.IO Hub**: Integrated a reactive bidirectional event loop (`socket.io` & client socket listener) with token-authenticated handshake verification.
- **Instant Notification Broadcast**: Real-time push notifications delivered dynamically to the UI header bell (`NotificationBell.jsx`) without requiring polling or page refreshes.
- **Live Classroom Presence**: Real-time active participant tracking, pinging, and automated session attendance logging (`LiveAttendance.js` and `LiveClassRoom.jsx`).

### 4. Adaptive Learning Algorithms & Student Mastery Tracking
- **Intelligent Quiz Engine**: An algorithm in `quizController.js` and `AdaptiveQuizEngine.jsx` dynamically adjusts question difficulty based on continuous student accuracy and time-to-solve metrics.
- **Historical Mastery Models**: Tracks concept-by-concept mastery in `StudentMastery.js`, preventing duplicate quiz attempts and rendering real-time mastery metrics.

### 5. In-Browser Monaco Developer Environment & Plagiarism Analysis
- **Monaco Code Editor**: Embedded Microsoft's Monaco editor (`MonacoCodeEditor.jsx`) providing syntax highlighting, bracket matching, and multiple programming language support directly within courses.
- **Code Submission & Audit**: Backend ingestion pipeline (`CodeSubmission.js`) capturing student code submissions, tracking execution states, and feeding into automated plagiarism analysis modals (`PlagiarismReportModal.jsx`).

### 6. Production-Ready User Profile & Account Center
- **Dynamic Profile Customization**: Users across all roles can customize personal bios, headlines, phone contacts, and social media handles (GitHub, LinkedIn, Twitter, Personal Portfolio).
- **Dual Avatar Pipeline**: Supports both custom image uploads (persisted to cloud) and curated zero-latency avatar presets.
- **Self-Healing State**: Front-end `ProfileContext` utilizes synchronous token recovery from `localStorage` paired with defensive default fallbacks to eliminate application crashes on cold starts and page reloads.

---

## 🔒 Security Best Practices & Defensive Engineering

- **Injection Prevention**: All MongoDB queries utilize Mongoose schema definitions and strict data sanitation to prevent NoSQL query injection.
- **Brute-Force & Denial-of-Service Defense**: Integrated `express-rate-limit` to rate-limit sensitive endpoints (login, OTP generation, password reset).
- **Password Protection**: BCrypt cryptographic hashing with configured salt work factors (`bcryptjs`).
- **HTTP Security Headers**: Powered by `helmet` to mitigate cross-site scripting (XSS), clickjacking, and MIME-sniffing vulnerabilities.
- **Fail-Safe UI Destructuring**: Defensive React Context patterns guaranteeing zero uncaught exceptions even when components mount outside providers.

---

## 📂 Repository Codebase Structure

```
LoginSignup/
├── backend/
│   ├── config/              # AWS S3, Cloud configs, and database connectors
│   ├── controllers/         # 11+ Isolated controllers (Auth, User, Video, Quiz, Ticket, Live)
│   ├── middleware/          # JWT verification, RBAC permissions, file upload interceptors
│   ├── models/              # 14 Mongoose Data Schemas (Users, Roles, Courses, Quizzes, etc.)
│   ├── routes/              # Express API Route Declarations
│   ├── services/            # Reusable business logic (Emailing, OTP, S3 Service)
│   ├── server.js            # Express application bootstrap & Socket.io server mount
│   └── package.json         # Backend dependency definitions & scripts
│
└── frontend/frontend/
    ├── public/              # Static assets & icons
    ├── src/
    │   ├── assets/          # Vector graphics & styling assets
    │   ├── components/      # Reusable UI widgets (Monaco, Header, Adaptive Quiz, Uploader)
    │   ├── context/         # React Context Providers (ProfileContext, AuthContext)
    │   ├── pages/           # Page views (UserProfile, Dashboard, CourseListPage, Auth)
    │   ├── services/        # Client API communication layers (authenticatedFetch, endpoints)
    │   ├── App.jsx          # Route declarations & global context provider tree
    │   ├── index.css        # Tailwind directives & custom design system tokens
    │   └── main.jsx         # React DOM root mounting
    └── vite.config.js       # Fast Rollup/Vite bundling configuration
```

---

## ⚡ How to Run & Verify Locally

### 1. Backend Service
```bash
cd backend
npm install

# Configure environment variables in backend/.env:
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/lms
# JWT_SECRET=your_jwt_secret
# REFRESH_TOKEN_SECRET=your_refresh_secret
# AWS_ACCESS_KEY_ID=your_aws_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret
# AWS_REGION=your_aws_region
# AWS_BUCKET_NAME=your_bucket_name

npm start
# -> Express API running on http://localhost:5000
```

### 2. Frontend Client
```bash
cd frontend/frontend
npm install
npm run dev
# -> Vite Dev Server running on http://localhost:5173
```

---

## 👨‍💻 Developer Profile & Contact

- **Core Focus**: Full-Stack Web Development, Real-Time Distributed Systems, Cloud Architecture
- **Tech Stack**: TypeScript / JavaScript (ES6+), React, Node.js, Express, MongoDB, AWS, Tailwind CSS
- **Code Philosophy**: Clean architecture, resilient state management, defensive error handling, and high-aesthetic UI/UX.

---
*Document prepared for Git repository submission and engineering portfolio
