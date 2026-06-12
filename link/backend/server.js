/**
 * 1. مدير التحميل الذكي (Application Initialization)
 */
/**
 * دالة تهيئة الأحداث (التفاعلات) - نسخة محمية
 */
function setupEventListeners() {
    // 1. النماذج (Forms) - تم إضافة فحص if (el) لتجنب خطأ null
    const forms = { 
        'loginForm': 'login', 
        'registerForm': 'register', 
        'addExpertForm': 'add-expert' 
    };

    Object.keys(forms).forEach(id => {
        const el = document.getElementById(id);
        // التعديل هنا: نربط الحدث فقط إذا كان العنصر موجوداً في الصفحة الحالية
        if (el) {
            el.addEventListener('submit', (e) => handleFormSubmit(e, forms[id]));
        }
    });

    // 2. زر تسجيل الخروج
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear(); 
            sessionStorage.clear();
            alert('تم تسجيل الخروج بنجاح.');
            window.location.href = 'index.html';
        });
    });

    // 3. زر طلب الخدمة
    const applyNowBtn = document.getElementById('applyNowBtn');
    if (applyNowBtn) {
        applyNowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // إضافة حماية للزر لضمان أنه موجود
            applyNowBtn.innerText = "جاري التحقق...";
            applyNowBtn.style.opacity = "0.7";
            applyNowBtn.disabled = true;

            const userRole = localStorage.getItem('userRole');
            if (localStorage.getItem('isLoggedIn') !== 'true') {
                window.location.href = 'register.html';
            } else {
                const paths = { 
                    'admin': 'admin-dashboard.html', 
                    'company': 'client-dashboard.html', 
                    'client': 'client-dashboard.html', 
                    'expert': 'expert-dashboard.html' 
                };
                window.location.href = paths[userRole] || 'login.html';
            }
        });
    }

    // 4. معالجة نموذج التقييم
    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', handleFeedbackSubmit);
    }
}
/**
 * دالة التحميل الذكي حسب المسار (تمنع الأخطاء في الصفحات)
 */
/**
 * دالة التحميل الذكي حسب المسار
 */
async function initPageLoad() {
    const path = window.location.pathname;

    // --- تحديث كود الأسعار هنا ---
    if (path.includes('fill-service-data.html')) {
    const servicePrices = {
        "التحكيم التجاري": 500000,
        "وساطة": 20000,
        "استشارة": 2000,
        "نسخة من الاحكام": 5000,
        "تحرير عريضة": 5000,
        "ورشات تكوينية": 15000,
        "خلية متابعة": 10000,
        "الاشهارات القانونية": 50000,
         "عقود": 60000
    };

    const serviceName = sessionStorage.getItem('selectedServiceName');
    console.log("الاسم المجلوب من التخزين:", serviceName); // <--- سيظهر لك في الـ Console
    
    const priceInput = document.getElementById('servicePrice');
    const depositDisplay = document.getElementById('depositAmountDisplay');
    
    if (serviceName && servicePrices[serviceName]) {
    const price = servicePrices[serviceName];
    
    // حساب العربون (ثلث السعر)
    const deposit = Math.round(price / 3); 
    
    // تحديث خانة السعر الكلي
    if (priceInput) priceInput.value = price;
    
    // تحديث قيمة العربون في الصفحة
    const depositDisplay = document.getElementById('depositAmountDisplay');
    if (depositDisplay) depositDisplay.innerText = deposit;
    
    // تحديث قيمة العربون داخل الـ FormData (إذا كنت تريد إرسالها للسيرفر)
    // لاحظ أنك قمت سابقاً بإضافة العربون في دالة Submit، تأكد من استخدام نفس المنطق
    console.log("السعر:", price, "العربون:", deposit);
}
    } else {
        console.error("خطأ: اسم الخدمة غير موجود في القائمة أو غير مخزن!");
    }
}
    // ----------------------------

    // باقي الدوال الخاصة بك كما هي...
    if (typeof fetchAndDisplayUserInfo === 'function') fetchAndDisplayUserInfo();
    if (typeof loadUserData === 'function') loadUserData();
    
    // 3. الدوال الخاصة بكل صفحة (نستخدم هنا متغير path المعرف في الأعلى)
    // 3. الدوال الخاصة بكل صفحة
