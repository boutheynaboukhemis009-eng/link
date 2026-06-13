// أضف هذا في بداية ملف script.js
// اجعل API_URL فارغاً ليعتمد المتصفح على عنوان الموقع الحالي تلقائياً
const API_URL = ''; 
    ? 'http://localhost:3000' 
    : 'https://link-p08u.onrender.com'; // ضع هنا رابط السيرفر الخاص بك على Render
/**
 * 1. مدير التحميل الذكي (Application Initialization)
 */
function setupEventListeners() {
    const forms = { 
        'loginForm': 'login', 
        'registerForm': 'register', 
        'addExpertForm': 'add-expert' 
    };

    Object.keys(forms).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('submit', (e) => handleFormSubmit(e, forms[id]));
        }
    });

    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.clear(); 
            sessionStorage.clear();
            alert('تم تسجيل الخروج بنجاح.');
            window.location.href = 'index.html';
        });
    });

    const applyNowBtn = document.getElementById('applyNowBtn');
    if (applyNowBtn) {
        applyNowBtn.addEventListener('click', (e) => {
            e.preventDefault();
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

    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', handleFeedbackSubmit);
    }
}

async function initPageLoad() {
    const path = window.location.pathname;

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
        console.log("الاسم المجلوب من التخزين:", serviceName);
        
        const priceInput = document.getElementById('servicePrice');
        const depositDisplay = document.getElementById('depositAmountDisplay');
        
        if (serviceName && servicePrices[serviceName]) {
            const price = servicePrices[serviceName];
            const deposit = Math.round(price / 3); 
            
            if (priceInput) priceInput.value = price;
            if (depositDisplay) depositDisplay.innerText = deposit;
            
            console.log("السعر:", price, "العربون:", deposit);
        } else {
            console.error("خطأ: اسم الخدمة غير موجود في القائمة أو غير مخزن!");
        }
    }

    if (typeof fetchAndDisplayUserInfo === 'function') fetchAndDisplayUserInfo();
    if (typeof loadUserData === 'function') loadUserData();
    
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
}

/**
 * 2. مدير الطلبات (Request Handler)
 */
