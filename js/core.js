'use strict';
/* ============================================================
   CORE — utilitas, state, API, modal, toast
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const rp = n => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const dateObj = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const fmtTgl = (s, withDay) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return '-';
  const d = dateObj(s);
  return (withDay ? HARI[d.getDay()] + ', ' : '') + d.getDate() + ' ' + BULAN[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
};
const fmtTglPanjang = s => { const d = dateObj(s); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const localDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const fromMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const initials = n => String(n || '?').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const fmtWa = n => n ? '+' + n : '-';
const waLink = (num, text) => `https://wa.me/${String(num || '').replace(/\D/g, '')}${text ? '?text=' + encodeURIComponent(text) : ''}`;
const safeUrl = u => /^https:\/\/[^\s]+$/.test(String(u || '')) ? u : '';
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ---------- Ikon (SVG inline, gaya garis) ---------- */
const ICONS = {
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  wa: '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2-5.6A8.4 8.4 0 1 1 21 11.5z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4zM3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>', up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  cloud: '<path d="M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>', lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
};
const ic = (n, size) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"${size ? ` style="font-size:${size}px"` : ''}>${ICONS[n] || ''}</svg>`;

/* ---------- State & sesi ---------- */
const S = { token: null, user: null, pub: null };
function loadSession() {
  try { const j = JSON.parse(localStorage.getItem('sp_session') || 'null'); if (j && j.token) { S.token = j.token; S.user = j.user; } } catch (e) { /* abaikan */ }
}
function saveSession() {
  try { if (S.token) localStorage.setItem('sp_session', JSON.stringify({ token: S.token, user: S.user })); else localStorage.removeItem('sp_session'); } catch (e) { /* abaikan */ }
}
function clearSession() { S.token = null; S.user = null; saveSession(); }
const isAdmin = () => S.user && S.user.role === 'admin';

/* ---------- API ---------- */
function assertConfigured() {
  if (typeof GAS_URL === 'undefined' || !/^https:\/\/script\.google\.com\/.+\/exec/.test(GAS_URL)) {
    throw new Error('URL backend belum diisi. Buka js/config.js lalu tempel URL Web App (berakhiran /exec).');
  }
}
async function api(action, data = {}) {
  assertConfigured();
  let res;
  try {
    res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // wajib text/plain agar tidak kena CORS preflight
      body: JSON.stringify({ action, data, token: S.token })
    });
  } catch (e) { throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'); }
  let json;
  try { json = await res.json(); } catch (e) { throw new Error('Respons server tidak valid. Pastikan deployment Web App diatur "Anyone".'); }
  if (!json.success) {
    if (json.code === 'AUTH' && S.token) { clearSession(); renderChrome(); toast('Sesi berakhir, silakan masuk kembali.', 'error'); navigate('/masuk'); }
    const err = new Error(json.message || 'Terjadi kesalahan.');
    err.code = json.code; err.extra = json;
    throw err;
  }
  return json.data;
}
async function apiPublic() {
  assertConfigured();
  const res = await fetch(`${GAS_URL}?action=getPublic`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Gagal memuat data.');
  return json.data;
}

/* ---------- Toast ---------- */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `${type === 'error' ? ic('alert') : type === 'success' ? ic('check') : ''}<span>${esc(msg)}</span>`;
  $('#toast-root').appendChild(el);
  setTimeout(() => el.remove(), type === 'error' ? 5500 : 3200);
}

/* ---------- Tombol sibuk ---------- */
async function busy(btn, fn) {
  if (!btn) return fn();
  const html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
}

/* ---------- Modal ---------- */
let modalOnClose = null;
function openModal(html, { wide = false, dark = false, dismiss = true, onClose } = {}) {
  closeModal(true);
  modalOnClose = onClose || null;
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-dismiss="${dismiss}"><div class="modal ${wide ? 'modal-wide' : ''} ${dark ? 'modal-dark' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  const bd = $('.modal-backdrop', root);
  bd.addEventListener('mousedown', e => { if (e.target === bd && dismiss) closeModal(); });
  $$('[data-close]', root).forEach(b => b.addEventListener('click', () => closeModal()));
  const first = $('input:not([type=hidden]):not(.hp input), select, textarea', root);
  if (first && !dark) setTimeout(() => first.focus(), 30);
  return $('.modal', root);
}
function closeModal(silent) {
  const root = $('#modal-root');
  if (!root.innerHTML) return;
  root.innerHTML = '';
  if (modalOnClose && !silent) { const f = modalOnClose; modalOnClose = null; f(); } else modalOnClose = null;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const bd = $('.modal-backdrop'); if (bd && bd.dataset.dismiss !== 'false') closeModal(); } });