// لاحظ أننا استبدلنا (path) بـ (window.location.pathname) مباشرة
if (window.location.pathname.includes('admin-dashboard.html')) {
    if (typeof loadAdminOrders === 'function') loadAdminOrders();
    if (typeof loadExpertRequests === 'function') loadExpertRequests();
    if (typeof loadFeedback === 'function') loadFeedback();
}

if (window.location.pathname.includes('client-dashboard.html')) {
    if (typeof loadClientOrders === 'function') loadClientOrders();
}

if (window.location.pathname.includes('experts.html') || window.location.pathname.includes('service.html')) {
    if (typeof loadExpertsList === 'function') loadExpertsList();
}



// [هنا ضع باقي الدوال الخاصة بك: handleFormSubmit, gatherFormData, loadClientOrders, etc...]
// (بما أن الكود طويل، احتفظ بالدوال التي أرسلتها من رقم 2 إلى 17 كما هي في أسفل هذا الملف)

/**
 * 2. مدير الطلبات (Request Handler)
 */
async function handleFormSubmit(e, type) {
    // 1. منع الحدث الافتراضي لمنع إعادة تحميل الصفحة
    e.preventDefault(); 
    e.stopImmediatePropagation(); 

    console.log("محاولة إرسال نموذج من نوع:", type);

    // 2. جمع البيانات
    const formData = gatherFormData(type);
    
    // 3. التحقق (إذا كان تسجيل)
    if (type === 'register' && !validateForm(formData)) {
        console.warn("فشل التحقق من البيانات");
        return; 
    }
    
    // 4. إرسال الطلب
    try {
        const response = await fetch(`http://localhost:3000/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        // 5. قراءة الرد
        const data = await response.json();

        if (response.ok) {
            handleSuccess(type, data);
        } else {
            alert(data.error || 'حدث خطأ في السيرفر');
        }
    } catch (error) {
        // إذا ظهر هذا التنبيه، فالمشكلة في عنوان السيرفر أو أن السيرفر متوقف
        console.error("خطأ في الاتصال بالسيرفر:", error);
        alert("لا يمكن الاتصال بالسيرفر. يرجى التأكد من تشغيل Node.js على المنفذ 3000.");
    }
}

/**
 * وحدة التحقق من المدخلات (Validation Module)
 */
function validateForm(data) {
    // 1. التحقق من تطابق كلمات المرور (إذا كانت الحقول موجودة)
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) { 
        alert('خطأ: كلمة المرور غير متطابقة!'); return false; 
    }
    
    // 2. التحقق من طول كلمة المرور
    if (password && password.length < 6) { 
        alert('كلمة المرور يجب أن تكون 6 خانات على الأقل.'); return false; 
    }

    // 3. التحقق من رقم الهاتف
    if (data.phone && !/^\d{10}$/.test(data.phone)) { 
        alert('يرجى إدخال رقم هاتف صحيح مكون من 10 أرقام.'); return false; 
    }

    // 4. التحقق من كود المدير
    if (data.role === 'admin' && !data.adminCode) { 
        alert('يجب إدخال كود المدير!'); return false; 
    }

    // --- هنا التعديل الجوهري ---
    // لا نتحقق من رقم البطاقة إلا إذا كنا في صفحة ملء بيانات الخدمة
    const cardNumberEl = document.getElementById('cardNumber');
    if (cardNumberEl) {
        const cardNumber = cardNumberEl.value.replace(/\s+/g, '');
        if (cardNumber.length !== 16 || isNaN(cardNumber)) {
            alert('خطأ: رقم البطاقة يجب أن يتكون من 16 رقماً صحيحاً.');
            return false;
        }
    }

    return true;
}
/**
 * 3. وحدة جمع البيانات (Data Collector)
 */
function gatherFormData(type) {
    if (type === 'login') return { email: document.getElementById('email').value, password: document.getElementById('password').value, role: document.getElementById('loginType').value, idNumber: document.getElementById('idNumber').value };
    else if (type === 'add-expert') return { name: document.getElementById('name').value, specialty: document.getElementById('specialization').value, license_number: document.getElementById('license_number').value, bio: document.getElementById('bio').value };
    else return { name: document.getElementById('fullName').value, phone: document.getElementById('phone').value, email: document.getElementById('email').value, role: document.getElementById('userType').value, password: document.getElementById('password').value, adminCode: document.getElementById('adminCode')?.value || "", idNumber: document.getElementById('idNumber').value };
}

/**
 * 4. حماية الصفحات والبيانات المتقدمة
 */
function protectPage(allowedRoles = []) {
    const userRole = localStorage.getItem('userRole');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn !== 'true' || !userRole) { alert('يرجى تسجيل الدخول أولاً!'); window.location.href = 'login.html'; return; }
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) { alert('ليس لديك صلاحية!'); window.location.href = 'index.html'; }
}

async function fetchAndDisplayUserInfo() {
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const email = localStorage.getItem('userEmail');
    if (!userNameElement || !email) return;
    try {
        const response = await fetch(`http://localhost:3000/user-info?email=${encodeURIComponent(email)}`);
        if (!response.ok) return;
        const user = await response.json();
        userNameElement.innerText = user.name || "مستخدم";
        if (userRoleElement) userRoleElement.innerText = user.role || "غير محدد";
    } catch (error) { console.error("خطأ:", error); }
}

async function fetchAdminStats() {
    try {
        const response = await fetch('http://localhost:3000/admin-stats');
        const data = await response.json();
        const element = document.getElementById('userCount');
        if (element) element.innerText = data.totalUsers;
    } catch (err) { console.error("خطأ في جلب الإحصائيات"); }
}

/**
 * 5. وحدة النجاح والتوجيه (المعدلة للمسار الصحيح)
 */
function handleSuccess(type, data) {
    if (type === 'login') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userEmail', data.email);
        localStorage.setItem('userName', data.name || "مستخدم");
        
        alert('تم تسجيل الدخول بنجاح!');

        // منطق التوجيه الذكي للمسار المطلوب
        const pendingService = sessionStorage.getItem('selectedServiceName');
        if (pendingService && data.role === 'company') {
            window.location.href = 'fill-service-data.html';
        } else {
            window.location.href = (data.role === 'company') ? 'client-dashboard.html' : data.role + '-dashboard.html';
        }
    } else if (type === 'register') {
        alert('تم التسجيل بنجاح!');
        window.location.href = 'login.html';
    } else if (type === 'add-expert') {
        alert('تم إضافة الخبير بنجاح!');
        window.location.href = 'experts.html';
    }
}

