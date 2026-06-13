/**
 * 1. استيراد المكتبات الأساسية
 * يسهل إضافة مكتبات جديدة مستقبلاً في مكان واحد
 */
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
app.use(cors({
    origin: '*', // السماح بالاتصال من أي مكان لتجنب مشاكل النطاق
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

/**
 * 3. إعداد المجلدات الثابتة
 */
app.use(express.static(path.join(__dirname, '../frontend')));


/**
 * 4. الاتصال بقاعدة البيانات
 */
const db = new sqlite3.Database('./database.db');

// دالة لضمان وجود الجداول وتحديثها إذا لزم الأمر
db.serialize(() => {
    // أضف هذا السطر هنا:
   db.run(`CREATE TABLE IF NOT EXISTS platform_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rating INTEGER,
    service_feedback TEXT,
    suggestions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, phone TEXT, email TEXT UNIQUE, password TEXT, role TEXT, id_number TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS expert_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expert_name TEXT,
        email TEXT,
        specialty TEXT,
        cv_file TEXT,
        status TEXT DEFAULT 'pending'
    )`);
    
    // هذا السطر يضمن إضافة العمود إذا كان مفقوداً في نسخة سابقة
    db.run(`ALTER TABLE expert_requests ADD COLUMN specialty TEXT`, (err) => {});
    db.run(`ALTER TABLE expert_requests ADD COLUMN cv_file TEXT`, (err) => {});

    db.run(`CREATE TABLE IF NOT EXISTS service_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_type TEXT, client_name TEXT, request_details TEXT,
        user_email TEXT, card_number TEXT, deposit_amount TEXT,
        attachments TEXT, status TEXT DEFAULT 'قيد المراجعة',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});
/**
 * 5. تعريف المسارات (Routes)
 */

app.post('/register', (req, res) => {
    const { name, phone, email, password, role, adminCode, idNumber } = req.body;
    if (!name || !email || !password || !idNumber) {
        return res.status(400).json({ error: 'يرجى ملء جميع الحقول الإجبارية!' });
    }
    if (role === 'admin' && adminCode !== "041096") {
        return res.status(400).json({ error: 'كود المدير غير صحيح!' });
    }
    const sql = `INSERT INTO users (name, phone, email, password, role, id_number) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [name, phone, email, password, role, idNumber], function(err) {
        if (err) {
            console.error('Database Error:', err.message);
            return res.status(400).json({ error: 'تعذر التسجيل، البريد الإلكتروني مستخدم مسبقاً.' });
        }
        res.json({ message: 'تم إنشاء الحساب بنجاح.' });
    });
});

app.post('/login', (req, res) => {
    const { email, password, role, idNumber } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'البريد غير مسجل.' });
        if (user.password !== password || user.id_number !== idNumber) 
            return res.status(401).json({ error: 'بيانات الدخول غير صحيحة.' });
        res.json({ message: 'تم الدخول', role: user.role , email: user.email });
    });
});

app.post('/add-expert', (req, res) => {
    const { name, specialty, license_number, bio } = req.body;
    if (!name || !specialty) {
        return res.status(400).json({ error: 'يرجى ملء الحقول الإجبارية (الاسم والتخصص)!' });
    }
    const generatedEmail = `expert_${Date.now()}@tahkime.com`;
    const defaultPassword = 'expert_password_123';
    const sql = `INSERT INTO users (name, phone, email, password, role, id_number) VALUES (?, ?, ?, ?, 'expert', ?)`;
    db.run(sql, [name, specialty, generatedEmail, defaultPassword, license_number], function(err) {
        if (err) {
            console.error('Database Error:', err.message);
            return res.status(500).json({ error: 'تعذر حفظ بيانات الخبير في قاعدة البيانات.' });
        }
        res.status(200).json({ success: true, message: "تم إضافة الخبير بنجاح" });
    });
});
// تأكد من وضع هذا قبل أي مسار يبدأ بـ app.get('/:page')
app.post('/register-expert', upload.single('cvFile'), (req, res) => {
    const { name, email, password, specialty } = req.body;
    const cvFile = req.file ? req.file.filename : null;

    console.log("البيانات المستلمة:", { name, email, specialty, cvFile }); // للتشخيص

    db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'pending_expert')`, 
    [name, email, password], function(err) {
        if (err) {
            console.error("خطأ في تسجيل المستخدم:", err.message); // هذا هو السطر المهم
            return res.status(500).json({ error: "خطأ في تسجيل المستخدم: " + err.message });
        }
        
        db.run(`INSERT INTO expert_requests (email, expert_name, specialty, cv_file, status) VALUES (?, ?, ?, ?, 'pending')`, 
[email, name, specialty, cvFile], (err) => {
            if (err) {
                console.error("خطأ في تسجيل الطلب:", err.message);
                return res.status(500).json({ error: "خطأ في تسجيل الطلب: " + err.message });
            }
            res.json({ success: true });
        });
    });
});
app.get('/check-auth', (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(401).json({ loggedIn: false });
    db.get(`SELECT name, role FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user) return res.status(401).json({ loggedIn: false });
        res.json({ loggedIn: true, role: user.role });
    });
});

app.get('/get-experts', (req, res) => {
    const sql = `SELECT name, phone as specialty, id_number as license_number FROM users WHERE role = 'expert'`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Database Fetch Error:', err.message);
            return res.status(500).json({ error: 'تعذر جلب قائمة الخبراء.' });
        }
        res.json(rows);
    });
});

