const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }));
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

const db = new sqlite3.Database('./database.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS platform_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, rating INTEGER, service_feedback TEXT, suggestions TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, email TEXT UNIQUE, password TEXT, role TEXT, id_number TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS expert_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, expert_name TEXT, email TEXT, specialty TEXT, cv_file TEXT, status TEXT DEFAULT 'pending')`);
    db.run(`CREATE TABLE IF NOT EXISTS service_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, service_type TEXT, client_name TEXT, request_details TEXT, user_email TEXT, card_number TEXT, deposit_amount TEXT, attachments TEXT, status TEXT DEFAULT 'قيد المراجعة', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
});

/** مسارات الـ API **/

app.post('/register', (req, res) => {
    const { name, phone, email, password, role, adminCode, idNumber } = req.body;
    db.run(`INSERT INTO users (name, phone, email, password, role, id_number) VALUES (?, ?, ?, ?, ?, ?)`, [name, phone, email, password, role, idNumber], function(err) {
        if (err) return res.status(400).json({ error: 'تعذر التسجيل' });
        res.json({ message: 'تم التسجيل بنجاح' });
    });
});

app.post('/login', (req, res) => {
    const { email, password, idNumber } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user || user.password !== password) return res.status(401).json({ error: 'بيانات خاطئة' });
        res.json({ role: user.role, email: user.email, name: user.name });
    });
});

app.get('/user-info', (req, res) => {
    db.get(`SELECT name, role FROM users WHERE email = ?`, [req.query.email], (err, user) => {
        if (err || !user) return res.status(404).json({ error: "غير موجود" });
        res.json(user);
    });
});

app.post('/register-expert', upload.single('cvFile'), (req, res) => {
    const { name, email, password, specialty } = req.body;
    const cv = req.file ? req.file.filename : null;
    db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'pending_expert')`, [name, email, password], () => {
        db.run(`INSERT INTO expert_requests (email, expert_name, specialty, cv_file) VALUES (?, ?, ?, ?)`, [email, name, specialty, cv], () => res.json({ success: true }));
    });
});

app.get('/get-expert-requests', (req, res) => {
    db.all(`SELECT * FROM expert_requests WHERE status = 'pending'`, [], (err, rows) => res.json(rows));
});

app.post('/approve-expert', (req, res) => {
    db.run(`UPDATE expert_requests SET status = 'approved' WHERE id = ?`, [req.body.requestId], () => {
        db.run(`UPDATE users SET role = 'expert' WHERE email = ?`, [req.body.email], () => res.json({ success: true }));
    });
});

app.post('/submit-service-order', upload.array('attachments'), (req, res) => {
    const { serviceType, clientName, requestDetails, userEmail, cardNumber, depositAmount } = req.body;
    const files = req.files ? req.files.map(f => f.filename).join(',') : '';
    db.run(`INSERT INTO service_orders (service_type, client_name, request_details, user_email, card_number, deposit_amount, attachments) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
    [serviceType, clientName, requestDetails, userEmail, cardNumber, depositAmount, files], (err) => {
        if (err) return res.status(500).json({ error: 'خطأ' });
        res.json({ success: true });
    });
});

app.get('/get-client-orders', (req, res) => {
    db.all(`SELECT * FROM service_orders WHERE user_email = ?`, [req.query.email], (err, rows) => res.json(rows));
});

app.get('/admin-stats', (req, res) => {
    db.get(`SELECT COUNT(*) as count FROM users`, [], (err, row) => res.json({ totalUsers: row.count }));
});

app.post('/submit-feedback', (req, res) => {
    db.run(`INSERT INTO platform_feedback (rating, service_feedback, suggestions) VALUES (?, ?, ?)`, [req.body.rating, req.body.serviceFeedback, req.body.suggestions], (err) => res.json({ success: !err }));
});

/** خدمة الملفات (يجب أن تبقى دائماً في نهاية الكود) **/
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res, next) => {
    if (req.path.includes('.')) return next();
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`السيرفر يعمل على المنفذ: ${PORT}`));