/**
 * 6. وظائف الواجهة (UI Helpers)
 */
function toggleFields() {
    const userType = document.getElementById('userType')?.value;
    const adminGroup = document.getElementById('adminCodeGroup');
    const idLabel = document.getElementById('idLabel');
    if (adminGroup) adminGroup.style.display = (userType === 'admin') ? 'block' : 'none';
    if (idLabel) idLabel.innerText = (userType === 'company') ? 'رقم السجل التجاري' : 'رقم التعريف الوطني';
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.style.display = 'none');
    const target = document.getElementById(sectionId);
    if (target) target.style.display = 'block';
}

/**
 * 8. منطق زر "طلب الخدمة" مع نظام التفرع الذكي
 */
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('service-request-btn')) {
        e.preventDefault();
        
        // 1. استخراج اسم الخدمة من الزر وحفظه في sessionStorage
        const serviceName = e.target.getAttribute('data-service-name');
        if (serviceName) {
            sessionStorage.setItem('selectedServiceName', serviceName);
        }
        
        // 2. إذا كان المستخدم مسجلاً بالفعل، نوجهه لملء البيانات مباشرة
        if (localStorage.getItem('isLoggedIn') === 'true') {
            // نستخدم المسار المطلق لضمان عدم حدوث خطأ 404
            window.location.href = '/fill-service-data.html';
            return;
        }

        // 3. إذا لم يكن مسجلاً، نسأله السؤال الذكي
        const wantsToJoinAsExpert = confirm("هل تود التسجيل كخبير/محكم في منصتنا؟\n\n- اضغط 'موافق' للذهاب لصفحة تسجيل الخبراء.\n- اضغط 'إلغاء' للتسجيل كعميل عادي.");

        if (wantsToJoinAsExpert) {
            window.location.href = '/register-expert.html';
        } else {
            window.location.href = '/register.html';
        }
    }
});


