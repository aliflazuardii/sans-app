'use strict';
/* ============================================================
   KELOLA — portofolio, paket, tim, testimoni, pengaturan
   ============================================================ */
const MG = { tab: 'portofolio', porto: [], acara: [], tim: [], akun: [], testi: [], cfg: {} };
const kategoriPorto = () => [...new Set([...acaraNames(), 'Umum'])];
const TABS = [['portofolio', 'Portofolio'], ['acara', 'Jenis Acara & Pricelist'], ['tim', 'Tim'], ['akun', 'Akun'], ['testimoni', 'Testimoni'], ['pengaturan', 'Pengaturan']];

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
  const fn = { portofolio: tabPorto, acara: tabAcara, tim: tabTim, akun: tabAkun, testimoni: tabTesti, pengaturan: tabPengaturan }[MG.tab];
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
    modalForm({ title: 'Ubah Foto', values: p, fields: [{ name: 'judul', label: 'Judul', required: true, full: true }, { name: 'kategori', label: 'Kategori', type: 'select', options: [...new Set([...kategoriPorto(), p.kategori])], full: true }],
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
    fields: [{ name: 'kategori', label: 'Kategori untuk semua foto', type: 'select', options: kategoriPorto(), full: true }],
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

/* ---------- Jenis acara & pricelist PDF ---------- */
async function tabAcara() {
  MG.acara = await api('list', { entity: 'acara' });
  const L = MG.acara;
  $('#mg-body').innerHTML = `<div class="card"><div class="card-head"><div><h2>Jenis Acara & Pricelist</h2><p class="muted">Klien hanya memilih jenis acara saat booking (tanpa paket dan tanpa harga). Unggah pricelist PDF per jenis acara; harga final ditulis admin saat konfirmasi.</p></div><button class="btn btn-primary" id="ac-add">${ic('plus')} Tambah Jenis Acara</button></div>
    <input type="file" id="pdf-file" accept="application/pdf" hidden>
    ${L.length ? `<div class="stack" style="--gap:10px">${L.map((a, i) => `<div class="ac-row ${a.aktif === 'ya' ? '' : 'off'}">
      <span class="ac-no">${String(i + 1).padStart(2, '0')}</span>
      <div class="grow"><b>${esc(a.nama)}</b> ${a.aktif === 'ya' ? '' : '<span class="badge b-gray">Disembunyikan</span>'}<small>${esc(a.deskripsi || 'Tanpa deskripsi')}</small>
        <div class="row" style="margin-top:8px">${safeUrl(a.pdf_url) ? `<span class="badge b-green"><i></i>PDF terpasang</span><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener noreferrer" href="${esc(a.pdf_url)}">${ic('file')} Lihat</a>` : '<span class="badge b-amber"><i></i>Belum ada PDF</span>'}
          <button class="btn btn-outline btn-sm" data-pdfup="${esc(a.id)}">${ic('upload')} ${safeUrl(a.pdf_url) ? 'Ganti PDF' : 'Unggah PDF'}</button>
          ${safeUrl(a.pdf_url) ? `<button class="btn btn-ghost btn-sm" data-pdfdel="${esc(a.id)}" style="color:var(--red)">${ic('trash')} Hapus PDF</button>` : ''}</div></div>
      <div class="acts"><button class="btn btn-outline btn-icon" data-acup="${i}" aria-label="Naikkan urutan" ${i === 0 ? 'disabled' : ''}>${ic('up')}</button>
        <button class="btn btn-outline btn-icon" data-acdown="${i}" aria-label="Turunkan urutan" ${i === L.length - 1 ? 'disabled' : ''}>${ic('down')}</button>
        <button class="btn btn-outline btn-icon" data-ace="${esc(a.id)}" aria-label="Ubah">${ic('edit')}</button>
        <button class="btn btn-outline btn-icon" data-acd="${esc(a.id)}" aria-label="Hapus">${ic('trash')}</button></div></div>`).join('')}</div>`
      : `<div class="empty">${ic('file', 32)}<p>Belum ada jenis acara. Klik “Tambah Jenis Acara”.</p></div>`}</div>`;
  const refresh = async () => { await loadPublic(true).catch(() => {}); await tabAcara(); };
  const form = a => modalForm({
    title: a ? 'Ubah Jenis Acara' : 'Tambah Jenis Acara', values: a || { aktif: 'ya' }, wide: true,
    fields: [
      { name: 'nama', label: 'Nama jenis acara', required: true, full: true, placeholder: 'Mis. Wedding, Engagement, Tedak Siten' },
      { name: 'deskripsi', label: 'Deskripsi singkat', full: true },
      { name: 'pdf_url', label: 'Link pricelist PDF (opsional)', type: 'url', full: true, placeholder: 'https://drive.google.com/file/d/…', hint: 'Cara termudah: simpan lalu pakai tombol “Unggah PDF”. Atau tempel link berbagi Google Drive ("siapa saja yang memiliki link").' },
      { name: 'aktif', label: 'Tampilkan di web publik', type: 'checkbox' }
    ],
    onSubmit: async v => { await api('save', { entity: 'acara', values: { ...v, id: a?.id } }); toast('Jenis acara disimpan.', 'success'); await refresh(); }
  });
  $('#ac-add').addEventListener('click', () => form());
  $$('[data-ace]').forEach(b => b.addEventListener('click', () => form(L.find(x => x.id === b.dataset.ace))));
  $$('[data-acd]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirmBox('Hapus jenis acara ini? Booking lama tetap tersimpan. Lebih aman: ubah lalu matikan “Tampilkan di web publik”.', { danger: true, okLabel: 'Hapus' })) return;
    try { await api('remove', { entity: 'acara', id: b.dataset.acd }); toast('Jenis acara dihapus.', 'success'); await refresh(); } catch (e) { toast(e.message, 'error'); }
  }));
  const move = async (i, d) => {
    const ids = L.map(a => a.id); [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    try { await api('reorderAcara', { ids }); await refresh(); } catch (e) { toast(e.message, 'error'); }
  };
  $$('[data-acup]').forEach(b => b.addEventListener('click', () => move(Number(b.dataset.acup), -1)));
  $$('[data-acdown]').forEach(b => b.addEventListener('click', () => move(Number(b.dataset.acdown), 1)));
  // unggah PDF
  const pf = $('#pdf-file'); let target = null;
  $$('[data-pdfup]').forEach(b => b.addEventListener('click', () => { target = b; pf.click(); }));
  pf.addEventListener('change', async () => {
    const file = pf.files[0], b = target; pf.value = '';
    if (!file || !b) return;
    if (file.type !== 'application/pdf') { toast('Berkas harus PDF.', 'error'); return; }
    if (file.size > 8 * 1024 * 1024) { toast('PDF lebih dari 8 MB. Unggah dulu ke Google Drive Anda, lalu tempel link-nya lewat tombol Ubah.', 'error'); return; }
    try {
      await busy(b, async () => { await api('uploadPricelist', { id: b.dataset.pdfup, mime: 'application/pdf', base64: await fileToBase64(file) }); });
      toast('Pricelist PDF terpasang.', 'success'); await refresh();
    } catch (e) { toast(e.message, 'error'); }
  });
  $$('[data-pdfdel]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirmBox('Hapus pricelist PDF untuk jenis acara ini?', { danger: true, okLabel: 'Hapus PDF' })) return;
    try { await api('save', { entity: 'acara', values: { id: b.dataset.pdfdel, pdf_url: '' } }); toast('PDF dihapus.', 'success'); await refresh(); } catch (e) { toast(e.message, 'error'); }
  }));
}

/* ---------- Akun (admin & fotografer) ---------- */
async function tabAkun() {
  const [akun, tim] = await Promise.all([api('listAkun'), api('list', { entity: 'tim' })]);
  MG.akun = akun; MG.tim = tim;
  const aktifAdmin = akun.filter(a => a.peran === 'admin' && a.aktif === 'ya').length;
  $('#mg-body').innerHTML = `<div class="card"><div class="card-head"><div><h2>Akun Pengguna <span class="badge b-gray">${akun.length}</span></h2><p class="muted">Atur siapa yang bisa masuk. <b>Admin</b> mengelola semuanya; <b>Fotografer</b> hanya melihat jadwal tugasnya sendiri (hanya baca).</p></div><button class="btn btn-primary" id="ak-add">${ic('plus')} Tambah Akun</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Username</th><th>Status akun</th><th>Terhubung ke tim</th><th>Aktif</th><th><span class="sr">Aksi</span></th></tr></thead><tbody>
    ${akun.map(a => { const me = a.id === S.user.uid; return `<tr class="${a.aktif === 'ya' ? '' : 'strike'}">
      <td data-label="Nama"><b>${esc(a.nama)}</b>${me ? ' <span class="badge b-accent">Anda</span>' : ''}${a.wajib_ganti === 'ya' ? '<span class="sub">Belum ganti password awal</span>' : ''}</td>
      <td data-label="Username" class="mono">${esc(a.username)}</td>
      <td data-label="Status">${a.peran === 'admin' ? '<span class="badge b-accent"><i></i>Admin</span>' : '<span class="badge b-green"><i></i>Fotografer</span>'}</td>
      <td data-label="Tim">${a.tim_nama ? esc(a.tim_nama) : '<span class="muted">—</span>'}</td>
      <td data-label="Aktif">${a.aktif === 'ya' ? '<span class="badge b-green"><i></i>Aktif</span>' : '<span class="badge b-gray"><i></i>Nonaktif</span>'}</td>
      <td class="nolabel"><div class="acts"><button class="btn btn-outline btn-icon" data-ake="${esc(a.id)}" aria-label="Ubah akun ${esc(a.username)}">${ic('edit')}</button>
        <button class="btn btn-outline btn-icon" data-akd="${esc(a.id)}" aria-label="Hapus akun ${esc(a.username)}" ${me ? 'disabled' : ''}>${ic('trash')}</button></div></td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="muted" style="margin-top:12px;font-size:12px">Akun admin aktif saat ini: ${aktifAdmin}. Minimal satu admin aktif harus selalu ada. Bila peran/status/password akun lain diubah, akun itu otomatis keluar dan harus masuk ulang.</p></div>`;
  const form = a => {
    const me = a && a.id === S.user.uid;
    modalForm({
      title: a ? `Ubah Akun ${a.username}` : 'Tambah Akun', wide: true,
      values: a ? { ...a, password: '' } : { peran: 'fotografer', aktif: 'ya' },
      fields: [
        { name: 'nama', label: 'Nama lengkap', required: true },
        { name: 'username', label: 'Username', required: true, autocomplete: 'off', hint: 'Huruf kecil, angka, titik, strip (3–30 karakter).' },
        { name: 'peran', label: 'Status akun', type: 'select', options: me ? [['admin', 'Admin']] : [['admin', 'Admin — kelola semuanya'], ['fotografer', 'Fotografer — lihat jadwal sendiri']] },
        { name: 'id_tim', label: 'Terhubung ke anggota tim', type: 'select', options: [['', '— Tidak ada —'], ...tim.map(t => [t.id, t.nama])], hint: 'Wajib untuk Fotografer. Untuk Admin, isi bila ia juga ikut bertugas memotret.' },
        { name: 'password', label: a ? 'Password baru (kosongkan jika tidak diganti)' : 'Password awal (min. 8 karakter)', type: 'password', required: !a, autocomplete: 'new-password' },
        ...(me ? [] : [{ name: 'aktif', label: 'Akun aktif (boleh masuk)', type: 'checkbox' }])
      ],
      onSubmit: async v => {
        const r = await api('saveAkun', { ...v, id: a?.id, aktif: me ? 'ya' : v.aktif });
        if (me) { S.user.nama = r.nama; S.user.username = r.username; saveSession(); renderChrome(); }
        toast(a ? 'Akun diperbarui.' : 'Akun dibuat. Pengguna diminta mengganti password saat masuk pertama.', 'success');
        await tabAkun();
      }
    });
  };
  $('#ak-add').addEventListener('click', () => form());
  $$('[data-ake]').forEach(b => b.addEventListener('click', () => form(akun.find(x => x.id === b.dataset.ake))));
  $$('[data-akd]').forEach(b => b.addEventListener('click', async () => {
    const a = akun.find(x => x.id === b.dataset.akd);
    if (!await confirmBox(`Hapus akun <b>${esc(a.username)}</b> (${esc(a.nama)})? Orang ini tidak bisa masuk lagi. Data tim dan jadwalnya tidak ikut terhapus.`, { danger: true, okLabel: 'Hapus akun' })) return;
    try { await api('removeAkun', { id: a.id }); toast('Akun dihapus.', 'success'); await tabAkun(); } catch (e) { toast(e.message, 'error'); }
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
  const heroFb = (S.pub?.portofolio || []).find(x => safeUrl(x.url_tampil));
  const heroSrc = safeUrl(c.hero_url) || (heroFb ? heroFb.url_tampil : '');
  const sc = Number(c.hero_scale) || 100, px = c.hero_posx === '' ? 50 : Number(c.hero_posx), py = c.hero_posy === '' ? 50 : Number(c.hero_posy);
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
      <section class="card" id="hero-card"><div class="card-head"><h3>Foto Utama Halaman Depan</h3></div>
        <p class="muted" style="margin-bottom:12px">Atur zoom dan titik fokus agar bagian terbaik foto tampil di bingkai. Pratinjau di bawah sama dengan tampilan di etalase.</p>
        <div class="hero-edit">
          <div class="hero-prev"><div class="hero-art">${heroSrc ? `<img id="hp-img" src="${esc(heroSrc)}" alt="Pratinjau foto utama" referrerpolicy="no-referrer" style="${heroImgStyle(sc, px, py)}">` : ic('camera')}</div></div>
          <div class="stack" style="--gap:12px">
            <div class="field"><label for="hp-sc">Zoom: <b id="hp-sc-v">${sc}%</b></label><input type="range" id="hp-sc" min="100" max="250" step="5" value="${sc}"></div>
            <div class="field"><label for="hp-x">Posisi horizontal: <b id="hp-x-v">${px}%</b></label><input type="range" id="hp-x" min="0" max="100" step="1" value="${px}"></div>
            <div class="field"><label for="hp-y">Posisi vertikal: <b id="hp-y-v">${py}%</b></label><input type="range" id="hp-y" min="0" max="100" step="1" value="${py}"></div>
            ${c.hero_url ? '' : '<p class="muted" style="font-size:12px">Belum ada foto utama khusus: etalase memakai foto pertama portofolio.</p>'}
            <input type="file" id="hero-file" accept="image/jpeg,image/png,image/webp" hidden>
            <div class="row"><button class="btn btn-outline btn-sm" id="hero-up">${ic('upload')} ${c.hero_url ? 'Ganti Foto' : 'Unggah Foto'}</button>
              ${c.hero_url ? `<button class="btn btn-ghost btn-sm" id="hero-del" style="color:var(--red)">${ic('trash')} Hapus</button>` : ''}
              <button class="btn btn-ghost btn-sm" id="hero-reset">Atur ulang</button><span style="flex:1"></span><button class="btn btn-primary btn-sm" id="hero-save">Simpan</button></div>
          </div></div></section>
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
  // ---- foto utama: pratinjau langsung ----
  const upd = () => {
    const a = $('#hp-sc').value, x = $('#hp-x').value, y = $('#hp-y').value;
    $('#hp-sc-v').textContent = a + '%'; $('#hp-x-v').textContent = x + '%'; $('#hp-y-v').textContent = y + '%';
    const im = $('#hp-img'); if (im) im.setAttribute('style', heroImgStyle(a, x, y));
  };
  ['hp-sc', 'hp-x', 'hp-y'].forEach(id => $('#' + id).addEventListener('input', upd));
  $('#hero-reset').addEventListener('click', () => { $('#hp-sc').value = 100; $('#hp-x').value = 50; $('#hp-y').value = 50; upd(); });
  $('#hero-save').addEventListener('click', async e => {
    try { await busy(e.currentTarget, () => api('saveConfig', { values: { hero_scale: $('#hp-sc').value, hero_posx: $('#hp-x').value, hero_posy: $('#hp-y').value } })); toast('Foto utama disimpan.', 'success'); await loadPublic(true).catch(() => {}); }
    catch (x) { toast(x.message, 'error'); }
  });
  const hf = $('#hero-file');
  $('#hero-up').addEventListener('click', () => hf.click());
  hf.addEventListener('change', async () => {
    if (!hf.files[0]) return;
    try { const img = await compressImage(hf.files[0], 1800, 0.86); await api('uploadHero', { base64: img.base64, mime: img.mime }); toast('Foto utama diunggah. Atur zoom lalu simpan.', 'success'); await loadPublic(true).catch(() => {}); await tabPengaturan(); }
    catch (e) { toast(e.message, 'error'); }
    hf.value = '';
  });
  $('#hero-del')?.addEventListener('click', async () => {
    if (!await confirmBox('Hapus foto utama? Etalase akan memakai foto pertama portofolio.', { danger: true, okLabel: 'Hapus' })) return;
    try { await api('clearHero'); toast('Foto utama dihapus.', 'success'); await loadPublic(true).catch(() => {}); await tabPengaturan(); } catch (e) { toast(e.message, 'error'); }
  });
  $('#pw-btn').addEventListener('click', () => modalForm({
    title: 'Ganti Password', submitLabel: 'Simpan',
    fields: [{ name: 'lama', label: 'Password saat ini', type: 'password', required: true, autocomplete: 'current-password', full: true }, { name: 'baru', label: 'Password baru (min. 8 karakter)', type: 'password', required: true, autocomplete: 'new-password', full: true }],
    onSubmit: async v => { await api('changePassword', v); toast('Password berhasil diganti.', 'success'); }
  }));
}
