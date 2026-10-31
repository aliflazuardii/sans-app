'use strict';
/* ============================================================
   KELOLA — portofolio, paket, tim, testimoni, pengaturan
   ============================================================ */
const MG = { tab: 'portofolio', porto: [], paket: [], tim: [], testi: [], cfg: {} };
const KATEGORI_PORTO = ['Wedding', 'Prewedding', 'Wisuda', 'Studio Portrait', 'Family', 'Newborn', 'Corporate', 'Umum'];
const TABS = [['portofolio', 'Portofolio'], ['paket', 'Paket & Harga'], ['tim', 'Tim'], ['testimoni', 'Testimoni'], ['pengaturan', 'Pengaturan']];

async function renderKelola() {
  $('#app').innerHTML = skeletonPage();
  drawKelola();
}

function drawKelola() {
  $('#app').innerHTML = `<div class="wrap-admin">
    <div style="margin-bottom:16px"><span class="cap">Pengelolaan konten</span><h1 class="serif" style="font-size:30px;font-weight:500">Kelola Studio</h1></div>
    <div class="tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === MG.tab}">${l}</button>`).join('')}</div>
    <div id="mg-body" aria-live="polite"></div></div>`;
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => { MG.tab = b.dataset.tab; drawKelola(); }));
  const fn = { portofolio: tabPorto, paket: tabPaket, tim: tabTim, testimoni: tabTesti, pengaturan: tabPengaturan }[MG.tab];
  $('#mg-body').innerHTML = `<div class="skeleton" style="height:220px"></div>`;
  fn().catch(e => { $('#mg-body').innerHTML = `<div class="card empty">${ic('alert', 32)}<p>${esc(e.message)}</p></div>`; });
}

/* ---------- Portofolio ---------- */
async function tabPorto() {
  MG.porto = await api('list', { entity: 'portofolio' });
  const L = MG.porto;
  $('#mg-body').innerHTML = `<div class="card">
    <div class="card-head"><div><h2>Portofolio (${L.length} foto)</h2><p class="muted">Foto dikompres otomatis di browser sebelum diunggah. Urutan di sini = urutan di galeri publik.</p></div>
      <div class="row"><input type="file" id="up-file" accept="image/jpeg,image/png,image/webp" multiple hidden><button class="btn btn-primary" id="up-btn">${ic('upload')} Unggah Foto</button></div></div>
    ${L.length ? `<div class="thumbs">${L.map((p, i) => `<div class="thumb"><div class="im">${safeUrl(p.url_tampil) ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(p.url_tampil)}" alt="${esc(p.judul)}">` : ''}</div>
      <div class="meta"><b title="${esc(p.judul)}">${esc(p.judul)}</b><small>${esc(p.kategori)}</small></div>
      <div class="acts"><button class="btn btn-outline btn-icon" data-up="${i}" aria-label="Naikkan urutan" ${i === 0 ? 'disabled' : ''}>${ic('up')}</button>
        <button class="btn btn-outline btn-icon" data-down="${i}" aria-label="Turunkan urutan" ${i === L.length - 1 ? 'disabled' : ''}>${ic('down')}</button>
        <button class="btn btn-outline btn-icon" data-pe="${esc(p.id)}" aria-label="Ubah">${ic('edit')}</button>
        <button class="btn btn-outline btn-icon" data-pd="${esc(p.id)}" aria-label="Hapus">${ic('trash')}</button></div></div>`).join('')}</div>`
      : `<div class="empty">${ic('image', 34)}<p>Belum ada foto. Klik “Unggah Foto” untuk mulai mengisi galeri.</p></div>`}</div>`;
  const file = $('#up-file');
  $('#up-btn').addEventListener('click', () => file.click());
  file.addEventListener('change', () => { if (file.files.length) uploadPortfolio([...file.files]); file.value = ''; });
  const move = async (i, d) => {
    const ids = L.map(p => p.id); [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    try { await api('reorderPortofolio', { ids }); await tabPorto(); } catch (e) { toast(e.message, 'error'); }
  };
  $$('[data-up]').forEach(b => b.addEventListener('click', () => move(Number(b.dataset.up), -1)));
  $$('[data-down]').forEach(b => b.addEventListener('click', () => move(Number(b.dataset.down), 1)));
  $$('[data-pe]').forEach(b => b.addEventListener('click', () => {
    const p = L.find(x => x.id === b.dataset.pe);
    modalForm({ title: 'Ubah Foto', values: p, fields: [{ name: 'judul', label: 'Judul', required: true, full: true }, { name: 'kategori', label: 'Kategori', type: 'select', options: [...new Set([...KATEGORI_PORTO, p.kategori])], full: true }],
      onSubmit: async v => { await api('save', { entity: 'portofolio', values: { ...v, id: p.id } }); toast('Foto diperbarui.', 'success'); await tabPorto(); } });
  }));
  $$('[data-pd]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirmBox('Hapus foto ini dari portofolio dan Google Drive?', { danger: true, okLabel: 'Hapus' })) return;
    try { await api('remove', { entity: 'portofolio', id: b.dataset.pd }); toast('Foto dihapus.', 'success'); await tabPorto(); } catch (e) { toast(e.message, 'error'); }
  }));
}

function uploadPortfolio(files) {
  modalForm({
    title: `Unggah ${files.length} foto`, submitLabel: 'Mulai Unggah',
    intro: 'Judul foto otomatis memakai nama file (tanpa ekstensi). Anda bisa mengubahnya nanti.',
    fields: [{ name: 'kategori', label: 'Kategori untuk semua foto', type: 'select', options: KATEGORI_PORTO, full: true }],
    onSubmit: async v => {
      let ok = 0; const gagal = [];
      for (let i = 0; i < files.length; i++) {
        toast(`Mengunggah ${i + 1} dari ${files.length}…`);
        try {
          const img = await compressImage(files[i]);
          await api('addPortofolio', { base64: img.base64, mime: img.mime, kategori: v.kategori, judul: files[i].name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60) });
          ok++;
        } catch (e) { gagal.push(`${files[i].name}: ${e.message}`); }
      }
      if (gagal.length) toast(`${ok} berhasil, ${gagal.length} gagal. ${gagal[0]}`, 'error'); else toast(`${ok} foto berhasil diunggah.`, 'success');
      await loadPublic(true).catch(() => {}); await tabPorto();
    }
  });
}

/* ---------- Paket ---------- */
async function tabPaket() {
  MG.paket = await api('list', { entity: 'paket' });
  $('#mg-body').innerHTML = `<div class="card"><div class="card-head"><div><h2>Paket & Harga</h2><p class="muted">Total tagihan booking dihitung otomatis dari harga paket.</p></div><button class="btn btn-primary" id="pk-add">${ic('plus')} Tambah Paket</button></div>
    ${MG.paket.length ? `<table class="tbl"><thead><tr><th>Nama paket</th><th>Harga</th><th>Tampil</th><th></th></tr></thead><tbody>${MG.paket.map(p => `<tr>
      <td data-label="Paket"><b>${esc(p.nama_paket)}</b>${p.populer === 'ya' ? ' <span class="badge b-accent">Paling diminati</span>' : ''}<span class="sub">${esc(p.deskripsi)}</span></td>
      <td data-label="Harga" class="tnum">${rp(p.harga)}</td><td data-label="Tampil">${p.aktif === 'ya' ? badge('Dikonfirmasi').replace('Dikonfirmasi', 'Aktif') : '<span class="badge b-gray"><i></i>Nonaktif</span>'}</td>
      <td class="nolabel"><div class="acts"><button class="btn btn-outline btn-icon" data-pke="${esc(p.id)}" aria-label="Ubah">${ic('edit')}</button><button class="btn btn-outline btn-icon" data-pkd="${esc(p.id)}" aria-label="Hapus">${ic('trash')}</button></div></td></tr>`).join('')}</tbody></table>`
      : `<div class="empty">${ic('file', 32)}<p>Belum ada paket.</p></div>`}</div>`;
  const form = p => modalForm({
    title: p ? 'Ubah Paket' : 'Tambah Paket', values: p || { aktif: 'ya' }, wide: true,
    fields: [
      { name: 'nama_paket', label: 'Nama paket', required: true, full: true },
      { name: 'harga', label: 'Harga (Rp)', type: 'number', min: 0, step: 10000, required: true },
      { name: 'deskripsi', label: 'Deskripsi singkat' },
      { name: 'fitur', label: 'Daftar isi paket (satu baris = satu poin)', type: 'textarea', rows: 5, full: true },
      { name: 'populer', label: 'Tandai “Paling diminati”', type: 'checkbox' }, { name: 'aktif', label: 'Tampilkan di web publik', type: 'checkbox' }
    ],
    onSubmit: async v => { await api('save', { entity: 'paket', values: { ...v, id: p?.id } }); toast('Paket disimpan.', 'success'); await loadPublic(true).catch(() => {}); await tabPaket(); }
  });
  $('#pk-add').addEventListener('click', () => form());
  $$('[data-pke]').forEach(b => b.addEventListener('click', () => form(MG.paket.find(x => x.id === b.dataset.pke))));
  $$('[data-pkd]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirmBox('Hapus paket ini? Booking lama tetap tersimpan, tetapi nama paketnya tidak lagi terbaca. Lebih aman: nonaktifkan saja.', { danger: true, okLabel: 'Hapus' })) return;
    try { await api('remove', { entity: 'paket', id: b.dataset.pkd }); toast('Paket dihapus.', 'success'); await tabPaket(); } catch (e) { toast(e.message, 'error'); }
  }));
}

/* ---------- Tim ---------- */
async function tabTim() {
  MG.tim = await api('list', { entity: 'tim' });
  $('#mg-body').innerHTML = `<div class="card"><div class="card-head"><div><h2>Tim Fotografer</h2><p class="muted">Fotografer dengan akun login hanya bisa melihat jadwal tugasnya sendiri (hanya baca).</p></div><button class="btn btn-primary" id="tm-add">${ic('plus')} Tambah Anggota</button></div>
    ${MG.tim.length ? MG.tim.map(t => `<div class="team-row" style="margin-bottom:10px"><span class="avatar" style="background:${esc(t.warna_kalender)};color:#fff">${esc(initials(t.nama))}</span>
      <div class="grow"><b>${esc(t.nama)}</b> ${t.aktif === 'ya' ? '' : '<span class="badge b-gray">Nonaktif</span>'}<small>${esc(t.peran)} · ${esc(fmtWa(t.whatsapp))}${t.username ? ' · login: <b>' + esc(t.username) + '</b>' : ' · tanpa akun login'}</small></div>
      <button class="btn btn-outline btn-icon" data-tme="${esc(t.id)}" aria-label="Ubah">${ic('edit')}</button><button class="btn btn-outline btn-icon" data-tmd="${esc(t.id)}" aria-label="Hapus">${ic('trash')}</button></div>`).join('')
      : `<div class="empty">${ic('users', 32)}<p>Belum ada anggota tim.</p></div>`}</div>`;
  const form = t => modalForm({
    title: t ? 'Ubah Anggota Tim' : 'Tambah Anggota Tim', values: t || { warna_kalender: '#4F46E5', aktif: 'ya' }, wide: true,
    fields: [
      { name: 'nama', label: 'Nama', required: true }, { name: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: '08123456789' },
      { name: 'peran', label: 'Peran', placeholder: 'Mis. Fotografer — Wedding' }, { name: 'warna_kalender', label: 'Warna di kalender', type: 'color' },
      { name: 'username', label: 'Username login (opsional)', hint: 'Huruf kecil/angka. Kosongkan bila tidak perlu akun.', autocomplete: 'off' },
      { name: 'password', label: t?.username ? 'Password baru (kosongkan jika tidak diganti)' : 'Password (min. 8 karakter)', type: 'password', autocomplete: 'new-password' },
      { name: 'aktif', label: 'Anggota aktif', type: 'checkbox' }
    ],
    onSubmit: async v => { await api('save', { entity: 'tim', values: { ...v, id: t?.id } }); toast('Data tim disimpan.', 'success'); await tabTim(); }
  });
  $('#tm-add').addEventListener('click', () => form());
  $$('[data-tme]').forEach(b => b.addEventListener('click', () => form(MG.tim.find(x => x.id === b.dataset.tme))));
  $$('[data-tmd]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirmBox('Hapus anggota ini? Akun login-nya dinonaktifkan dan jadwalnya menjadi “belum ditugaskan”.', { danger: true, okLabel: 'Hapus' })) return;
    try { await api('remove', { entity: 'tim', id: b.dataset.tmd }); toast('Anggota dihapus.', 'success'); await tabTim(); } catch (e) { toast(e.message, 'error'); }
  }));
}

/* ---------- Testimoni ---------- */
async function tabTesti() {
  MG.testi = await api('list', { entity: 'testimoni' });
  const menunggu = MG.testi.filter(t => t.disetujui !== 'ya').length;
  $('#mg-body').innerHTML = `<div class="card"><div class="card-head"><div><h2>Testimoni ${menunggu ? `<span class="badge b-amber">${menunggu} menunggu</span>` : ''}</h2><p class="muted">Hanya testimoni yang disetujui yang tampil di web publik.</p></div></div>
    ${MG.testi.length ? MG.testi.map(t => `<div class="rem" style="margin-bottom:10px"><div class="row between"><div><b>${esc(t.nama)}</b> ${stars(t.rating)}</div>${t.disetujui === 'ya' ? '<span class="badge b-green"><i></i>Tampil</span>' : '<span class="badge b-amber"><i></i>Menunggu</span>'}</div>
      <p>${esc(t.isi)}</p><div class="row"><span class="muted" style="font-size:12px">${esc(fmtTgl(t.tanggal))}</span><span style="flex:1"></span>
      ${t.disetujui === 'ya' ? `<button class="btn btn-outline btn-sm" data-ts="${esc(t.id)}" data-v="tidak">Sembunyikan</button>` : `<button class="btn btn-accent btn-sm" data-ts="${esc(t.id)}" data-v="ya">${ic('check')} Setujui</button>`}
      <button class="btn btn-outline btn-icon" data-td="${esc(t.id)}" aria-label="Hapus">${ic('trash')}</button></div></div>`).join('')
      : `<div class="empty">${ic('star', 32)}<p>Belum ada testimoni.</p></div>`}</div>`;
  $$('[data-ts]').forEach(b => b.addEventListener('click', async () => {
    try { await busy(b, () => api('save', { entity: 'testimoni', values: { id: b.dataset.ts, disetujui: b.dataset.v } })); toast('Status testimoni diperbarui.', 'success'); await tabTesti(); } catch (e) { toast(e.message, 'error'); }
  }));
  $$('[data-td]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirmBox('Hapus testimoni ini?', { danger: true, okLabel: 'Hapus' })) return;
    try { await api('remove', { entity: 'testimoni', id: b.dataset.td }); toast('Dihapus.', 'success'); await tabTesti(); } catch (e) { toast(e.message, 'error'); }
  }));
}

/* ---------- Pengaturan ---------- */
async function tabPengaturan() {
  MG.cfg = await api('getConfig');
  const c = MG.cfg, logo = safeUrl(c.logo_url);
  $('#mg-body').innerHTML = `<div class="grid g2" style="align-items:start">
    <form class="card" id="cfg-form" novalidate><div class="card-head"><h2>Profil & Rekening Usaha</h2></div>
      <div class="form-grid">
        ${[['nama_usaha', 'Nama usaha'], ['tagline', 'Slogan'], ['nomor_wa_admin', 'WhatsApp admin (untuk tombol booking)'], ['email', 'Email'], ['website', 'Website'], ['jam_buka', 'Jam operasional'], ['alamat', 'Alamat', 'full'],
        ['rekening_bank', 'Bank'], ['rekening_nomor', 'Nomor rekening'], ['rekening_nama', 'Atas nama'], ['target_sesi', 'Target sesi per bulan']].map(([k, l, full]) => `<div class="field ${full || ''}"><label for="c_${k}">${l}</label><input class="input" id="c_${k}" name="${k}" value="${esc(c[k])}" ${k === 'target_sesi' ? 'type="number" min="1"' : ''}></div>`).join('')}
      </div><div class="form-error" hidden style="margin-top:14px"></div><div class="modal-foot"><button class="btn btn-primary" type="submit">Simpan Pengaturan</button></div></form>
    <div class="stack">
      <section class="card"><div class="card-head"><h3>Logo</h3></div>
        <div class="row">${logo ? `<img src="${esc(logo)}" alt="Logo saat ini" referrerpolicy="no-referrer" style="height:64px;border-radius:10px">` : '<span class="muted">Belum ada logo.</span>'}
          <input type="file" id="logo-file" accept="image/jpeg,image/png,image/webp" hidden><button class="btn btn-outline" id="logo-btn">${ic('upload')} Unggah Logo</button></div></section>
      <section class="card"><div class="card-head"><h3>Keamanan</h3></div><p class="muted" style="margin-bottom:12px">Ganti password akun yang sedang digunakan (${esc(S.user.username)}).</p><button class="btn btn-outline" id="pw-btn">${ic('lock')} Ganti Password</button></section>
    </div></div>`;
  $('#cfg-form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, err = $('.form-error', f);
    err.hidden = true;
    try { await busy($('[type=submit]', f), () => api('saveConfig', { values: Object.fromEntries(new FormData(f)) })); toast('Pengaturan disimpan.', 'success'); await loadPublic(true).catch(() => {}); renderChrome(); }
    catch (x) { err.textContent = x.message; err.hidden = false; }
  });
  const lf = $('#logo-file');
  $('#logo-btn').addEventListener('click', () => lf.click());
  lf.addEventListener('change', async () => {
    if (!lf.files[0]) return;
    try { const img = await compressImage(lf.files[0], 600, 0.9); await api('uploadLogo', { base64: img.base64, mime: img.mime }); toast('Logo diperbarui.', 'success'); await loadPublic(true).catch(() => {}); renderChrome(); await tabPengaturan(); }
    catch (e) { toast(e.message, 'error'); }
    lf.value = '';
  });
  $('#pw-btn').addEventListener('click', () => modalForm({
    title: 'Ganti Password', submitLabel: 'Simpan',
    fields: [{ name: 'lama', label: 'Password saat ini', type: 'password', required: true, autocomplete: 'current-password', full: true }, { name: 'baru', label: 'Password baru (min. 8 karakter)', type: 'password', required: true, autocomplete: 'new-password', full: true }],
    onSubmit: async v => { await api('changePassword', v); toast('Password berhasil diganti.', 'success'); }
  }));
}