app.post('/submit-expert-request', (req, res) => {
    const { email, expertName } = req.body;
    db.run(`INSERT INTO expert_requests (email, expert_name) VALUES (?, ?)`, [email, expertName], (err) => {
        if (err) return res.status(500).json({ error: "تعذر تقديم الطلب" });
        res.json({ success: true });
    });
});

app.get('/get-expert-requests', (req, res) => {
    db.all(`SELECT * FROM expert_requests WHERE status = 'pending'`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "خطأ" });
        res.json(rows);
    });
});

app.post('/handle-expert-request', (req, res) => {
    const { requestId, action } = req.body;
    const newStatus = action === 'approved' ? 'approved' : 'rejected';
    db.run(`UPDATE expert_requests SET status = ? WHERE id = ?`, [newStatus, requestId], (err) => {
        if (err) return res.status(500).json({ error: "خطأ" });
        res.json({ success: true });
    });
});

app.post('/approve-expert', (req, res) => {
    const { requestId, email } = req.body;
    db.run(`UPDATE expert_requests SET status = 'approved' WHERE id = ?`, [requestId], (err) => {
        if (err) return res.status(500).json({ error: "خطأ في تحديث الطلب" });
        db.run(`UPDATE users SET role = 'expert' WHERE email = ?`, [email], (err) => {
            if (err) return res.status(500).json({ error: "خطأ في ترقية المستخدم" });
            res.json({ success: true, message: "تمت الترقية بنجاح!" });
        });
    });
});

app.post('/update-order-status', (req, res) => {
    const { id, status } = req.body;
    db.run(`UPDATE service_orders SET status = ? WHERE id = ?`, [status, id], (err) => {
        if (err) return res.status(500).json({ error: "فشل التحديث" });
        res.json({ success: true });
    });
});

app.post('/submit-service-order', upload.array('attachments'), (req, res) => {
    const { serviceType, clientName, requestDetails, userEmail, cardNumber, depositAmount } = req.body;
    const fileNames = req.files ? req.files.map(f => f.filename).join(',') : '';
    const sql = `INSERT INTO service_orders (service_type, client_name, request_details, user_email, card_number, deposit_amount, attachments) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [serviceType, clientName, requestDetails, userEmail, cardNumber, depositAmount, fileNames], function(err) {
        if (err) {
            console.error('خطأ أثناء حفظ طلب الخدمة:', err.message);
            return res.status(500).json({ error: 'حدث خطأ داخلي في السيرفر أثناء معالجة البيانات الماليّة.' });
        }
        res.status(200).json({ success: true, message: 'تم استقبال طلبك بنجاح وحفظ الملفات وقيمة الاعتماد المالي!' });
    });
});
// ... بعد تعريف جميع المسارات السابقة، أضف هذه المسارات الجديدة:

app.post('/submit-feedback', (req, res) => {
    const { rating, serviceFeedback, suggestions } = req.body;
    db.run(`INSERT INTO platform_feedback (rating, service_feedback, suggestions) VALUES (?, ?, ?)`, 
    [rating, serviceFeedback, suggestions], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "خطأ في قاعدة البيانات" });
        }
        res.json({ success: true });
    });
});




app.get('/user-info', (req, res) => {
    const email = req.query.email;
    db.get(`SELECT name, email, role FROM users WHERE email = ?`, [email], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'لم يتم العثور على المستخدم' });
        res.json({ name: user.name, role: user.role });
    });
});

app.get('/admin-stats', (req, res) => {
    db.get(`SELECT COUNT(*) as count FROM users`, [], (err, row) => {
        if (err) return res.status(500).json({ error: "خطأ" });
        res.json({ totalUsers: row.count });
    });
});

app.get('/get-client-orders', (req, res) => {
    const email = req.query.email;
    if (!email) return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
    const sql = `SELECT id, service_type, client_name, request_details, deposit_amount, created_at FROM service_orders WHERE user_email = ? ORDER BY id DESC`;
    db.all(sql, [email], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "حدث خطأ أثناء جلب طلبات العميل" });
        }
        res.json(rows);
    });
});

app.get('/get-all-orders', (req, res) => {
    const sql = `SELECT id, service_type, client_name, request_details, user_email, deposit_amount, attachments, created_at FROM service_orders ORDER BY id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "حدث خطأ أثناء جلب طلبات المدير" });
        }
        res.json(rows);
    });
});
// ... (اترك كل مسارات app.get و app.post كما هي في الأعلى)
// في ملف server.js
app.get('/get-feedback', (req, res) => {
    db.all("SELECT * FROM platform_feedback", [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "خطأ في قاعدة البيانات" });
        }
        res.json(rows);
    });
});
// إضافة دعم لتوجيه أي طلب صفحة (مثل admin-dashboard.html) إلى الملف الصحيح
app.get('/:page', (req, res) => {
    const page = req.params.page;
    res.sendFile(path.join(__dirname, '../frontend', page));
});

const PORT = process.env.PORT || 3000; // هذا يقرأ المنفذ من السيرفر أو يستخدم 3000 محلياً
app.listen(PORT, '0.0.0.0', () => {
    console.log(`السيرفر يعمل الآن على المنفذ: ${PORT}`);
});


