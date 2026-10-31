'use strict';
/* ============================================================
   APP — router SPA (hash), navigasi per peran, tema
   Tidak ada reload halaman; URL tetap satu file index.html.
   ============================================================ */
const ROUTES = {
  '/etalase':   { render: () => renderEtalase(), roles: null },
  '/masuk':     { render: () => renderLogin(), roles: null },
  '/dashboard': { render: () => renderDashboard(), roles: ['admin'] },
  '/kalender':  { render: () => renderKalender(), roles: ['admin'] },
  '/keuangan':  { render: () => renderKeuangan(), roles: ['admin'] },
  '/kelola':    { render: () => renderKelola(), roles: ['admin'] },
  '/jadwal':    { render: () => renderKalender(), roles: ['fotografer', 'admin'] }
};
const currentPath = () => (location.hash.slice(1) || '/etalase').split('?')[0];
const navigate = p => { if (currentPath() === p) route(); else location.hash = '#' + p; };

function navItems() {
  const base = [['/etalase', 'Etalase & Booking']];
  if (!S.user) return base;
  if (S.user.role === 'admin') return [...base, ['/dashboard', 'Dashboard & Booking'], ['/kalender', 'Kalender Jadwal'], ['/keuangan', 'Keuangan & Invoice'], ['/kelola', 'Kelola']];
  return [...base, ['/jadwal', 'Jadwal Saya']];
}

function renderChrome() {
  const c = S.pub?.config || {}, nama = c.nama_usaha || 'Sans Photo', logo = safeUrl(c.logo_url);
  const first = nama.split(' ')[0].toUpperCase(), rest = nama.split(' ').slice(1).join(' ') || 'Photo Studio';
  $('#brand').innerHTML = `${logo ? `<img src="${esc(logo)}" alt="" referrerpolicy="no-referrer">` : `<span class="brand-mark">${ic('camera')}</span>`}<span><b>${esc(first)}</b><small>${esc(rest)}</small></span>`;
  document.title = `${nama} — Studio Fotografi`;
  const p = currentPath();
  $('#nav').innerHTML = navItems().map(([h, l]) => `<a href="#${h}" ${p === h ? 'aria-current="page"' : ''}>${esc(l)}</a>`).join('');
  $('#user-slot').innerHTML = S.user
    ? `<div class="user-chip"><b>${esc(S.user.nama)}</b><span>${S.user.role === 'admin' ? 'Admin' : 'Fotografer'}</span></div><span class="avatar" aria-hidden="true">${esc(initials(S.user.nama))}</span><button class="btn btn-ghost btn-icon" id="btn-logout" aria-label="Keluar" title="Keluar">${ic('logout')}</button>`
    : `<a class="btn btn-primary btn-sm" href="#/masuk">Masuk Tim</a>`;
  $('#btn-logout')?.addEventListener('click', async () => {
    const t = S.token; clearSession(); renderChrome(); navigate('/etalase');
    try { await api('logout', {}); } catch (e) { /* abaikan */ } void t;
  });
  const dark = document.documentElement.dataset.theme === 'dark';
  $('#btn-theme').innerHTML = ic(dark ? 'sun' : 'moon', 18);
  $('#footer').innerHTML = `<div class="footer-in"><span>© ${new Date().getFullYear()} ${esc(nama)}. Seluruh hak cipta dilindungi.</span><span>Sistem Manajemen Operasional & Reservasi Digital</span></div>`;
}

async function route() {
  let path = currentPath();
  const r = ROUTES[path];
  if (!r) { location.hash = '#/etalase'; return; }
  if (r.roles && (!S.user || !r.roles.includes(S.user.role))) { toast(S.user ? 'Anda tidak memiliki akses ke halaman itu.' : 'Silakan masuk terlebih dahulu.', 'error'); location.hash = S.user ? '#/etalase' : '#/masuk'; return; }
  killCharts(); closeModal(true);
  renderChrome();
  window.scrollTo(0, 0);
  try { await r.render(); }
  catch (e) {
    if (e.code === 'AUTH') return;
    $('#app').innerHTML = `<div class="wrap section"><div class="card empty">${ic('alert', 34)}<h2 style="margin:8px 0">Gagal memuat halaman</h2><p>${esc(e.message)}</p><button class="btn btn-primary" style="margin-top:14px" id="retry">Coba lagi</button></div></div>`;
    $('#retry').addEventListener('click', route);
  }
  if (S.user && S.user.wajib_ganti && !$('#f_baru')) forcePasswordChange();
  $('#app').focus({ preventScroll: true });
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('sp_theme', next); } catch (e) { /* abaikan */ }
  renderChrome();
  // gambar ulang grafik agar warna sumbu mengikuti tema
  if (['/dashboard', '/keuangan'].includes(currentPath())) route();
}

document.addEventListener('DOMContentLoaded', async () => {
  loadSession();
  $('#btn-theme').addEventListener('click', toggleTheme);
  window.addEventListener('hashchange', route);
  renderChrome();
  try { await loadPublic(); renderChrome(); } catch (e) { /* ditangani halaman etalase */ }
  route();
});
