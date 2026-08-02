/* ===== CONFIG ===== */
const ADMIN_PASSWORD = '12312345'; // ← СМЕНИ ПАРОЛЬ ЗДЕСЬ

const STORAGE_KEYS = {
  info: 'gosha_info_v2',
  reviews: 'gosha_reviews',
  profile: 'gosha_profile_v2',
  admin: 'gosha_admin'
};

/* ===== STATE ===== */
let isAdmin = false;
let infoItems = [];
let reviews = [];
let profile = {
  nickname: 'Гоша Авторитет',
  description: 'Здесь будет твоё описание. Войди как админ и открой «настройки», чтобы изменить.',
  avatar: 'ss.jpg',
  recordId: '0001',
  status: 'ACTIVE',
  statusColor: 'blue'
};

/* ===== UTILS ===== */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 2600);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ===== INIT ===== */
function init() {
  infoItems = load(STORAGE_KEYS.info, []);
  reviews = load(STORAGE_KEYS.reviews, []);
  profile = load(STORAGE_KEYS.profile, profile);
  isAdmin = load(STORAGE_KEYS.admin, false);

  applyProfile();
  renderInfo();
  renderReviews();
  updateStats();
  updateAdminUI();
  bindEvents();
}

/* ===== PROFILE ===== */
function applyProfile() {
  document.getElementById('nickname').textContent = profile.nickname;
  document.getElementById('description').textContent = profile.description;
  document.getElementById('recordId').textContent = profile.recordId || '0001';
  const img = document.getElementById('avatarImg');
  img.src = profile.avatar || 'ss.jpg';
  const badge = document.getElementById('statusBadge');
  badge.textContent = profile.status || 'ACTIVE';
  badge.className = 'status-badge' + (profile.statusColor === 'red' ? ' is-red' : '');
}

function updateStats() {
  document.getElementById('infoCount').textContent = infoItems.length;
  document.getElementById('reviewsCount').textContent = reviews.length;
}

/* ===== RENDER DOSSIER (INFO FIELDS) ===== */
function renderInfo() {
  const grid = document.getElementById('infoGrid');
  const empty = document.getElementById('infoEmpty');

  if (infoItems.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = infoItems.map(item => `
    <div class="info-row" data-id="${item.id}">
      <div class="info-label">${escapeHtml(item.label)}</div>
      <div class="info-value">${escapeHtml(item.value)}</div>
      ${isAdmin ? `<button class="info-del" data-del-info="${item.id}" title="Удалить">×</button>` : ''}
    </div>
  `).join('');

  grid.querySelectorAll('[data-del-info]').forEach(btn => {
    btn.addEventListener('click', () => deleteInfo(btn.dataset.delInfo));
  });
}

function deleteInfo(id) {
  infoItems = infoItems.filter(i => i.id !== id);
  save(STORAGE_KEYS.info, infoItems);
  renderInfo();
  updateStats();
  toast('Запись удалена');
}

/* ===== RENDER REVIEWS ===== */
function renderReviews() {
  const list = document.getElementById('reviewsList');
  const empty = document.getElementById('reviewsEmpty');

  if (reviews.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  list.innerHTML = reviews
    .slice()
    .sort((a, b) => b.created - a.created)
    .map(r => `
      <div class="review-row" data-id="${r.id}">
        <div class="review-head">
          <span class="review-author">${escapeHtml(r.author || 'Аноним')}</span>
          <span class="review-date">${formatDate(r.created)} ${isAdmin ? `<button class="info-del" data-del-review="${r.id}" title="Удалить">×</button>` : ''}</span>
        </div>
        <p class="review-text">${escapeHtml(r.text)}</p>
      </div>
    `)
    .join('');

  list.querySelectorAll('[data-del-review]').forEach(btn => {
    btn.addEventListener('click', () => deleteReview(btn.dataset.delReview));
  });
}

function deleteReview(id) {
  reviews = reviews.filter(r => r.id !== id);
  save(STORAGE_KEYS.reviews, reviews);
  renderReviews();
  updateStats();
  toast('Отзыв удалён');
}

/* ===== ADMIN UI ===== */
function updateAdminUI() {
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });
  document.getElementById('adminLoginBtn').style.display = isAdmin ? 'none' : '';
  renderInfo();
  renderReviews();
}

/* ===== MODAL ===== */
const overlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');

function openModal(html) {
  modalContent.innerHTML = html;
  overlay.classList.add('active');
}
function closeModal() {
  overlay.classList.remove('active');
  setTimeout(() => { modalContent.innerHTML = ''; }, 200);
}
document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

/* ===== FORMS ===== */
function showAddInfoForm() {
  if (!isAdmin) return;
  openModal(`
    <h3 class="modal-title">Новая запись досье</h3>
    <div class="form-group">
      <label class="form-label">Метка (например: Город, Telegram, Род занятий)</label>
      <input class="form-input" id="infoLabel" type="text" placeholder="Метка">
    </div>
    <div class="form-group">
      <label class="form-label">Значение</label>
      <textarea class="form-textarea" id="infoValue" placeholder="Значение"></textarea>
    </div>
    <div class="form-actions">
      <button class="btn" onclick="closeModal()">Отмена</button>
      <button class="btn btn-primary" id="saveInfoBtn">Добавить</button>
    </div>
  `);
  document.getElementById('saveInfoBtn').onclick = () => {
    const label = document.getElementById('infoLabel').value.trim();
    const value = document.getElementById('infoValue').value.trim();
    if (!label || !value) { toast('Заполни оба поля', 'error'); return; }
    infoItems.push({ id: uid(), label, value });
    save(STORAGE_KEYS.info, infoItems);
    renderInfo();
    updateStats();
    closeModal();
    toast('Запись добавлена', 'success');
  };
}

