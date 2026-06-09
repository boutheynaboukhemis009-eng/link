/**
 * 1. تهيئة الأحداث (Event Listeners) وحماية الصفحات
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // حماية صفحات الداشبورد
    const currentPath = window.location.pathname;
    const isLoggedIn = localStorage.getItem('isLoggedIn'); 

    if (currentPath.includes('-dashboard.html')) {
        if (isLoggedIn !== 'true') {
            alert('يرجى تسجيل الدخول أولاً للوصول إلى لوحة التحكم!');
            window.location.href = 'login.html'; 
            return; 
        }
    }

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const applyNowBtn = document.getElementById('applyNowBtn'); 

    if (loginForm) loginForm.addEventListener('submit', (e) => handleFormSubmit(e, 'login'));
    if (registerForm) registerForm.addEventListener('submit', (e) => handleFormSubmit(e, 'register'));
    
    const addExpertForm = document.getElementById('addExpertForm');
    if (addExpertForm) addExpertForm.addEventListener('submit', (e) => handleFormSubmit(e, 'add-expert'));

    // ربط حدث زر تسجيل الخروج بشكل آمن ومحدد
   // استهداف كافة الأزرار التي تحمل كلاس logout-btn
document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // مسح بيانات الجلسة بالكامل
        localStorage.clear();
        sessionStorage.clear();

        alert('تم تسجيل الخروج بنجاح.');
        
        // التوجيه إلى الصفحة الرئيسية
        window.location.href = 'index.html';
    });
});

    const serviceTypeInput = document.getElementById('serviceTypeInput');
    if (serviceTypeInput) {
        const selectedService = sessionStorage.getItem('selectedServiceName');
        if (selectedService) {
            serviceTypeInput.value = selectedService; 
        } else if (currentPath.includes('fill-service-data.html')) {
            alert('يرجى اختيار خدمة أولاً');
            window.location.href = "/service.html";
        }
    }

    if (applyNowBtn) {
        applyNowBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const userRole = localStorage.getItem('userRole'); 

            if (localStorage.getItem('isLoggedIn') !== 'true') {
                window.location.href = 'register.html';
            } else {
                switch (userRole) {
                    case 'admin': window.location.href = 'admin-dashboard.html'; break;
                    case 'company': window.location.href = 'client-dashboard.html'; break;
                    case 'expert': window.location.href = 'expert-dashboard.html'; break;
                    default: window.location.href = 'login.html'; break;
                }
            }
        });
    }

    fetchAndDisplayUserInfo();
    loadUserData();
    loadExpertsList();
    loadClientOrders();
    loadAdminOrders();
    loadExpertRequests();
    const feedbackForm = document.getElementById('feedbackForm');
    
    if (feedbackForm) { // هذا الشرط يمنع ظهور خطأ null
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // جلب البيانات
            const data = {
                rating: document.getElementById('rating').value,
                serviceFeedback: document.getElementById('serviceFeedback').value,
                suggestions: document.getElementById('suggestions').value
            };

            // إرسال البيانات
            const response = await fetch('http://localhost:3000/submit-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                alert('شكراً لك على تقييمك ومساهمتك في تطوير المنصة!');
                feedbackForm.reset();
            }
        });
    }
    if (typeof loadContactMessages === 'function') {
        loadContactMessages();
    }
    if (typeof loadFeedback === 'function') {
        loadFeedback();
    }
});

/**
 * 2. مدير الطلبات (Request Handler)
 */
async function handleFormSubmit(e, type) {
    e.preventDefault();
    const formData = gatherFormData(type);
    if (type === 'register' && !validateForm(formData)) return;
    
    try {
        const response = await fetch(`http://localhost:3000/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            handleSuccess(type, data);
        } else {
            alert(data.error || 'حدث خطأ ما');
        }
    } catch (error) {
        console.error("خطأ في الاتصال بالسيرفر:", error);
        alert("لا يمكن الاتصال بالسيرفر.");
    }
}

/**
 * وحدة التحقق من المدخلات (Validation Module)
 */
function validateForm(data) {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (password !== confirmPassword) { alert('خطأ: كلمة المرور غير متطابقة!'); return false; }
    if (password.length < 6) { alert('كلمة المرور يجب أن تكون 6 خانات على الأقل.'); return false; }
    if (data.phone && !/^\d{10}$/.test(data.phone)) { alert('يرجى إدخال رقم هاتف صحيح مكون من 10 أرقام.'); return false; }
    if (data.role === 'admin' && !data.adminCode) { alert('يجب إدخال كود المدير!'); return false; }
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
 * 9. معالجة نموذج طلب الخدمة المطور
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
        formData.append('depositAmount', '250'); 
        const fileInput = document.getElementById('serviceFiles');
        if (fileInput && fileInput.files.length > 0) {
            for (let i = 0; i < fileInput.files.length; i++) { formData.append('attachments', fileInput.files[i]); }
        }
        try {
            const response = await fetch('http://localhost:3000/submit-service-order', { method: 'POST', body: formData });
            if (response.ok) {
                alert('تم تقديم الطلب بنجاح.');
                sessionStorage.removeItem('selectedServiceName');
                window.location.href = 'client-dashboard.html';
            }
        } catch (error) { alert("خطأ في الاتصال"); }
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
            // منطق تلوين حالة الطلب
            const statusColor = order.status === 'مكتمل' ? '#28a745' : '#ffc107';
            return `
                <tr style="transition: background 0.3s;">
                    <td style="padding: 15px;">#${order.id}</td>
                    <td style="font-weight:600;">${order.service_type}</td>
                    <td style="color: #666;">${order.request_details.substring(0, 40)}...</td>
                    <td><span style="background:${statusColor}22; color:${statusColor}; padding:5px 10px; border-radius:15px; font-size:0.85em; font-weight:bold;">${order.status || 'قيد المراجعة'}</span></td>
                    <td style="color: #007bff; font-weight: bold;">${order.deposit_amount} DA</td>
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
            const fileLink = order.attachments 
                ? `<a href="http://localhost:3000/uploads/${order.attachments.split(',')[0]}" target="_blank" style="color: #007bff; text-decoration:none; font-weight:bold;">📄 عرض الملف</a>` 
                : '<span style="color:#ccc;">لا يوجد</span>';

            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 15px;">#${order.id}</td>
                    <td>
                        <div style="font-weight:bold;">${order.client_name}</div>
                        <small style="color: #888;">${order.user_email}</small>
                    </td>
                    <td>${order.service_type}</td>
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