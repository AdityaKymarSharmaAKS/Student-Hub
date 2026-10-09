# F-TECH-Student-Hub

**The Premier AKTU & Engineering Academic Portal**  
- **Company:** F-TECH  
- **Founder & Owner:** Aditya Kumar Sharma  
- **App Name:** F-TECH-Student-Hub  

---

## 📁 Repository Structure

```
student-hub/
│
├── frontend/
│   ├── index.html                  # Landing Portal & Overview
│   ├── pages/
│   │   ├── tutorial.html          # Video playlists & concept guides
│   │   ├── lab.html               # Lab experiments, code & viva Q&A
│   │   ├── aktu-papers.html       # AKTU PYQs (2021-2024)
│   │   ├── notes.html             # Unit-wise handwritten topper notes
│   │   ├── community.html         # Discussion board & doubt solving
│   │   ├── donate.html            # Support F-TECH & Founder note
│   │   ├── subject.html           # Curriculum breakdown & syllabus
│   │   └── document-viewer.html   # Interactive online PDF reader
│   ├── admin/
│   │   ├── login.html             # Admin authentication gateway
│   │   └── dashboard.html         # Admin stats & content governance
│   ├── css/
│   │   ├── style.css              # Global tokens, glassmorphism & resets
│   │   ├── sidebar.css            # Responsive collapsible sidebar
│   │   ├── cards.css              # Academic card grid styles
│   │   ├── viewer.css             # Reader controls & canvas stage
│   │   └── admin.css              # Dashboard layout & tables
│   ├── js/
│   │   ├── app.js                 # API handler, theme toggle & toasts
│   │   ├── navigation.js          # Mobile drawer & active route marker
│   │   ├── subjects.js            # Subject data & syllabus rendering
│   │   ├── documents.js           # PYQs & Notes filter & download engine
│   │   ├── uploads.js             # Student upload modal & validation
│   │   └── admin.js               # Admin authentication & CRUD actions
│   └── assets/
│       ├── images/                # Vector assets (UPI QR code)
│       └── icons/                 # F-TECH vector brand logos
│
├── backend/
│   ├── server.js                  # Express application server
│   ├── config/
│   │   └── database.js            # SQLite database & initial seed data
│   ├── routes/
│   │   ├── subjects.js            # /api/subjects
│   │   ├── documents.js           # /api/documents
│   │   ├── community.js           # /api/community
│   │   └── admin.js               # /api/admin
│   ├── middleware/
│   │   ├── authentication.js      # JWT verification middleware
│   │   └── upload-validation.js   # Multer file size/type validation
│   ├── controllers/
│   │   ├── subjectController.js
│   │   ├── documentController.js
│   │   ├── communityController.js
│   │   └── adminController.js
│   ├── services/
│   │   ├── authService.js
│   │   └── storageService.js
│   └── private-uploads/           # Upload directory
│
├── database/
│   ├── schema.sql                 # SQL schema definitions
│   └── student_hub.db             # Auto-generated SQLite database
├── .env                           # Environment configuration
├── .gitignore                     # Git ignore rules
└── package.json                   # Dependencies and scripts
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The server will start at `http://localhost:5000` and serve both the REST API and the frontend application.

### 3. Admin Credentials
- **Username:** `admin`
- **Password:** `ftechadmin2026`
- **Portal URL:** `http://localhost:5000/admin/login.html`
