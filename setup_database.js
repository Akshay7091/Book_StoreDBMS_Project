require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// --- Database Connection Pool ---
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- Database Initialization Logic ---
const initializeDb = async () => {
    const CREATE_BOOKS_TABLE = `
        CREATE TABLE IF NOT EXISTS books (
            barcode VARCHAR(100) PRIMARY KEY,
            name VARCHAR(100),
            author VARCHAR(100),
            price INT,
            quantity INT,
            image_url VARCHAR(2048)
        )`;

    const CREATE_USERS_TABLE = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(100),
            firstname VARCHAR(100),
            lastname VARCHAR(100),
            phone VARCHAR(100) UNIQUE,
            mailid VARCHAR(100) UNIQUE,
            usertype INT DEFAULT 0
        )`;

    try {
        const connection = await pool.getConnection();
        console.log("Connected to MySQL. Setting up tables...");
        
        await connection.execute(CREATE_BOOKS_TABLE);
        await connection.execute(CREATE_USERS_TABLE);
        
        connection.release(); // Put the connection back in the pool
        console.log("Database setup complete. Done hai bhai!");
    } catch (err) {
        console.error("Database initialization failed:", err.message);
        process.exit(1); // Stop the server if DB fails
    }
};

// --- API ROUTES ---

// Health Check
app.get('/', (req, res) => {
    res.json({ status: "ok", message: "User API server is running." });
});

// Get All Regular Users
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT username, firstname, lastname, mailid, phone 
            FROM users 
            WHERE usertype IS NULL OR usertype != 1
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Database error while fetching users." });
    }
});

// User Registration
app.post('/api/register', async (req, res) => {
    const { firstname, lastname, username, password, mailid, phone } = req.body;

    if (!firstname || !username || !password || !mailid) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    try {
        const query = `INSERT INTO users (firstname, lastname, username, password, mailid, phone) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.execute(query, [firstname, lastname, username, password, mailid, phone]);
        res.status(201).json({ message: "User registered successfully." });
    } catch (error) {
        if (error.errno === 1062) {
            const msg = error.message.toLowerCase();
            if (msg.includes('username')) return res.status(409).json({ error: "Username already taken." });
            if (msg.includes('mailid')) return res.status(409).json({ error: "Email already registered." });
            if (msg.includes('phone')) return res.status(409).json({ error: "Phone number already registered." });
        }
        res.status(500).json({ error: "Registration failed." });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute("SELECT password FROM users WHERE username = ?", [username]);
        const user = rows[0];

        if (user && user.password === password) {
            res.json({ message: "Login successful." });
        } else {
            res.status(401).json({ error: "Invalid username or password." });
        }
    } catch (error) {
        res.status(500).json({ error: "Login error." });
    }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute(
            "SELECT password FROM users WHERE username = ? AND usertype = 1", 
            [username]
        );
        const admin = rows[0];

        if (admin && admin.password === password) {
            res.json({ message: "Admin login successful." });
        } else {
            res.status(401).json({ error: "Invalid admin credentials, Access denied." });
        }
    } catch (error) {
        res.status(500).json({ error: "Admin login error." });
    }
});

// --- START SERVER ---
// We initialize the DB first, then start listening
initializeDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
});