function fieldHTML(f, v) {
  if (f.type === 'heading') return `<div class="full form-sep"><span class="cap">${esc(f.label)}</span>${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</div>`;
  const id = 'f_' + f.name, val = v ?? f.value ?? '';
  const req = f.required ? ' required' : '';
  const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
  const wrapCls = 'field' + (f.full || f.type === 'textarea' ? ' full' : '');
  if (f.type === 'checkbox') return `<div class="${wrapCls} full"><label class="check"><input type="checkbox" name="${f.name}" ${val === 'ya' || val === true ? 'checked' : ''}> ${esc(f.label)}</label>${hint}</div>`;
  let ctl;
  if (f.type === 'select') {
    ctl = `<select class="input" id="${id}" name="${f.name}"${req}>${(f.options || []).map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  } else if (f.type === 'textarea') {
    ctl = `<textarea class="input" id="${id}" name="${f.name}" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}"${req}>${esc(val)}</textarea>`;
  } else {
    ctl = `<input class="input" id="${id}" type="${f.type || 'text'}" name="${f.name}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}"${req}${f.min !== undefined ? ` min="${f.min}"` : ''}${f.step ? ` step="${f.step}"` : ''}${f.autocomplete ? ` autocomplete="${f.autocomplete}"` : ''}>`;
  }
  return `<div class="${wrapCls}"><label for="${id}">${esc(f.label)}${f.required ? ' *' : ''}</label>${ctl}${hint}</div>`;
}

/** Modal formulir generik. onSubmit(values) boleh melempar Error → ditampilkan di formulir */
function modalForm({ title, fields, values = {}, submitLabel = 'Simpan', onSubmit, wide = false, dismiss = true, intro = '', extra = '' }) {
  const inputs = fields.filter(f => f.type !== 'heading');
  const m = openModal(`
    <div class="modal-head"><h2>${esc(title)}</h2>${dismiss ? `<button class="btn btn-ghost btn-icon" data-close aria-label="Tutup">${ic('x')}</button>` : ''}</div>
    ${intro ? `<p class="muted" style="margin-bottom:14px">${intro}</p>` : ''}
    <form novalidate><div class="form-grid">${fields.map(f => fieldHTML(f, values[f.name])).join('')}</div>${extra}
      <div class="form-error" hidden style="margin-top:14px"></div>
      <div class="modal-foot">${dismiss ? '<button type="button" class="btn btn-outline" data-close>Batal</button>' : ''}<button type="submit" class="btn btn-primary">${esc(submitLabel)}</button></div>
    </form>`, { wide, dismiss });
  const form = $('form', m), errBox = $('.form-error', m);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    errBox.hidden = true;
    const bad = inputs.find(f => f.required && !String(new FormData(form).get(f.name) || '').trim());
    if (bad) { errBox.textContent = `"${bad.label}" wajib diisi.`; errBox.hidden = false; return; }
    const fd = new FormData(form), out = {};
    inputs.forEach(f => { out[f.name] = f.type === 'checkbox' ? (fd.get(f.name) ? 'ya' : 'tidak') : (fd.get(f.name) ?? ''); });
    const btn = $('[type=submit]', form);
    try { await busy(btn, () => onSubmit(out, form)); closeModal(true); }
    catch (err) { errBox.textContent = err.message; errBox.hidden = false; }
  });
  return m;
}

function confirmBox(msg, { okLabel = 'Ya, lanjutkan', danger = false, title = 'Konfirmasi' } = {}) {
  return new Promise(resolve => {
    let done = false;
    const fin = v => { if (!done) { done = true; resolve(v); } };
    const m = openModal(`<div class="modal-head"><h2>${esc(title)}</h2></div><div>${msg}</div>
      <div class="modal-foot"><button class="btn btn-outline" data-no>Batal</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(okLabel)}</button></div>`, { onClose: () => fin(false) });
    $('[data-no]', m).addEventListener('click', () => { fin(false); closeModal(true); });
    $('[data-yes]', m).addEventListener('click', () => { fin(true); closeModal(true); });
  });
}

/* ---------- Badge status ---------- */
const BADGE = { Baru: 'amber', Dikonfirmasi: 'green', Selesai: 'blue', Batal: 'red', 'Belum bayar': 'red', DP: 'amber', Lunas: 'green', Pending: 'amber' };
const badge = s => `<span class="badge b-${BADGE[s] || 'gray'}"><i></i>${esc(s)}</span>`;

/* ---------- Unduh berkas ---------- */
function downloadBlob(name, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- Baca berkas apa adanya (mis. PDF) menjadi base64 ---------- */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
    fr.onerror = () => reject(new Error('Gagal membaca berkas: ' + file.name));
    fr.readAsDataURL(file);
  });
}

/* ---------- Kompres gambar di browser sebelum diunggah ---------- */
function compressImage(file, maxSide = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL('image/jpeg', quality);
      resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg', preview: dataUrl });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('File bukan gambar yang valid: ' + file.name)); };
    img.src = url;
  });
}