async function handleFormSubmit(e, type) {
    e.preventDefault(); 
    e.stopImmediatePropagation(); 

    console.log("محاولة إرسال نموذج من نوع:", type);

    const formData = gatherFormData(type);
    
    if (type === 'register' && !validateForm(formData)) {
        console.warn("فشل التحقق من البيانات");
        return; 
    }
    
    try {
       const response = await fetch(`${API_URL}/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            handleSuccess(type, data);
        } else {
            alert(data.error || 'حدث خطأ في السيرفر');
        }
    } catch (error) {
        console.error("خطأ في الاتصال بالسيرفر:", error);
        alert("لا يمكن الاتصال بالسيرفر. يرجى التأكد من تشغيل Node.js على المنفذ 3000.");
    }
}

/**
 * وحدة التحقق من المدخلات (Validation Module)
 */
function validateForm(data) {
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) { 
        alert('خطأ: كلمة المرور غير متطابقة!'); return false; 
    }
    
    if (password && password.length < 6) { 
        alert('كلمة المرور يجب أن تكون 6 خانات على الأقل.'); return false; 
    }

    if (data.phone && !/^\d{10}$/.test(data.phone)) { 
        alert('يرجى إدخال رقم هاتف صحيح مكون من 10 أرقام.'); return false; 
    }

    if (data.role === 'admin' && !data.adminCode) { 
        alert('يجب إدخال كود المدير!'); return false; 
    }

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
        const response = await fetch(`/user-info?email=${encodeURIComponent(email)}`);
        if (!response.ok) return;
        const user = await response.json();
        userNameElement.innerText = user.name || "مستخدم";
        if (userRoleElement) userRoleElement.innerText = user.role || "غير محدد";
    } catch (error) { console.error("خطأ:", error); }
}

async function fetchAdminStats() {
    try {
      const response = await fetch(`${API_URL}/admin-stats`);
        const data = await response.json();
        const element = document.getElementById('userCount');
        if (element) element.innerText = data.totalUsers;
    } catch (err) { console.error("خطأ في جلب الإحصائيات"); }
}

/**
 * 5. وحدة النجاح والتوجيه
 */
function handleSuccess(type, data) {
    if (type === 'login') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userEmail', data.email);
        localStorage.setItem('userName', data.name || "مستخدم");
        
        alert('تم تسجيل الدخول بنجاح!');

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
 * 8. منطق زر "طلب الخدمة"
 */
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('service-request-btn')) {
        e.preventDefault();
        
        const serviceName = e.target.getAttribute('data-service-name');
        if (serviceName) {
            sessionStorage.setItem('selectedServiceName', serviceName);
        }

        // التحقق من مكان وجود المستخدم
        const currentPage = window.location.pathname;
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

        if (isLoggedIn) {
            // الحالة (أ): المستخدم في صفحة الخدمات -> نرسله لملء البيانات
            if (currentPage.includes('services.html') || currentPage.includes('service.html')) {
                window.location.href = 'fill-service-data.html';
            } 
            // الحالة (ب): المستخدم في أي صفحة أخرى (الرئيسية) -> نرسله للداشبورد
            else {
                const userRole = localStorage.getItem('userRole');
                const paths = { 
                    'admin': 'admin-dashboard.html', 
                    'company': 'client-dashboard.html', 
                    'client': 'client-dashboard.html', 
                    'expert': 'expert-dashboard.html' 
                };
                window.location.href = paths[userRole] || 'login.html';
            }
            return;
        }

        // إذا لم يكن مسجلاً للدخول
        const wantsToJoinAsExpert = confirm("هل تود التسجيل كخبير/محكم في منصتنا؟\n\n- 'موافق' لتسجيل الخبراء.\n- 'إلغاء' للتسجيل كعميل عادي.");
        if (wantsToJoinAsExpert) {
            window.location.href = 'register-expert.html';
        } else {
            window.location.href = 'register.html';
        }
    }
});

/**
 * 9. معالجة نموذج طلب الخدمة
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
        
        const price = parseInt(document.getElementById('servicePrice').value);
        const depositAmount = Math.round(price / 3); 

        formData.append('price', price);
        formData.append('depositAmount', depositAmount);
        
        const fileInput = document.getElementById('serviceFiles');
        if (fileInput && fileInput.files.length > 0) {
            for (let i = 0; i < fileInput.files.length; i++) { 
                formData.append('attachments', fileInput.files[i]); 
            }
        }

        try {
           const response = await fetch(`${API_URL}/submit-service-order`, {
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
 * 10. وظائف جلب البيانات
 */
async function loadUserData() {
    const nameElement = document.getElementById('expertName');
    if (!nameElement) return;
    const savedName = localStorage.getItem('userName');
    if (savedName && savedName !== 'undefined') nameElement.textContent = savedName;
}

/**
 * 11. جلب وعرض الخبراء
 */
async function loadExpertsList() {
    const container = document.getElementById('expertsContainer') || document.querySelector('.experts-grid');
    if (!container) return;

    try {
   const response = await fetch(`${API_URL}/get-experts`);
        if (!response.ok) return;
        const experts = await response.json();

        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
        container.style.gap = '25px';
        container.style.padding = '20px';

        if (experts.length > 0) {
            container.innerHTML = experts.map(exp => {
                const expertPhotoUrl = `/assets/photos/${exp.name}.jpg`;
                const defaultPhotoUrl = `/assets/photos/default.jpg`;
                return `
                    <div class="expert-card" style="background: #ffffff; border-radius: 20px; padding: 30px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); text-align: center; transition: all 0.3s ease; border-top: 5px solid #2b6cb0;">
                        <img src="${expertPhotoUrl}" onerror="this.onerror=null; this.src='${defaultPhotoUrl}';" style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 3px solid #f7fafc; margin-bottom: 20px;">
                        <h3 style="color: #1a202c; margin: 0 0 10px 0; font-size: 1.4rem;">${exp.name}</h3>
                        <div style="background: #f7fafc; color: #4a5568; padding: 6px 16px; border-radius: 50px; display: inline-block; font-size: 0.85rem; font-weight: 600; margin-bottom: 15px; border: 1px solid #e2e8f0;">
                            ${exp.specialty}
                        </div>
                        <p style="color: #718096; font-size: 0.95rem; line-height: 1.6; margin-bottom: 25px; min-height: 50px;">
                            ${exp.bio || 'خبير استشاري معتمد لدى منصتنا.'}
                        </p>
                        <button onclick="alert('جاري التحويل لمراسلة ${exp.name}...')" style="background: #2b6cb0; color: #ffffff; border: none; padding: 12px 25px; border-radius: 10px; cursor: pointer; width: 100%; font-weight: bold;">
                            طلب استشارة
                        </button>
                    </div>
                `;
            }).join('');
        }
    } catch (err) { console.error("خطأ:", err); }
}

/**
 * 12. جلب وعرض طلبات العميل
 */
async function loadClientOrders() {
    const container = document.getElementById('clientOrdersTableBody');
    if (!container) return;

    const email = localStorage.getItem('userEmail');
    try {
      const response = await fetch(`${API_URL}/get-client-orders?email=${encodeURIComponent(email)}`);
        const orders = await response.json();
        if (orders.length === 0) {
            container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">لا توجد طلبات حالياً.</td></tr>`;
            return;
        }
        container.innerHTML = orders.map(order => {
            const date = order.created_at ? new Date(order.created_at).toLocaleDateString('ar-DZ') : '---';
            return `<tr><td>#${order.id}</td><td>${order.service_type}</td><td style="color: #666;">${order.request_details ? order.request_details.substring(0, 40) : ''}...</td><td style="font-weight: bold; color: #2b6cb0;">${order.deposit_amount} دج</td><td style="color: #718096;">${date}</td></tr>`;
        }).join('');
    } catch (err) { console.error("خطأ في جلب طلبات العميل:", err); }
}

