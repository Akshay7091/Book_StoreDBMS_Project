require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

// --- Configuration ---
const UPLOAD_FOLDER = 'static/uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Setup Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_FOLDER);
    },
    filename: (req, file, cb) => {
        // Equivalent to secure_filename: timestamp + original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error("Invalid file type. Allowed types are png, jpg, jpeg, gif, webp."));
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter 
});

// Middleware
app.use(cors());
app.use(express.json());
// Serve uploaded files statically
app.use('/static', express.static('static'));

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// --- Routes ---

// 1. Get All Books
app.get('/api/books', async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("SELECT barcode, name, author, price, quantity, image_url FROM books");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve data." });
    } finally {
        if (connection) await connection.end();
    }
});

// 2. Add Book (Handles File Upload + Form Data)
app.post('/api/books/add', upload.single('image'), async (req, res) => {
    const { barcode, name, author, price, quantity } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ error: "No image file part in the request." });
    }

    if (!barcode || !name || !author || !price || !quantity) {
        return res.status(400).json({ error: "Missing form data. All fields are required." });
    }

    const image_url = `/static/uploads/${req.file.filename}`;

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const query = `INSERT INTO books (barcode, name, author, price, quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)`;
        await connection.execute(query, [barcode, name, author, price, quantity, image_url]);
        
        res.status(201).json({ message: `Book '${name}' added successfully.` });
    } catch (error) {
        if (error.errno === 1062) {
            return res.status(409).json({ error: `Error: Barcode '${barcode}' already exists.` });
        }
        res.status(500).json({ error: "A database error occurred." });
    } finally {
        if (connection) await connection.end();
    }
});

// 3. Remove Book
app.delete('/api/books/remove', async (req, res) => {
    const { barcode } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [result] = await connection.execute("DELETE FROM books WHERE barcode = ?", [barcode]);
        
        if (result.affectedRows > 0) {
            res.json({ message: `Book with barcode '${barcode}' was removed.` });
        } else {
            res.status(404).json({ error: `Book with barcode '${barcode}' not found.` });
        }
    } catch (error) {
        res.status(500).json({ error: "A database error occurred." });
    } finally {
        if (connection) await connection.end();
    }
});

// 4. Buy Books (Transactions)
app.post('/api/books/buy', async (req, res) => {
    const { items } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        await connection.beginTransaction();

        for (const item of items) {
            const { barcode, quantity: quantityToBuy } = item;
            
            // SELECT FOR UPDATE (Locking row)
            const [rows] = await connection.execute(
                "SELECT name, quantity FROM books WHERE barcode = ? FOR UPDATE", 
                [barcode]
            );
            const book = rows[0];

            if (!book) {
                await connection.rollback();
                return res.status(404).json({ error: `Book with barcode '${barcode}' not found.` });
            }

            if (book.quantity < parseInt(quantityToBuy)) {
                await connection.rollback();
                return res.status(400).json({ error: `Not enough stock for '${book.name}'.` });
            }

            const newQuantity = book.quantity - parseInt(quantityToBuy);
            await connection.execute("UPDATE books SET quantity = ? WHERE barcode = ?", [newQuantity, barcode]);
        }

        await connection.commit();
        res.json({ message: "Purchase successful!" });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: "A database error occurred." });
    } finally {
        if (connection) await connection.end();
    }
});

app.listen(PORT, () => {
    console.log(`Books API running on http://localhost:${PORT}`);
});