/**
 * 9. معالجة نموذج طلب الخدمة المطور (تحديث لإضافة السعر)
 */
document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'secureServiceOrderForm') {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('serviceType', document.getElementById('serviceTypeInput').value);
        formData.append('clientName', document.getElementById('clientName').value);
        formData.append('requestDetails', document.getElementById('requestDetails').value);
        formData.append('userEmail', localStorage.getItem('userEmail'));
        formData.append('cardNumber', document.getElementById('cardNumber').value);
        
        // هنا نقوم بجلب السعر من الخانة الجديدة
       // داخل دالة document.addEventListener('submit', ...)
// بدلاً من جعل العربون يساوي السعر، استخدم الحساب:

const price = parseInt(document.getElementById('servicePrice').value);
const depositAmount = Math.round(price / 3); // حساب ثلث السعر

formData.append('price', price);
formData.append('depositAmount', depositAmount); // إرسال الثلث للسيرفر
        
        const fileInput = document.getElementById('serviceFiles');
        if (fileInput && fileInput.files.length > 0) {
            for (let i = 0; i < fileInput.files.length; i++) { 
                formData.append('attachments', fileInput.files[i]); 
            }
        }

        try {
            const response = await fetch('http://localhost:3000/submit-service-order', { 
                method: 'POST', 
                body: formData 
            });
            
            if (response.ok) {
                alert('تم تقديم طلبك بنجاح!');
                sessionStorage.removeItem('selectedServiceName');
                window.location.href = 'client-dashboard.html';
            } else {
                const errorData = await response.json();
                alert('خطأ: ' + (errorData.message || 'فشل تقديم الطلب'));
            }
        } catch (error) { 
            alert("خطأ في الاتصال بالسيرفر"); 
        }
    }
});


/**
 * 10. وظائف جلب البيانات (اسم المستخدم)
 */
async function loadUserData() {
    const nameElement = document.getElementById('expertName');
    if (!nameElement) return;
    const savedName = localStorage.getItem('userName');
    if (savedName && savedName !== 'undefined') nameElement.textContent = savedName;
}

/**
 * 11. جلب وعرض الخبراء ديناميكياً (تصميم احترافي متناسق)
 */
