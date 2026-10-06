// ==========================================
// j.js - لوحة تحكم الأدمن (محدثة ومضمونة 100%)
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyCY-sv8z7YIDxUMF47ie2ZXi6xxykEYvWs",
  authDomain: "cashier-app-9e18a.firebaseapp.com",
  databaseURL: "https://cashier-app-9e18a-default-rtdb.firebaseio.com",
  projectId: "cashier-app-9e18a",
  storageBucket: "cashier-app-9e18a.firebasestorage.app",
  messagingSenderId: "337011631813",
  appId: "1:337011631813:web:7ce04255b1a8abc1dbb2ac",
  measurementId: "G-6RRGZRPW24"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
  listenToData();
});

// التنقل بين الأقسام
function showSection(sectionId) {
  document.getElementById('sec-clients').style.display = sectionId === 'clients' ? 'block' : 'none';
  document.getElementById('sec-requests').style.display = sectionId === 'requests' ? 'block' : 'none';
  document.getElementById('sec-banner').style.display = sectionId === 'banner' ? 'block' : 'none';
}

function toggleClientDropdown() {
  const target = document.getElementById('banner-target').value;
  document.getElementById('client-select-group').style.display = target === 'SPECIFIC' ? 'block' : 'none';
}

// الاستماع اللحظي لقاعدة البيانات
function listenToData() {
  db.ref('saas_data').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    renderClients(data.clients || {});
    renderRequests(data.requests || {});
    renderBanners(data.banners || {});
  });
}

// 1. إضافة عميل جديد
function addClient() {
  const name = document.getElementById('client-name').value.trim();
  const code = document.getElementById('client-code').value.trim().toUpperCase();
  const days = parseInt(document.getElementById('client-plan').value);

  if (!name || !code) {
    alert("يرجى إدخال اسم العميل وكود الجهاز!");
    return;
  }

  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const clientData = {
    name: name,
    code: code,
    endDate: endDate.toLocaleDateString('ar-EG'),
    endTimestamp: endDate.getTime(),
    status: 'active'
  };

  // الحفظ بمفتاح فريد باستخدام الكود نفسه
  db.ref(`saas_data/clients/${code}`).set(clientData)
    .then(() => {
      alert("تمت إضافة العميل وتفعيل الاشتراك بنجاح!");
      document.getElementById('client-name').value = '';
      document.getElementById('client-code').value = '';
    })
    .catch((err) => alert("خطأ في الإضافة: " + err.message));
}

// عرض قائمة العملاء
function renderClients(clientsObj) {
  const tbody = document.getElementById('clients-list');
  const dropdown = document.getElementById('banner-client-select');
  tbody.innerHTML = '';
  dropdown.innerHTML = '';

  const keys = Object.keys(clientsObj);
  if (keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا يوجد مشتركين حالياً</td></tr>';
    return;
  }

  const now = Date.now();

  keys.forEach((code) => {
    const client = clientsObj[code];
    const isExpired = now > client.endTimestamp;

    // إضافة الخيار إلى القائمة المنسدلة للرسائل
    const opt = document.createElement('option');
    opt.value = client.code;
    opt.textContent = `${client.name} (${client.code})`;
    dropdown.appendChild(opt);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${client.code}</b></td>
      <td>${client.name}</td>
      <td>${client.endDate}</td>
      <td>
        <span style="color: ${isExpired ? '#ff4d4d' : '#28a745'}; font-weight: bold;">
          ${isExpired ? 'منتهي' : 'نشط'}
        </span>
      </td>
      <td>
        <button onclick="extendSubscription('${client.code}', 30)" style="padding: 4px 8px; background: #28a745; color:#fff; border:none; border-radius:4px; cursor:pointer;">+30 يوم</button>
        <button onclick="deleteClient('${client.code}')" style="padding: 4px 8px; background: #dc3545; color:#fff; border:none; border-radius:4px; cursor:pointer; margin-right:4px;">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// تمديد اشتراك العميل
function extendSubscription(code, addDays) {
  db.ref(`saas_data/clients/${code}`).once('value').then((snap) => {
    const client = snap.val();
    if (!client) return;

    const currentEnd = Math.max(Date.now(), client.endTimestamp || 0);
    const newEnd = new Date(currentEnd + addDays * 24 * 60 * 60 * 1000);

    db.ref(`saas_data/clients/${code}`).update({
      endDate: newEnd.toLocaleDateString('ar-EG'),
      endTimestamp: newEnd.getTime()
    }).then(() => alert(`تم تمديد اشتراك العميل ${code} بنجاح!`));
  });
}

// حذف عميل
function deleteClient(code) {
  if (confirm(`هل أنت تأكد من حذف العميل ${code}؟`)) {
    db.ref(`saas_data/clients/${code}`).remove();
  }
}

// 2. عرض طلبات التجديد
function renderRequests(reqObj) {
  const tbody = document.getElementById('requests-list');
  tbody.innerHTML = '';

  const keys = Object.keys(reqObj);
  if (keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">لا توجد طلبات جديدة</td></tr>';
    return;
  }

  keys.forEach((key) => {
    const req = reqObj[key];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${req.clientName} (${req.clientCode})</td>
      <td>${req.planName}</td>
      <td>${req.date}</td>
      <td>
        <button onclick="approveRequest('${key}', '${req.clientCode}', ${req.days})" style="padding: 4px 8px; background: #28a745; color:#fff; border:none; border-radius:4px; cursor:pointer;">موافقة وتفعيل</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function approveRequest(reqKey, clientCode, days) {
  extendSubscription(clientCode, days);
  db.ref(`saas_data/requests/${reqKey}`).remove();
}

// 3. نشر الرسائل الدعائية
function sendBannerMessage() {
  const text = document.getElementById('banner-text').value.trim();
  const target = document.getElementById('banner-target').value;
  const clientCode = target === 'SPECIFIC' ? document.getElementById('banner-client-select').value : 'ALL';

  if (!text) {
    alert("يرجى كتابة نص الإعلان!");
    return;
  }

  db.ref('saas_data/banners').push({
    text: text,
    target: target,
    clientCode: clientCode,
    date: new Date().toLocaleDateString('ar-EG'),
    timestamp: Date.now()
  }).then(() => {
    alert("تم نشر الإعلان بنجاح!");
    document.getElementById('banner-text').value = '';
  });
}

// عرض الإعلانات النشطة
function renderBanners(bannersObj) {
  const tbody = document.getElementById('banners-list');
  tbody.innerHTML = '';

  const keys = Object.keys(bannersObj);
  if (keys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">لا توجد إعلانات نشطة</td></tr>';
    return;
  }

  keys.forEach((key) => {
    const b = bannersObj[key];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.target === 'ALL' ? 'الجميع' : b.clientCode}</td>
      <td>${b.text}</td>
      <td>${b.date}</td>
      <td>
        <button onclick="deleteBanner('${key}')" style="padding: 4px 8px; background: #dc3545; color:#fff; border:none; border-radius:4px; cursor:pointer;">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteBanner(key) {
  db.ref(`saas_data/banners/${key}`).remove();
}
