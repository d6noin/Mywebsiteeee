/* ===== CONFIG ===== */
const ADMIN_PASSWORD = '12312345'; // ← смени пароль здесь
const DATA_URL = 'data.json';

// Файлы для галереи аватарок — положи свои картинки в папку avatars/
// с такими же именами (или поменяй список ниже).
const AVATAR_GALLERY = [
  'avatars/1.jpg', 'avatars/2.jpg', 'avatars/3.jpg',
  'avatars/4.jpg', 'avatars/5.jpg', 'avatars/6.jpg'
];

const DEFAULT_DATA = {
  profile: {
    nickname: 'Гоша Авторитет',
    description: 'Здесь будет твоё описание. Войди как админ и открой «настройки», чтобы изменить.',
    avatar: 'ss.jpg',
    recordId: '0001',
    status: 'ACTIVE',
    statusColor: 'blue'
  },
  info: [],
  reviews: []
};

const LOCAL_KEYS = {
  admin: 'gosha_admin',
  draft: 'gosha_draft_v3',
  localReviews: 'gosha_local_reviews'
};

/* ===== STATE ===== */
let isAdmin = false;
let published = DEFAULT_DATA;
let profile = DEFAULT_DATA.profile;
let infoItems = [];
let reviews = [];

/* ===== UTILS ===== */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}
function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 2800);
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
async function init() {
  isAdmin = loadLocal(LOCAL_KEYS.admin, false);

  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (res.ok) {
      published = await res.json();
    } else {
      published = DEFAULT_DATA;
    }
  } catch {
    published = DEFAULT_DATA;
  }

  profile = { ...DEFAULT_DATA.profile, ...(published.profile || {}) };
  infoItems = (published.info || []).slice();

  if (isAdmin) {
    const draft = loadLocal(LOCAL_KEYS.draft, null);
    if (draft) {
      profile = { ...profile, ...(draft.profile || {}) };
      infoItems = (draft.info || infoItems).slice();
      toast('Загружен неопубликованный черновик', '');
    }
  }

  const localReviews = loadLocal(LOCAL_KEYS.localReviews, []);
  reviews = [...(published.reviews || []), ...localReviews];

  applyProfile();
  renderInfo();
  renderReviews();
  updateStats();
  updateAdminUI();
  bindEvents();
}

/* ===== DRAFT PERSISTENCE ===== */
function saveDraft() {
  if (!isAdmin) return;
  saveLocal(LOCAL_KEYS.draft, { profile, info: infoItems });
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

/* ===== RENDER DOSSIER ===== */
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
  saveDraft();
  renderInfo();
  updateStats();
  toast('Запись удалена из черновика — не забудь «опубликовать»');
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
          <span class="review-author">${escapeHtml(r.author || 'Аноним')}${r.local ? ' <span class="local-tag">видно только тебе</span>' : ''}</span>
          <span class="review-date">${formatDate(r.created)}</span>
        </div>
        <p class="review-text">${escapeHtml(r.text)}</p>
        ${(isAdmin && !r.local) ? `<button class="info-del" data-del-review="${r.id}" title="Убрать из черновика">× убрать из публикации</button>` : ''}
      </div>
    `)
    .join('');
  list.querySelectorAll('[data-del-review]').forEach(btn => {
    btn.addEventListener('click', () => deleteReview(btn.dataset.delReview));
  });
}

function deleteReview(id) {
  reviews = reviews.filter(r => r.id !== id);
  toast('Убран из черновика — не забудь «опубликовать»');
  renderReviews();
  updateStats();
}

/* ===== ADMIN UI ===== */
function updateAdminUI() {
  document.querySelectorAll('.admin-only').forEach(el => { el.style.display = isAdmin ? '' : 'none'; });
  document.getElementById('adminLoginBtn').style.display = isAdmin ? 'none' : '';
  renderInfo();
  renderReviews();
}

/* ===== MODAL ===== */
const overlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
function openModal(html) { modalContent.innerHTML = html; overlay.classList.add('active'); }
function closeModal() { overlay.classList.remove('active'); setTimeout(() => { modalContent.innerHTML = ''; }, 200); }
document.getElementById('modalClose').addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

/* ===== FORMS: ADD INFO ===== */
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
    saveDraft();
    renderInfo();
    updateStats();
    closeModal();
    toast('Добавлено в черновик — жми «опубликовать»', 'success');
  };
}

/* ===== FORMS: REVIEW (гость) ===== */
function showReviewForm() {
  openModal(`
    <h3 class="modal-title">Оставить отзыв</h3>
    <p class="hint-text">Отзыв сохранится только в твоём браузере, пока владелец сайта его не опубликует.</p>
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
    const item = { id: uid(), author, text, created: Date.now(), local: true };
    const localReviews = loadLocal(LOCAL_KEYS.localReviews, []);
    localReviews.push(item);
    saveLocal(LOCAL_KEYS.localReviews, localReviews);
    reviews.push(item);
    renderReviews();
    updateStats();
    closeModal();
    toast('Сохранено у тебя. Отправь текст владельцу, если хочешь опубликовать', 'success');
  };
}

