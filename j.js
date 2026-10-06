// ==========================================
// j.js - تطبيق الأدمن (Omni Owner Suite)
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

// تهيئة Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
// ربط مباشر برابط قاعدة البيانات
const db = firebase.database();

let clients = [];
let requests = [];
let banners = [];

document.addEventListener('DOMContentLoaded', () => {
  listenToDatabase();
  
  // ربط زر الإضافة بالدالة تلقائياً لتفادي مشاكل HTML
  const addBtn = document.querySelector('.btn-primary, button[onclick="addClient()"]');
  if(addBtn) {
    addBtn.onclick = addClient;
  }
});

// الاستماع المباشر للبيانات من السحابة
function listenToDatabase() {
  db.ref('saas_data').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    clients = data.clients || [];
    requests = data.requests || [];
    banners = data.banners || [];

    renderClients();
    renderRequests();
    renderBanners();
    updateClientDropdown();
  }, (error) => {
    alert("خطأ في الاتصال بقاعدة البيانات: " + error.message);
  });
}

// حفظ البيانات المحدثة في السحابة
function syncToCloud() {
  db.ref('saas_data').set({
    clients: clients,
    requests: requests,
    banners: banners
  }).then(() => {
    console.log("تم الحفظ في السحابة بنجاح!");
  }).catch((err) => {
    alert("فشل الحفظ: " + err.message);
  });
}

function showSection(sec) {
  const sc = document.getElementById('sec-clients');
  const sr = document.getElementById('sec-requests');
  const sb = document.getElementById('sec-banner');
  if(sc) sc.style.display = 'none';
  if(sr) sr.style.display = 'none';
  if(sb) sb.style.display = 'none';

  if (sec === 'clients' && sc) sc.style.display = 'block';
  if (sec === 'requests' && sr) sr.style.display = 'block';
  if (sec === 'banner' && sb) sb.style.display = 'block';
}

// إضافة عميل جديد وتفعيل اشتراكه
function addClient() {
  const nameInput = document.getElementById('client-name') || document.querySelectorAll('input[type="text"]')[0];
  const codeInput = document.getElementById('client-code') || document.querySelectorAll('input[type="text"]')[1];
  const planSelect = document.getElementById('client-plan') || document.querySelector('select');

  const name = nameInput ? nameInput.value.trim() : '';
  const code = codeInput ? codeInput.value.trim() : '';
  const days = planSelect ? parseInt(planSelect.value) || 7 : 7;

  if (!name || !code) {
    alert('يرجى كتابة اسم العميل وكود الجهاز!');
    return;
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + days);

  const clientData = {
    id: Date.now(),
    code: code,
    name: name,
    endDate: endDate.toLocaleDateString('ar-EG'),
    endTimestamp: endDate.getTime(),
    status: 'نشط'
  };

  clients.push(clientData);
  syncToCloud();

  if(nameInput) nameInput.value = '';
  if(codeInput) codeInput.value = '';
  alert('تمت إضافة العميل بنجاح ورُفعت البيانات إلى السحابة!');
}

function renewClientSubscription(clientId, addDays) {
  const client = clients.find(c => c.id === clientId);
  if (!client) return;

  let currentEnd = new Date(client.endTimestamp > Date.now() ? client.endTimestamp : Date.now());
  currentEnd.setDate(currentEnd.getDate() + addDays);

  client.endTimestamp = currentEnd.getTime();
  client.endDate = currentEnd.toLocaleDateString('ar-EG');
  client.status = 'نشط';

  syncToCloud();
  alert(`تم تجديد الاشتراك للعميل ${client.name} حتى ${client.endDate}`);
}

function deleteClient(clientId) {
  if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
    clients = clients.filter(c => c.id !== clientId);
    syncToCloud();
  }
}

function renderClients() {
  const tbody = document.getElementById('clients-list') || document.querySelector('tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  clients.forEach(c => {
    const isExpired = Date.now() > c.endTimestamp;
    const statusText = isExpired ? 'منتهي' : 'نشط';
    const statusColor = isExpired ? 'color: red' : 'color: green';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${c.code}</td>
      <td><strong>${c.name}</strong></td>
      <td>${c.endDate}</td>
      <td style="${statusColor}">${statusText}</td>
      <td>
        <select onchange="if(this.value) renewClientSubscription(${c.id}, parseInt(this.value))" style="font-size:11px; padding:2px;">
          <option value="">+ تجديد</option>
          <option value="7">7 أيام</option>
          <option value="30">شهر</option>
          <option value="90">3 أشهر</option>
          <option value="180">6 أشهر</option>
          <option value="365">سنة</option>
        </select>
        <button style="padding:2px 6px; font-size:11px; background:red; color:white; border:none; border-radius:3px;" onclick="deleteClient(${c.id})">حذف</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderRequests() {
  const tbody = document.getElementById('requests-list');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">لا توجد طلبات تجديد حالياً</td></tr>';
    return;
  }

  requests.forEach((req, idx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${req.clientName}</td>
      <td>${req.planName}</td>
      <td>${req.date}</td>
      <td>
        <button style="padding:2px 8px; font-size:12px; background:green; color:white; border:none;" onclick="approveRequest(${idx})">تأكيد التجديد</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function approveRequest(index) {
  const req = requests[index];
  const client = clients.find(c => c.code === req.clientCode);

  if (client) {
    renewClientSubscription(client.id, req.days);
  }

  requests.splice(index, 1);
  syncToCloud();
}

function toggleClientDropdown() {
  const target = document.getElementById('banner-target')?.value;
  const grp = document.getElementById('client-select-group');
  if(grp) grp.style.display = (target === 'SPECIFIC') ? 'flex' : 'none';
}

function updateClientDropdown() {
  const select = document.getElementById('banner-client-select');
  if (!select) return;
  select.innerHTML = '';
  clients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = `${c.name} (${c.code})`;
    select.appendChild(opt);
  });
}

function sendBannerMessage() {
  const textInput = document.getElementById('banner-text');
  const targetSelect = document.getElementById('banner-target');
  const clientSelect = document.getElementById('banner-client-select');

  const text = textInput ? textInput.value.trim() : '';
  const target = targetSelect ? targetSelect.value : 'ALL';
  const clientCode = clientSelect ? clientSelect.value : 'ALL';

  if (!text) {
    alert('يرجى إدخال نص الرسالة الدعائية!');
    return;
  }

  let targetName = 'الجميع';
  if (target === 'SPECIFIC') {
    const targetClient = clients.find(c => c.code === clientCode);
    targetName = targetClient ? targetClient.name : clientCode;
  }

  const newBanner = {
    id: Date.now(),
    text: text,
    target: target,
    clientCode: target === 'SPECIFIC' ? clientCode : 'ALL',
    targetName: targetName,
    date: new Date().toLocaleDateString('ar-EG')
  };

  banners.unshift(newBanner);
  syncToCloud();

  if(textInput) textInput.value = '';
  alert('تم نشر الرسالة الدعائية بنجاح!');
}

function deleteBanner(id) {
  banners = banners.filter(b => b.id !== id);
  syncToCloud();
}

function renderBanners() {
  const tbody = document.getElementById('banners-list');
  if (!tbody) return;
  tbody.innerHTML = '';

  banners.forEach(b => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${b.targetName}</strong></td>
      <td>${b.text}</td>
      <td>${b.date}</td>
      <td><button style="padding:2px 6px; font-size:11px; background:red; color:white; border:none;" onclick="deleteBanner(${b.id})">حذف</button></td>
    `;
    tbody.appendChild(row);
  });
}