/**
 * 13. جلب طلبات النظام للمدير
 */
async function loadAdminOrders() {
    const container = document.getElementById('adminOrdersTableBody');
    if (!container) return;
    try {
const response = await fetch(`${API_URL}/get-all-orders`);
        const orders = await response.json();
        container.innerHTML = orders.map(order => {
            const fileLink = order.attachments 
    ? `<a href="${API_URL}/uploads/${order.attachments.split(',')[0]}" target="_blank" style="color: #007bff; text-decoration:none; font-weight:bold;">📄 عرض</a>` 
    : '<span style="color:#ccc;">لا يوجد</span>';
            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 15px;">#${order.id}</td>
                    <td><div style="font-weight:bold;">${order.client_name}</div><small style="color: #888;">${order.user_email}</small></td>
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

async function updateOrderStatus(orderId, newStatus) {
    try {
await fetch(`${API_URL}/update-order-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: orderId, status: newStatus })
        });
        alert('تم تحديث حالة الطلب بنجاح');
    } catch (err) { alert('خطأ في التحديث'); }
}

/**
 * 14. طلب انضمام خبير
 */
async function submitExpertRequest() {
    const email = localStorage.getItem('userEmail');
    const expertName = localStorage.getItem('userName');
    try {
       const response = await fetch(`${API_URL}/submit-expert-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, expertName })
        });
        if (response.ok) { alert('تم إرسال طلب الانضمام للمدير، بانتظار الموافقة.'); } 
        else { alert('حدث خطأ، ربما سبق وقمت بتقديم طلب.'); }
    } catch (err) { console.error(err); }
}

/**
 * 15. جلب طلبات انضمام الخبراء للمدير
 */
async function loadExpertRequests() {
    const container = document.getElementById('expertRequestsTableBody');
    if (!container) return;
    try {
        const response = await fetch(`${API_URL}/get-expert-requests`);
        const requests = await response.json();
        container.innerHTML = requests.map(req => `
            <tr style="border-bottom: 1px solid #ddd;">
                <td><strong>${req.expert_name}</strong></td>
                <td>${req.email}</td>
                <td>${req.specialty || 'غير محدد'}</td>
                <td><a href="/uploads/${req.cv_file}" target="_blank">📄 تحميل ملف الخبرة</a></td>
                <td><button onclick="approveExpert(${req.id}, '${req.email}')" style="background:#28a745; color:white; border:none; padding:5px 10px; cursor:pointer;">قبول الخبير</button></td>
            </tr>
        `).join('');
    } catch (err) { console.error(err); }
}

async function approveExpert(requestId, email) {
    try {
const response = await fetch(`${API_URL}/approve-expert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, email })
        });
        if (response.ok) {
            alert('تم قبول الخبير وترقيته بنجاح!');
            loadExpertRequests();
        } else { alert('حدث خطأ أثناء الترقية.'); }
    } catch (err) { console.error(err); }
}

/**
 * 17. جلب التقييمات للمدير
 */
async function loadFeedback() {
    const container = document.getElementById('feedbackTableBody');
    if (!container) return;
    try {
       const response = await fetch(`${API_URL}/get-feedback`);
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
    } catch (err) { console.error("خطأ في جلب التقييمات:", err); }
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initPageLoad();
    const regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.addEventListener('submit', (e) => {
            console.log("تم اعتراض عملية الإرسال بنجاح!");
            handleFormSubmit(e, 'register');
        });
    }
});
