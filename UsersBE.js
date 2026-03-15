require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); // Using promise-based wrapper for cleaner code
const cors = require('cors');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Configuration
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// --- Health Check Route ---
app.get('/', (req, res) => {
    res.json({ status: "ok", message: "User API server is running." });
});

// --- Get All Users Route ---
app.get('/api/users', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const query = `
            SELECT username, firstname, lastname, mailid, phone 
            FROM users 
            WHERE usertype IS NULL OR usertype != 1
        `;
        const [rows] = await connection.execute(query);
        res.json(rows);
    } catch (error) {
        console.error(`Database Error: ${error.message}`);
        res.status(500).json({ error: "A database error occurred while fetching users." });
    } finally {
        if (connection) await connection.end();
    }
});

// --- User Registration Route ---
app.post('/api/register', async (req, res) => {
    const { firstname, lastname, username, password, mailid, phone } = req.body;

    if (!firstname || !username || !password || !mailid) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const query = `
            INSERT INTO users (firstname, lastname, username, password, mailid, phone)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await connection.execute(query, [firstname, lastname, username, password, mailid, phone]);
        
        res.status(201).json({ message: "User registered successfully." });
    } catch (error) {
        // Handle Duplicate Entry (MySQL Error 1062)
        if (error.errno === 1062) {
            const msg = error.message.toLowerCase();
            if (msg.includes('username')) return res.status(409).json({ error: "This username is already taken." });
            if (msg.includes('mailid')) return res.status(409).json({ error: "This email is already registered." });
            if (msg.includes('phone')) return res.status(409).json({ error: "This phone number is already registered." });
        }
        
        console.error(`Database Error: ${error.message}`);
        res.status(500).json({ error: "A database error occurred during registration." });
    } finally {
        if (connection) await connection.end();
    }
});

// --- User Login Route ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("SELECT username, password FROM users WHERE username = ?", [username]);
        const user = rows[0];

        if (user && user.password === password) {
            res.status(200).json({ message: "Login successful." });
        } else {
            res.status(401).json({ error: "Invalid username or password." });
        }
    } catch (error) {
        console.error(`Database Error: ${error.message}`);
        res.status(500).json({ error: "A database error occurred during login." });
    } finally {
        if (connection) await connection.end();
    }
});

// --- Admin Login Route ---
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const query = "SELECT username, password FROM users WHERE username = ? AND usertype = 1";
        const [rows] = await connection.execute(query, [username]);
        const user = rows[0];

        if (user && user.password === password) {
            res.status(200).json({ message: "Admin login successful." });
        } else {
            res.status(401).json({ error: "Invalid admin credentials, Access denied." });
        }
    } catch (error) {
        console.error(`Database Error: ${error.message}`);
        res.status(500).json({ error: "A database error occurred." });
    } finally {
        if (connection) await connection.end();
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});