async function loadExpertsList() {
    const container = document.getElementById('expertsContainer') || document.querySelector('.experts-grid');
    if (!container) return;

    try {
        const response = await fetch('http://localhost:3000/get-experts');
        if (!response.ok) return;
        const experts = await response.json();

        // إعداد الحاوية
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
        container.style.gap = '25px';
        container.style.padding = '20px';

        if (experts.length > 0) {
            container.innerHTML = experts.map(exp => {
                const expertPhotoUrl = `/assets/photos/${exp.name}.jpg`;
                const defaultPhotoUrl = `/assets/photos/default.jpg`;
                
                return `
                    <div class="expert-card" style="
                        background: #ffffff;
                        border-radius: 20px;
                        padding: 30px;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                        text-align: center;
                        transition: all 0.3s ease;
                        border-top: 5px solid #2b6cb0; /* لون الهوية الأساسي */
                    " onmouseover="this.style.boxShadow='0 15px 30px rgba(43,108,176,0.15)'" onmouseout="this.style.boxShadow='0 4px 15px rgba(0,0,0,0.05)'">
                        
                        <img src="${expertPhotoUrl}" 
                             onerror="this.onerror=null; this.src='${defaultPhotoUrl}';" 
                             style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 3px solid #f7fafc; margin-bottom: 20px;">
                        
                        <h3 style="color: #1a202c; margin: 0 0 10px 0; font-size: 1.4rem;">${exp.name}</h3>
                        
                        <div style="background: #f7fafc; color: #4a5568; padding: 6px 16px; border-radius: 50px; display: inline-block; font-size: 0.85rem; font-weight: 600; margin-bottom: 15px; border: 1px solid #e2e8f0;">
                            ${exp.specialty}
                        </div>
                        
                        <p style="color: #718096; font-size: 0.95rem; line-height: 1.6; margin-bottom: 25px; min-height: 50px;">
                            ${exp.bio || 'خبير استشاري معتمد لدى منصتنا.'}
                        </p>
                        
                        <button onclick="alert('جاري التحويل لمراسلة ${exp.name}...')" style="
                            background: #2b6cb0; 
                            color: #ffffff; 
                            border: none; 
                            padding: 12px 25px; 
                            border-radius: 10px; 
                            cursor: pointer; 
                            width: 100%; 
                            font-weight: bold;
                            transition: background 0.3s ease;
                        " onmouseover="this.style.backgroundColor='#1e4e8c'" onmouseout="this.style.backgroundColor='#2b6cb0'">
                            طلب استشارة
                        </button>
                    </div>
                `;
            }).join('');
        }
    } catch (err) {
        console.error("خطأ:", err);
    }
}

/**
 * 12. جلب وعرض طلبات الخدمة الخاصة بالعميل (بتصميم مطور)
 */
async function loadClientOrders() {
    const container = document.getElementById('clientOrdersTableBody');
    if (!container) return;

    const email = localStorage.getItem('userEmail');
    try {
        const response = await fetch(`http://localhost:3000/get-client-orders?email=${encodeURIComponent(email)}`);
        const orders = await response.json();
        
        if (orders.length === 0) {
            container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">لا توجد طلبات حالياً.</td></tr>`;
            return;
        }

      container.innerHTML = orders.map(order => {
            // تنسيق التاريخ (إذا كان متاحاً في كائن الطلب)
            const date = order.created_at ? new Date(order.created_at).toLocaleDateString('ar-DZ') : '---';
            
            return `
                <tr>
                    <td>#${order.id}</td>
                    <td>${order.service_type}</td>
                    <td style="color: #666;">${order.request_details ? order.request_details.substring(0, 40) : ''}...</td>
                    <td style="font-weight: bold; color: #2b6cb0;">${order.deposit_amount} دج</td>
                    <td style="color: #718096;">${date}</td>
                </tr>
            `;

        }).join('');
    } catch (err) { console.error("خطأ في جلب طلبات العميل:", err); }
}

/**
 * 13. جلب وعرض كافة طلبات النظام لمدير المنصة (بتصميم لوحة تحكم متقدمة)
 */
