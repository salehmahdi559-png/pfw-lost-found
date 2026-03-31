const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow frontend to call backend
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// SQLite database
const db = new sqlite3.Database("./lostfound.db");

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

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Health check
app.get("/", (req, res) => {
  res.send("Campus Lost & Found API is running");
});

// GET all items
app.get("/items", (req, res) => {
  db.all("SELECT * FROM items ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST create item with optional image upload
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
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        message: "Lost item report submitted successfully.",
        id: this.lastID
      });
    }
  );
});

// PUT mark item as returned
app.put("/items/:id/return", (req, res) => {
  const id = req.params.id;

  db.run(
    "UPDATE items SET status = 'Returned' WHERE id = ?",
    [id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});