/* ===== FORMS: SETTINGS (профиль + аватар) ===== */
function showSettingsForm() {
  if (!isAdmin) return;
  const galleryHtml = AVATAR_GALLERY.map(src => `
    <button type="button" class="avatar-pick ${profile.avatar === src ? 'is-active' : ''}" data-avatar-pick="${escapeAttr(src)}">
      <img src="${escapeAttr(src)}" alt="" onerror="this.parentElement.style.display='none'">
    </button>
  `).join('');

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
      <label class="form-label">Аватар — своя ссылка (URL или имя файла)</label>
      <input class="form-input" id="setAvatar" type="text" value="${escapeAttr(profile.avatar)}" placeholder="ss.jpg или https://...">
    </div>
    <div class="form-group">
      <label class="form-label">Или выбери из галереи</label>
      <div class="avatar-gallery">${galleryHtml}</div>
      <p class="hint-text">Чтобы галерея работала — положи свои картинки в папку <code>avatars/</code> в репозитории с именами 1.jpg…6.jpg (или поменяй список в script.js).</p>
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
      <button class="btn btn-primary" id="saveSettingsBtn">Сохранить в черновик</button>
    </div>
  `);

  document.querySelectorAll('[data-avatar-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = btn.dataset.avatarPick;
      document.getElementById('setAvatar').value = src;
      document.querySelectorAll('[data-avatar-pick]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });

  document.getElementById('saveSettingsBtn').onclick = () => {
    profile.nickname = document.getElementById('setNick').value.trim() || 'Гоша Авторитет';
    profile.description = document.getElementById('setDesc').value.trim() || '';
    profile.avatar = document.getElementById('setAvatar').value.trim() || 'ss.jpg';
    profile.recordId = document.getElementById('setRecordId').value.trim() || '0001';
    profile.status = document.getElementById('setStatus').value.trim() || 'ACTIVE';
    profile.statusColor = document.getElementById('setStatusColor').value;
    saveDraft();
    applyProfile();
    closeModal();
    toast('Сохранено в черновик — жми «опубликовать»', 'success');
  };
}

/* ===== EXPORT / ПУБЛИКАЦИЯ data.json ===== */
function buildPublishPayload() {
  return {
    profile,
    info: infoItems,
    reviews: reviews.filter(r => !r.local)
  };
}

function showExportForm() {
  if (!isAdmin) return;
  const payload = buildPublishPayload();
  const json = JSON.stringify(payload, null, 2);
  openModal(`
    <h3 class="modal-title">Опубликовать изменения</h3>
    <p class="hint-text">
      Это содержимое твоего <code>data.json</code>. Скачай файл и замени им
      <code>data.json</code> в репозитории на GitHub (Add file → Upload files → Commit),
      либо открой файл на GitHub → значок карандаша → вставь текст → Commit.
      Через 1–2 минуты GitHub Pages пересоберёт сайт, и все посетители увидят изменения.
    </p>
    <div class="form-group">
      <textarea class="form-textarea code-area" id="exportJson" readonly>${escapeHtml(json)}</textarea>
    </div>
    <div class="form-actions">
      <button class="btn" onclick="closeModal()">Закрыть</button>
      <button class="btn btn-primary" id="downloadJsonBtn">Скачать data.json</button>
    </div>
  `);
  document.getElementById('downloadJsonBtn').onclick = () => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'data.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Файл скачан — залей его на GitHub', 'success');
  };
}

/* ===== ADMIN LOGIN ===== */
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
      saveLocal(LOCAL_KEYS.admin, true);
      const draft = loadLocal(LOCAL_KEYS.draft, null);
      if (draft) {
        profile = { ...profile, ...(draft.profile || {}) };
        infoItems = (draft.info || infoItems).slice();
        applyProfile();
      }
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
  saveLocal(LOCAL_KEYS.admin, false);
  updateAdminUI();
  toast('Вышел из админки');
}

/* ===== EVENTS ===== */
function bindEvents() {
  document.getElementById('adminLoginBtn').addEventListener('click', showAdminLogin);
  document.getElementById('settingsBtn').addEventListener('click', showSettingsForm);
  document.getElementById('exportBtn').addEventListener('click', showExportForm);
  document.getElementById('logoutBtn').addEventListener('click', adminLogout);
  document.getElementById('addInfoBtn').addEventListener('click', showAddInfoForm);
  document.getElementById('leaveReviewBtn').addEventListener('click', showReviewForm);
}

/* ===== START ===== */
init();