async function loadAdminOrders() {
    const container = document.getElementById('adminOrdersTableBody');
    if (!container) return;

    try {
        const response = await fetch('http://localhost:3000/get-all-orders');
        const orders = await response.json();
        
        container.innerHTML = orders.map(order => {
            // تجهيز رابط الملفات
            const fileLink = order.attachments 
                ? `<a href="http://localhost:3000/uploads/${order.attachments.split(',')[0]}" target="_blank" style="color: #007bff; text-decoration:none; font-weight:bold;">📄 عرض</a>` 
                : '<span style="color:#ccc;">لا يوجد</span>';

            // الترتيب: رقم، مقدم، نوع، تفاصيل، مستندات، رسوم، حالة
            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 15px;">#${order.id}</td>
                    <td>
                        <div style="font-weight:bold;">${order.client_name}</div>
                        <small style="color: #888;">${order.user_email}</small>
                    </td>
                    <td>${order.service_type}</td>
                    <td style="color: #666;">${order.request_details ? order.request_details.substring(0, 30) : ''}...</td>
                    <td>${fileLink}</td>
                    <td style="font-weight: bold;">${order.deposit_amount} DA</td>
                    <td>
                        <select onchange="updateOrderStatus(${order.id}, this.value)" style="padding: 5px; border-radius: 5px; border: 1px solid #ddd;">
                            <option value="قيد المراجعة" ${order.status === 'قيد المراجعة' ? 'selected' : ''}>قيد المراجعة</option>
                            <option value="تم القبول" ${order.status === 'تم القبول' ? 'selected' : ''}>تم القبول</option>
                            <option value="مكتمل" ${order.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                        </select>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) { console.error("خطأ في جلب طلبات المدير:", err); }
}

/**
 * وظيفة إضافية: تحديث الحالة (اختياري لتطوير النظام)
 */
async function updateOrderStatus(orderId, newStatus) {
    try {
        await fetch('http://localhost:3000/update-order-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: orderId, status: newStatus })
        });
        alert('تم تحديث حالة الطلب بنجاح');
    } catch (err) { alert('خطأ في التحديث'); }
}
/**
 * 14. تقديم طلب انضمام كخبير (من لوحة تحكم الخبير)
 */
async function submitExpertRequest() {
    const email = localStorage.getItem('userEmail');
    const expertName = localStorage.getItem('userName');

    try {
        const response = await fetch('http://localhost:3000/submit-expert-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, expertName })
        });
        
        if (response.ok) {
            alert('تم إرسال طلب الانضمام للمدير، بانتظار الموافقة.');
        } else {
            alert('حدث خطأ، ربما سبق وقمت بتقديم طلب.');
        }
    } catch (err) {
        console.error(err);
    }
}
/**
 * 15. جلب طلبات الانضمام مع عرض كامل للبيانات (للمدير)
 */
async function loadExpertRequests() {
    const container = document.getElementById('expertRequestsTableBody');
    if (!container) return;

    try {
        const response = await fetch('http://localhost:3000/get-expert-requests');
        const requests = await response.json();

        container.innerHTML = requests.map(req => `
            <tr style="border-bottom: 1px solid #ddd;">
                <td><strong>${req.expert_name}</strong></td>
                <td>${req.email}</td>
                <td>${req.specialty || 'غير محدد'}</td>
                <td><a href="/uploads/${req.cv_file}" target="_blank">📄 تحميل ملف الخبرة</a></td>
                <td>
                    <button onclick="approveExpert(${req.id}, '${req.email}')" style="background:#28a745; color:white; border:none; padding:5px 10px; cursor:pointer;">قبول الخبير</button>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}
// استبدل الدالة رقم 16 بهذه الصيغة التي تربط الإجراء بالقبول الفعلي
async function approveExpert(requestId, email) {
    try {
        const response = await fetch('http://localhost:3000/approve-expert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, email })
        });
        
        if (response.ok) {
            alert('تم قبول الخبير وترقيته بنجاح!');
            loadExpertRequests(); // تحديث الجدول فوراً
        } else {
            alert('حدث خطأ أثناء الترقية.');
        }
    } catch (err) {
        console.error(err);
    }
}
/**
 * 17. جلب رسائل التواصل (للمدير)
 */
async function loadFeedback() {
    const container = document.getElementById('feedbackTableBody');
    if (!container) return;

    try {
        const response = await fetch('http://localhost:3000/get-feedback');
        if (!response.ok) throw new Error('فشل الاتصال');
        
        const feedbackList = await response.json();
        
        container.innerHTML = feedbackList.map(item => `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px;">${item.rating || 0} نجوم</td>
                <td>${item.service_feedback || ''}</td>
                <td>${item.suggestions || 'لا يوجد'}</td>
                <td>${item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</td>
            </tr>
        `).join('');
    } catch (err) { 
        console.error("خطأ في جلب التقييمات:", err); 
    }
}
// أضف هذا الجزء في نهاية ملف السكربت، تأكد من عدم وضعه داخل أي دالة أخرى
document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.getElementById('registerForm');
    
    if (regForm) {
        regForm.addEventListener('submit', (e) => {
            console.log("تم اعتراض عملية الإرسال بنجاح!"); // للتأكد أننا أمسكنا بالنموذج
            handleFormSubmit(e, 'register');
        });
    }
});