function showReviewForm() {
  openModal(`
    <h3 class="modal-title">Оставить отзыв</h3>
    <div class="form-group">
      <label class="form-label">Твоё имя</label>
      <input class="form-input" id="reviewAuthor" type="text" placeholder="Как тебя зовут?">
    </div>
    <div class="form-group">
      <label class="form-label">Отзыв</label>
      <textarea class="form-textarea" id="reviewText" placeholder="Что думаешь?"></textarea>
    </div>
    <div class="form-actions">
      <button class="btn" onclick="closeModal()">Отмена</button>
      <button class="btn btn-primary" id="saveReviewBtn">Отправить</button>
    </div>
  `);
  document.getElementById('saveReviewBtn').onclick = () => {
    const author = document.getElementById('reviewAuthor').value.trim() || 'Аноним';
    const text = document.getElementById('reviewText').value.trim();
    if (!text) { toast('Напиши отзыв', 'error'); return; }
    reviews.push({ id: uid(), author, text, created: Date.now() });
    save(STORAGE_KEYS.reviews, reviews);
    renderReviews();
    updateStats();
    closeModal();
    toast('Спасибо за отзыв', 'success');
  };
}

function showSettingsForm() {
  if (!isAdmin) return;
  openModal(`
    <h3 class="modal-title">Настройки профиля</h3>
    <div class="form-group">
      <label class="form-label">Ник</label>
      <input class="form-input" id="setNick" type="text" value="${escapeAttr(profile.nickname)}">
    </div>
    <div class="form-group">
      <label class="form-label">Описание</label>
      <textarea class="form-textarea" id="setDesc">${escapeHtml(profile.description)}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Аватар (URL картинки)</label>
      <input class="form-input" id="setAvatar" type="text" value="${escapeAttr(profile.avatar)}" placeholder="ss.jpg или https://...">
    </div>
    <div class="form-group">
      <label class="form-label">Номер записи (REC №)</label>
      <input class="form-input" id="setRecordId" type="text" value="${escapeAttr(profile.recordId)}">
    </div>
    <div class="form-group">
      <label class="form-label">Статус</label>
      <input class="form-input" id="setStatus" type="text" value="${escapeAttr(profile.status)}">
    </div>
    <div class="form-group">
      <label class="form-label">Цвет статуса</label>
      <select class="form-select" id="setStatusColor">
        <option value="blue" ${profile.statusColor !== 'red' ? 'selected' : ''}>Синий</option>
        <option value="red" ${profile.statusColor === 'red' ? 'selected' : ''}>Красный</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn" onclick="closeModal()">Отмена</button>
      <button class="btn btn-primary" id="saveSettingsBtn">Сохранить</button>
    </div>
  `);
  document.getElementById('saveSettingsBtn').onclick = () => {
    profile.nickname = document.getElementById('setNick').value.trim() || 'Гоша Авторитет';
    profile.description = document.getElementById('setDesc').value.trim() || '';
    profile.avatar = document.getElementById('setAvatar').value.trim() || 'ss.jpg';
    profile.recordId = document.getElementById('setRecordId').value.trim() || '0001';
    profile.status = document.getElementById('setStatus').value.trim() || 'ACTIVE';
    profile.statusColor = document.getElementById('setStatusColor').value;
    save(STORAGE_KEYS.profile, profile);
    applyProfile();
    closeModal();
    toast('Сохранено', 'success');
  };
}

function showAdminLogin() {
  openModal(`
    <h3 class="modal-title">Вход админа</h3>
    <div class="form-group">
      <label class="form-label">Пароль</label>
      <input class="form-input" id="adminPass" type="password" placeholder="••••••••" autofocus>
    </div>
    <div class="form-actions">
      <button class="btn" onclick="closeModal()">Отмена</button>
      <button class="btn btn-primary" id="doLoginBtn">Войти</button>
    </div>
  `);
  document.getElementById('doLoginBtn').onclick = () => {
    const pass = document.getElementById('adminPass').value;
    if (pass === ADMIN_PASSWORD) {
      isAdmin = true;
      save(STORAGE_KEYS.admin, true);
      updateAdminUI();
      closeModal();
      toast('Добро пожаловать', 'success');
    } else {
      toast('Неверный пароль', 'error');
    }
  };
  document.getElementById('adminPass').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('doLoginBtn').click();
  });
}

function adminLogout() {
  isAdmin = false;
  save(STORAGE_KEYS.admin, false);
  updateAdminUI();
  toast('Вышел из админки');
}

/* ===== EVENTS ===== */
function bindEvents() {
  document.getElementById('adminLoginBtn').addEventListener('click', showAdminLogin);
  document.getElementById('settingsBtn').addEventListener('click', showSettingsForm);
  document.getElementById('logoutBtn').addEventListener('click', adminLogout);
  document.getElementById('addInfoBtn').addEventListener('click', showAddInfoForm);
  document.getElementById('leaveReviewBtn').addEventListener('click', showReviewForm);
}

/* ===== START ===== */
init();
