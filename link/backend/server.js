const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();

/**
 * 2. إعدادات الـ Middleware
 */
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'], credentials: true }));
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

/**
 * 3. قاعدة البيانات
 */
const db = new sqlite3.Database('./database.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS platform_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, rating INTEGER, service_feedback TEXT, suggestions TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, email TEXT UNIQUE, password TEXT, role TEXT, id_number TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS expert_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, expert_name TEXT, email TEXT, specialty TEXT, cv_file TEXT, status TEXT DEFAULT 'pending')`);
    db.run(`CREATE TABLE IF NOT EXISTS service_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, service_type TEXT, client_name TEXT, request_details TEXT, user_email TEXT, card_number TEXT, deposit_amount TEXT, attachments TEXT, status TEXT DEFAULT 'قيد المراجعة', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
});

/**
 * 4. مسارات الـ API (كل الوظائف المطلوبة)
 */

// التسجيل والدخول
app.post('/register', (req, res) => {
    const { name, phone, email, password, role, adminCode, idNumber } = req.body;
    if (!name || !email || !password || !idNumber) return res.status(400).json({ error: 'يرجى ملء جميع الحقول!' });
    if (role === 'admin' && adminCode !== "041096") return res.status(400).json({ error: 'كود المدير غير صحيح!' });
    db.run(`INSERT INTO users (name, phone, email, password, role, id_number) VALUES (?, ?, ?, ?, ?, ?)`, [name, phone, email, password, role, idNumber], function(err) {
        if (err) return res.status(400).json({ error: 'تعذر التسجيل، البريد مستخدم مسبقاً.' });
        res.json({ message: 'تم التسجيل بنجاح.' });
    });
});

app.post('/login', (req, res) => {
    const { email, password, idNumber } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user || user.password !== password || user.id_number !== idNumber) return res.status(401).json({ error: 'بيانات غير صحيحة.' });
        res.json({ role: user.role, email: user.email, name: user.name });
    });
});

// الخبراء
app.post('/add-expert', (req, res) => {
    const { name, specialty, license_number } = req.body;
    const generatedEmail = `expert_${Date.now()}@tahkime.com`;
    db.run(`INSERT INTO users (name, phone, email, password, role, id_number) VALUES (?, ?, ?, 'expert_password_123', 'expert', ?)`, [name, specialty, generatedEmail, license_number], (err) => {
        if (err) return res.status(500).json({ error: 'خطأ في إضافة الخبير' });
        res.json({ success: true });
    });
});

app.post('/register-expert', upload.single('cvFile'), (req, res) => {
    const { name, email, password, specialty } = req.body;
    const cvFile = req.file ? req.file.filename : null;
    db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'pending_expert')`, [name, email, password], (err) => {
        if (err) return res.status(500).json({ error: "خطأ في تسجيل المستخدم" });
        db.run(`INSERT INTO expert_requests (email, expert_name, specialty, cv_file, status) VALUES (?, ?, ?, ?, 'pending')`, [email, name, specialty, cvFile], (err) => {
            if (err) return res.status(500).json({ error: "خطأ في الطلب" });
            res.json({ success: true });
        });
    });
});

app.get('/check-auth', (req, res) => {
    db.get(`SELECT name, role FROM users WHERE email = ?`, [req.query.email], (err, user) => {
        if (err || !user) return res.status(401).json({ loggedIn: false });
        res.json({ loggedIn: true, role: user.role });
    });
});

app.get('/get-experts', (req, res) => {
    db.all(`SELECT name, phone as specialty, id_number as license_number FROM users WHERE role = 'expert'`, [], (err, rows) => res.json(rows));
});

app.post('/submit-expert-request', (req, res) => {
    db.run(`INSERT INTO expert_requests (email, expert_name) VALUES (?, ?)`, [req.body.email, req.body.expertName], (err) => res.json({ success: !err }));
});

app.get('/get-expert-requests', (req, res) => {
    db.all(`SELECT * FROM expert_requests WHERE status = 'pending'`, [], (err, rows) => res.json(rows));
});

app.post('/approve-expert', (req, res) => {
    db.run(`UPDATE expert_requests SET status = 'approved' WHERE id = ?`, [req.body.requestId], () => {
        db.run(`UPDATE users SET role = 'expert' WHERE email = ?`, [req.body.email], () => res.json({ success: true }));
    });
});

// الطلبات والخدمات
app.post('/submit-service-order', upload.array('attachments'), (req, res) => {
    const { serviceType, clientName, requestDetails, userEmail, cardNumber, depositAmount } = req.body;
    const files = req.files ? req.files.map(f => f.filename).join(',') : '';
    db.run(`INSERT INTO service_orders (service_type, client_name, request_details, user_email, card_number, deposit_amount, attachments) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
    [serviceType, clientName, requestDetails, userEmail, cardNumber, depositAmount, files], (err) => {
        if (err) return res.status(500).json({ error: 'خطأ في تقديم الطلب' });
        res.json({ success: true });
    });
});

app.get('/get-client-orders', (req, res) => {
    db.all(`SELECT * FROM service_orders WHERE user_email = ?`, [req.query.email], (err, rows) => res.json(rows));
});

app.get('/get-all-orders', (req, res) => {
    db.all(`SELECT * FROM service_orders ORDER BY id DESC`, [], (err, rows) => res.json(rows));
});

app.post('/update-order-status', (req, res) => {
    db.run(`UPDATE service_orders SET status = ? WHERE id = ?`, [req.body.status, req.body.id], () => res.json({ success: true }));
});

// معلومات المستخدم والتقييمات
script.js:209  GET https://link-p08u.onrender.com/user-info?email=maddar%40gmail.com 404 (Not Found)

app.get('/admin-stats', (req, res) => {
    db.get(`SELECT COUNT(*) as count FROM users`, [], (err, row) => res.json({ totalUsers: row.count }));
});

app.post('/submit-feedback', (req, res) => {
    db.run(`INSERT INTO platform_feedback (rating, service_feedback, suggestions) VALUES (?, ?, ?)`, [req.body.rating, req.body.serviceFeedback, req.body.suggestions], (err) => res.json({ success: !err }));
});

app.get('/get-feedback', (req, res) => {
    db.all("SELECT * FROM platform_feedback", [], (err, rows) => res.json(rows));
});



/**
 * 5. خدمة الملفات الثابتة والصفحات (الإصدار الصحيح)
 */

// أولاً: التأكد من أن جميع ملفات المجلدات الثابتة (js, css, images) تُقرأ مباشرة
app.use(express.static(path.join(__dirname, '../frontend')));

// ثانياً: مسار الصفحات (بشرط ألا يكون طلباً لملف ثابت مثل js أو css)
app.get('*', (req, res, next) => {
    // إذا كان الطلب يحتوي على امتداد (مثل .js أو .css أو .png)، اتركه للمتصفح (لا تلمسه)
    if (req.path.includes('.')) {
        return next(); 
    }

    const requestedPath = req.params[0].substring(1) || 'index.html';
    
    // محاولة البحث في المسار الرئيسي
    let filePath = path.join(__dirname, '../frontend', requestedPath);
    
    // إذا لم يجد الملف، محاولة البحث في service-details
    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, '../frontend', 'service-details', requestedPath);
    }

    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
        res.sendFile(filePath);
    } else {
        // في حالة لم يجد أي ملف، يرجع للرئيسية لدعم صفحات الـ HTML فقط
        res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`السيرفر يعمل الآن على المنفذ: ${PORT}`));
