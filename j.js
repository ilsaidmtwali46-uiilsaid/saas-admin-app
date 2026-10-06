// ==========================================
// j.js - الأدمن مع ربط Firebase Realtime DB
// ==========================================

// إعدادات Firebase (استبدل القيم ببيانات مشروعك في Firebase)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// تهيئة Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let clients = [];
let requests = [];
let banners = [];

document.addEventListener('DOMContentLoaded', () => {
  listenToDatabase();
});

function listenToDatabase() {
  // الاستماع المباشر للتغيرات من السحابة
  db.ref('saas_data').on('value', (snapshot) => {
    const data = snapshot.val() || {};
    clients = data.clients || [];
    requests = data.requests || [];
    banners = data.banners || [];

    renderClients();
    renderRequests();
    renderBanners();
    updateClientDropdown();
  });
}

function syncToCloud() {
  db.ref('saas_data').set({
    clients: clients,
    requests: requests,
    banners: banners
  });
}

function showSection(sec) {
  document.getElementById('sec-clients').style.display = 'none';
  document.getElementById('sec-requests').style.display = 'none';
  document.getElementById('sec-banner').style.display = 'none';

  if (sec === 'clients') document.getElementById('sec-clients').style.display = 'block';
  if (sec === 'requests') document.getElementById('sec-requests').style.display = 'block';
  if (sec === 'banner') document.getElementById('sec-banner').style.display = 'block';
}

// إضافة وتجديد العميل
function addClient() {
  const name = document.getElementById('client-name').value.trim();
  const code = document.getElementById('client-code').value.trim();
  const days = parseInt(document.getElementById('client-plan').value);

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

  document.getElementById('client-name').value = '';
  document.getElementById('client-code').value = '';
  alert('تمت إضافة العميل وتفعيل اشتراكه بنجاح!');
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
  const tbody = document.getElementById('clients-list');
  tbody.innerHTML = '';

  clients.forEach(c => {
    const isExpired = Date.now() > c.endTimestamp;
    const statusText = isExpired ? 'منتهي' : 'نشط';
    const statusColor = isExpired ? 'color: var(--danger)' : 'color: var(--success)';

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
        <button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deleteClient(${c.id})">حذف</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderRequests() {
  const tbody = document.getElementById('requests-list');
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
        <button class="btn btn-success" style="padding:2px 8px; font-size:12px;" onclick="approveRequest(${idx})">تأكيد التجديد</button>
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
  const target = document.getElementById('banner-target').value;
  document.getElementById('client-select-group').style.display = (target === 'SPECIFIC') ? 'flex' : 'none';
}

function updateClientDropdown() {
  const select = document.getElementById('banner-client-select');
  select.innerHTML = '';
  clients.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = `${c.name} (${c.code})`;
    select.appendChild(opt);
  });
}

function sendBannerMessage() {
  const text = document.getElementById('banner-text').value.trim();
  const target = document.getElementById('banner-target').value;
  const clientCode = document.getElementById('banner-client-select').value;

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

  document.getElementById('banner-text').value = '';
  alert('تم نشر الرسالة الدعائية بنجاح!');
}

function deleteBanner(id) {
  banners = banners.filter(b => b.id !== id);
  syncToCloud();
}

function renderBanners() {
  const tbody = document.getElementById('banners-list');
  tbody.innerHTML = '';

  banners.forEach(b => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${b.targetName}</strong></td>
      <td>${b.text}</td>
      <td>${b.date}</td>
      <td><button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deleteBanner(${b.id})">حذف</button></td>
    `;
    tbody.appendChild(row);
  });
}
