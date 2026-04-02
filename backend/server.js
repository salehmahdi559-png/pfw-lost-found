const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const ROOT_DIR = path.join(__dirname, "..");
const FRONTEND_DIR = path.join(ROOT_DIR, "frontend");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const DB_PATH = path.join(__dirname, "lostfound.db");

// Make sure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use("/uploads", express.static(UPLOADS_DIR));

// Serve frontend files
app.use(express.static(FRONTEND_DIR));

// SQLite database
const db = new sqlite3.Database(DB_PATH);

// Create table if it does not exist
db.run(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    itemType TEXT NOT NULL,
    color TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    affiliation TEXT NOT NULL,
    image TEXT,
    status TEXT DEFAULT 'Open'
  )
`);

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// API: health check
app.get("/api/health", (req, res) => {
  res.json({ message: "Campus Lost & Found API is running" });
});

// API: get all items
app.get("/items", (req, res) => {
  db.all("SELECT * FROM items ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// API: create item with optional image
app.post("/items", upload.single("image"), (req, res) => {
  const {
    itemType,
    color,
    description,
    location,
    date,
    time,
    name,
    email,
    phone,
    affiliation
  } = req.body;

  if (!itemType || !color || !location || !date || !time || !name || !email || !phone || !affiliation) {
    return res.status(400).json({ error: "All required fields must be filled out." });
  }

  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(
    `INSERT INTO items (
      itemType, color, description, location, date, time, name, email, phone, affiliation, image, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open')`,
    [
      itemType,
      color,
      description || "",
      location,
      date,
      time,
      name,
      email,
      phone,
      affiliation,
      imagePath
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        message: "Lost item report submitted successfully.",
        id: this.lastID
      });
    }
  );
});

// API: mark returned
app.put("/items/:id/return", (req, res) => {
  const id = req.params.id;

  db.run(
    "UPDATE items SET status = 'Returned' WHERE id = ?",
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ updated: this.changes });
    }
  );
});

// Serve frontend entry point
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});