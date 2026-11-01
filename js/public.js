'use strict';
/* ============================================================
   HALAMAN PUBLIK — etalase, booking, unduh hasil, testimoni, login
   ============================================================ */
let galFilter = 'Semua';

async function loadPublic(force) {
  if (!S.pub) {
    try { S.pub = JSON.parse(localStorage.getItem('sp_pub') || 'null'); } catch (e) { S.pub = null; }
    if (S.pub && !Array.isArray(S.pub.acara)) S.pub = null; // cache versi lama (masih berisi paket)
  }
  const fresh = apiPublic().then(p => {
    const changed = JSON.stringify(p) !== JSON.stringify(S.pub);
    S.pub = p;
    try { localStorage.setItem('sp_pub', JSON.stringify(p)); } catch (e) { /* abaikan */ }
    return changed;
  });
  if (S.pub && !force) { fresh.then(changed => { if (changed) { renderChrome(); if (currentPath() === '/etalase') renderEtalase(true); } }).catch(() => {}); return; }
  await fresh;
}

const stars = n => `<span class="stars" role="img" aria-label="${n} dari 5 bintang">${Array.from({ length: 5 }, (_, i) => `<span style="opacity:${i < n ? 1 : .25}">${ic('star')}</span>`).join('')}</span>`;
const acaraNames = () => (S.pub?.acara || []).map(a => a.nama);

/** Gaya foto utama: zoom (skala) + titik fokus. Dipakai di etalase dan pratinjau pengaturan admin. */
function heroImgStyle(scale, x, y) {
  const sc = Math.min(250, Math.max(100, Number(scale) || 100)) / 100;
  const px = Math.min(100, Math.max(0, Number(x ?? 50))), py = Math.min(100, Math.max(0, Number(y ?? 50)));
  return `transform:scale(${sc});transform-origin:${px}% ${py}%;object-position:${px}% ${py}%`;
}

async function renderEtalase(soft) {
  const app = $('#app');
  const y = window.scrollY;
  if (!S.pub) {
    app.innerHTML = `<div class="wrap section"><div class="skeleton" style="height:340px"></div><div class="skeleton" style="height:240px;margin-top:20px"></div></div>`;
    try { await loadPublic(true); } catch (e) { app.innerHTML = `<div class="wrap section"><div class="card empty">${ic('alert', 32)}<p>${esc(e.message)}</p><button class="btn btn-primary" style="margin-top:14px" onclick="renderEtalase()">Coba lagi</button></div></div>`; return; }
  }
  const { config: c, acara, portofolio, testimoni } = S.pub;
  const cats = ['Semua', ...new Set(portofolio.map(p => p.kategori).filter(Boolean))];
  if (!cats.includes(galFilter)) galFilter = 'Semua';
  const fallback = portofolio.find(p => safeUrl(p.url_tampil));
  const heroSrc = safeUrl(c.hero_url) || (fallback ? fallback.url_tampil : '');
  const draft = (() => { try { return JSON.parse(localStorage.getItem('sp_draft') || '{}'); } catch (e) { return {}; } })();
  const marquee = acara.length ? [...acara, ...acara].map(a => `<span>${esc(a.nama)}</span>`).join('<i aria-hidden="true">✦</i>') : '';

  app.innerHTML = `
  <div class="wrap">
    <section class="hero" aria-labelledby="h-hero">
      <div class="hero-copy">
        <span class="eyebrow">${esc(c.tagline || 'Studio fotografi')}</span>
        <h1 id="h-hero">Abadikan Momen <em>Berharga</em> dengan Estetika Abadi.</h1>
        <p class="lead">Dari pernikahan hingga tradisi keluarga. Pilih jenis acara Anda, kirim booking, dan terima hasil foto lewat Google Drive.</p>
        <div class="row">
          <button class="btn btn-primary" data-scroll="booking">Booking Sesi Foto ${ic('arrow')}</button>
          <button class="btn btn-outline" data-scroll="acara">Lihat Pricelist</button>
        </div>
        <dl class="hero-stats">
          <div><dt>${acara.length || '—'}</dt><dd>Jenis acara</dd></div>
          <div><dt>${portofolio.length || '—'}</dt><dd>Karya pilihan</dd></div>
          <div><dt>1 hari</dt><dd>Respons admin</dd></div>
        </dl>
      </div>
      <div class="hero-art-wrap">
        <div class="hero-art">${heroSrc ? `<img src="${esc(heroSrc)}" alt="Foto utama ${esc(c.nama_usaha)}" referrerpolicy="no-referrer" style="${heroImgStyle(c.hero_scale, c.hero_posx, c.hero_posy)}" fetchpriority="high">` : ic('camera')}</div>
        <span class="hero-ring" aria-hidden="true"></span>
        <div class="hero-tag"><span class="cap">${esc(c.nama_usaha)}</span><div class="serif" style="font-size:15px">Studio Fotografi</div></div>
      </div>
    </section>

    ${marquee ? `<div class="marquee" aria-label="Jenis acara yang kami layani"><div class="marquee-track">${marquee}</div></div>` : ''}

    <div class="chips" aria-label="Keunggulan">
      <div class="chip"><span class="ic">${ic('calendar')}</span><div><b>Booking Online</b><span>Pilih tanggal sendiri</span></div></div>
      <div class="chip"><span class="ic">${ic('wa')}</span><div><b>Konfirmasi WhatsApp</b><span>Respons cepat</span></div></div>
      <div class="chip"><span class="ic">${ic('cloud')}</span><div><b>Hasil via Google Drive</b><span>Unduh kapan saja</span></div></div>
      <div class="chip"><span class="ic">${ic('file')}</span><div><b>Invoice Resmi</b><span>Transparan & rapi</span></div></div>
    </div>

    <section class="section" id="acara" aria-labelledby="h-acara">
      <div class="sec-head"><span class="eyebrow center">Jenis acara & pricelist</span><h2 id="h-acara">Pilih Acara Anda</h2><p>Unduh pricelist (PDF) untuk melihat detail layanan. Biaya final disampaikan admin saat konfirmasi booking, sesuai kebutuhan acara Anda.</p></div>
      <div class="acara-grid">
        ${acara.length ? acara.map((a, i) => `
        <article class="acara-card">
          <span class="acara-no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <h3>${esc(a.nama)}</h3>
          <p class="muted">${esc(a.deskripsi || '')}</p>
          <div class="acara-actions">
            ${safeUrl(a.pdf_url) ? `<button class="btn btn-primary btn-sm" data-pdf="${i}">${ic('file')} Lihat Pricelist</button>` : '<span class="badge b-gray"><i></i>Pricelist segera hadir</span>'}
            <button class="btn btn-outline btn-sm" data-pick="${esc(a.nama)}">Booking ${ic('arrow')}</button>
          </div>
        </article>`).join('') : `<div class="card empty" style="grid-column:1/-1">${ic('file', 32)}<p>Jenis acara akan segera tersedia.</p></div>`}
      </div>
    </section>

    <section class="section" id="portofolio" aria-labelledby="h-porto">
      <div class="sec-head"><span class="eyebrow center">Galeri pilihan</span><h2 id="h-porto">Portofolio Karya ${esc(c.nama_usaha)}</h2></div>
      <div class="pills" role="group" aria-label="Filter kategori" style="justify-content:center;margin-bottom:26px">
        ${cats.map(k => `<button class="pill" data-cat="${esc(k)}" aria-pressed="${k === galFilter}">${esc(k)}</button>`).join('')}
      </div>
      <div class="gal" id="gal"></div>
    </section>

    <section class="section" id="booking" aria-labelledby="h-book">
      <div class="sec-head"><span class="eyebrow center">Reservasi</span><h2 id="h-book">Atur Tanggal & Sesi Pemotretan Anda</h2></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));align-items:start">
        <div class="card stack">
          <p class="muted">Cukup pilih jenis acara. Tidak perlu memilih paket: admin akan menghubungi Anda lewat WhatsApp untuk konfirmasi jadwal, biaya, dan DP.</p>
          <div class="steps">
            <div class="step"><span class="n">1</span><div><b>Kirim formulir booking</b><p class="muted">Pilih jenis acara, tanggal, dan lokasi.</p></div></div>
            <div class="step"><span class="n">2</span><div><b>Terima Kode Booking & konfirmasi</b><p class="muted">Admin menyampaikan biaya dan DP. Simpan kode booking Anda.</p></div></div>
            <div class="step"><span class="n">3</span><div><b>Sesi foto & unduh hasil</b><p class="muted">Hasil dikirim lewat folder Google Drive.</p></div></div>
          </div>
          <div class="notice">${ic('pin')}<div><b>${esc(c.nama_usaha)}</b><br>${esc(c.alamat || '')}${c.jam_buka ? '<br>' + esc(c.jam_buka) : ''}</div></div>
        </div>
        <div class="card" id="booking-card">${bookingFormHTML(acara, draft)}</div>
      </div>
    </section>

    <section class="section" id="hasil" aria-labelledby="h-hasil">
      <div class="sec-head"><span class="eyebrow center">Akses klien mandiri</span><h2 id="h-hasil">Portal Unduh Hasil Foto</h2><p>Masukkan kode booking dan nomor WhatsApp yang Anda daftarkan.</p></div>
      <div class="card" style="max-width:760px;margin:0 auto">
        <form id="form-hasil" class="form-grid" novalidate>
          <div class="field"><label for="h_kode">Kode Booking</label><input class="input mono" id="h_kode" name="kode" placeholder="SANS-2026-001" autocomplete="off" required></div>
          <div class="field"><label for="h_wa">No. WhatsApp</label><input class="input" id="h_wa" name="whatsapp" type="tel" inputmode="tel" placeholder="08123456789" autocomplete="tel" required></div>
          <div class="full"><button class="btn btn-accent btn-block" type="submit">${ic('download')} Buka Folder Hasil Foto</button></div>
        </form>
        <div id="hasil-out" style="margin-top:14px" aria-live="polite"></div>
      </div>
    </section>

    <section class="section" id="testimoni" aria-labelledby="h-testi">
      <div class="sec-head"><span class="eyebrow center">Cerita mereka</span><h2 id="h-testi">Pengalaman Klien Bersama ${esc(c.nama_usaha)}</h2></div>
      <div class="grid g3">
        ${testimoni.length ? testimoni.slice(0, 6).map(t => `<figure class="card quote" style="margin:0">${stars(t.rating)}<p>${esc(t.isi)}</p><figcaption><b>${esc(t.nama)}</b></figcaption></figure>`).join('')
      : `<div class="card empty" style="grid-column:1/-1">${ic('star', 32)}<p>Jadilah yang pertama memberi testimoni.</p></div>`}
      </div>
      <div style="text-align:center;margin-top:22px"><button class="btn btn-outline" id="btn-testi">${ic('edit')} Tulis Testimoni</button></div>
    </section>
  </div>`;

  renderGallery();
  wireEtalase();
  if (soft) window.scrollTo(0, y);
}

function bookingFormHTML(acara, d = {}) {
  const val = k => esc(d[k] || '');
  return `<form id="form-booking" class="form-grid" novalidate>
    <div class="field"><label for="b_nama">Nama Lengkap *</label><input class="input" id="b_nama" name="nama" value="${val('nama')}" placeholder="Contoh: Rina Pratama" autocomplete="name" required></div>
    <div class="field"><label for="b_wa">No. WhatsApp Aktif *</label><input class="input" id="b_wa" name="whatsapp" type="tel" inputmode="tel" value="${val('whatsapp')}" placeholder="08123456789" autocomplete="tel" required></div>
    <div class="field"><label for="b_email">Email</label><input class="input" id="b_email" name="email" type="email" value="${val('email')}" placeholder="nama@email.com" autocomplete="email"></div>
    <div class="field"><label for="b_tgl">Tanggal Acara *</label><input class="input" id="b_tgl" name="tanggal" type="date" min="${todayStr()}" value="${val('tanggal')}" required></div>
    <fieldset class="field full fieldset"><legend>Jenis Acara *</legend>
      ${acara.length ? `<div class="opt-chips" role="radiogroup">${acara.map(a => `<label class="opt"><input type="radio" name="jenis_acara" value="${esc(a.nama)}" ${d.jenis_acara === a.nama ? 'checked' : ''}><span>${esc(a.nama)}</span></label>`).join('')}</div>`
        : '<p class="muted">Jenis acara belum tersedia. Silakan hubungi kami lewat WhatsApp.</p>'}
    </fieldset>
    <div class="field"><label for="b_jam">Jam Mulai</label><input class="input" id="b_jam" name="jam" type="time" value="${esc(d.jam || '09:00')}"></div>
    <div class="field"><label for="b_lok">Lokasi Pemotretan</label><input class="input" id="b_lok" name="lokasi" value="${val('lokasi')}" placeholder="Studio, gedung, rumah, dll."></div>
    <div class="field full"><label for="b_cat">Catatan / Referensi Gaya</label><textarea class="input" id="b_cat" name="catatan" rows="3" placeholder="Konsep, tema warna, jumlah orang, dll.">${val('catatan')}</textarea></div>
    <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="full form-error" hidden></div>
    <div class="full"><button class="btn btn-primary btn-block" type="submit">Kirim Permintaan Booking Sekarang</button>
    <p class="muted" style="font-size:12px;margin-top:8px;text-align:center">Data tidak hilang jika koneksi terputus. Draf formulir tersimpan di perangkat Anda.</p></div>
  </form>`;
}

function renderGallery() {
  const g = $('#gal'); if (!g) return;
  const list = S.pub.portofolio.filter(p => galFilter === 'Semua' || p.kategori === galFilter);
  if (!list.length) {
    g.innerHTML = S.pub.portofolio.length ? '' : Array.from({ length: 6 }, (_, i) => `<div class="gal-item r${i % 3}"><div class="gal-ph">${ic('image')}</div><div class="cap-b"><small>Segera hadir</small><b>Portofolio ${i + 1}</b></div></div>`).join('');
    return;
  }
  g.innerHTML = list.map((p, i) => `<button class="gal-item r${i % 3}" data-i="${i}" aria-label="Perbesar foto: ${esc(p.judul)}">
    ${safeUrl(p.url_tampil) ? `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(p.url_tampil)}" alt="${esc(p.judul)}">` : `<div class="gal-ph">${ic('image')}</div>`}
    <div class="cap-b"><small>${esc(p.kategori)}</small><b>${esc(p.judul)}</b></div></button>`).join('');
  $$('img', g).forEach(im => im.addEventListener('error', () => { im.replaceWith(Object.assign(document.createElement('div'), { className: 'gal-ph', innerHTML: ic('image') })); }));
  $$('.gal-item', g).forEach(b => b.addEventListener('click', () => openLightbox(list, Number(b.dataset.i))));
}

function openLightbox(list, idx) {
  const show = () => {
    const p = list[idx];
    openModal(`<div class="lightbox">
      <button class="btn btn-ghost btn-icon" data-close aria-label="Tutup" style="position:absolute;right:0;top:-44px;color:#fff">${ic('x')}</button>
      <img src="${esc(p.url_tampil)}" alt="${esc(p.judul)}" referrerpolicy="no-referrer">
      <div class="lb-cap">${esc(p.judul)} <span style="opacity:.7;font-size:12px">· ${esc(p.kategori)}</span></div>
      ${list.length > 1 ? `<button class="lb-btn" data-nav="-1" aria-label="Sebelumnya" style="left:-8px">${ic('left')}</button><button class="lb-btn" data-nav="1" aria-label="Berikutnya" style="right:-8px">${ic('right')}</button>` : ''}
    </div>`, { dark: true });
    $$('[data-nav]').forEach(b => b.addEventListener('click', () => { idx = (idx + Number(b.dataset.nav) + list.length) % list.length; show(); }));
  };
  show();
}
document.addEventListener('keydown', e => {
  if (!$('.lightbox')) return;
  if (e.key === 'ArrowRight') $('[data-nav="1"]')?.click();
  if (e.key === 'ArrowLeft') $('[data-nav="-1"]')?.click();
});

function scrollToSection(id) {
  const go = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (currentPath() !== '/etalase') { navigate('/etalase'); setTimeout(go, 350); } else go();
}

function pilihAcara(nama) {
  const r = $$('input[name=jenis_acara]').find(x => x.value === nama);
  if (r) { r.checked = true; saveDraft(); }
  scrollToSection('booking');
}

function openPricelist(a) {
  const c = S.pub.config, url = safeUrl(a.pdf_url), id = a.pdf_id;
  const tanya = c.nomor_wa_admin ? waLink(c.nomor_wa_admin, `Halo ${c.nama_usaha}, saya ingin bertanya tentang pricelist ${a.nama}.`) : '';
  openModal(`<div class="modal-head"><h2>Pricelist ${esc(a.nama)}</h2><button class="btn btn-ghost btn-icon" data-close aria-label="Tutup">${ic('x')}</button></div>
    ${id ? `<iframe class="pdf-frame" src="https://drive.google.com/file/d/${encodeURIComponent(id)}/preview" title="Pricelist ${esc(a.nama)}" loading="lazy"></iframe>`
      : `<div class="notice">${ic('file')}<div>Pratinjau tidak tersedia untuk berkas ini. Silakan buka di tab baru.</div></div>`}
    <div class="modal-foot">
      <a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="${esc(url)}">${ic('link')} Buka di tab baru</a>
      ${id ? `<a class="btn btn-outline" target="_blank" rel="noopener noreferrer" href="https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}">${ic('download')} Unduh PDF</a>` : ''}
      ${tanya ? `<a class="btn btn-wa" target="_blank" rel="noopener" href="${esc(tanya)}">${ic('wa')} Tanya via WhatsApp</a>` : ''}
      <button class="btn btn-primary" data-pick-modal>Booking ${esc(a.nama)} ${ic('arrow')}</button>
    </div>`, { wide: true });
  $('[data-pick-modal]').addEventListener('click', () => { closeModal(); pilihAcara(a.nama); });
}

function wireEtalase() {
  $$('[data-scroll]').forEach(b => b.addEventListener('click', () => scrollToSection(b.dataset.scroll)));
  $$('[data-cat]').forEach(b => b.addEventListener('click', () => {
    galFilter = b.dataset.cat;
    $$('[data-cat]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderGallery();
  }));
  $$('[data-pick]').forEach(b => b.addEventListener('click', () => pilihAcara(b.dataset.pick)));
  $$('[data-pdf]').forEach(b => b.addEventListener('click', () => openPricelist(S.pub.acara[Number(b.dataset.pdf)])));

  const form = $('#form-booking');
  if (form) {
    form.addEventListener('input', debounce(saveDraft, 400));
    form.addEventListener('submit', submitBooking);
  }
  $('#form-hasil')?.addEventListener('submit', submitHasil);
  $('#btn-testi')?.addEventListener('click', openTestimoniForm);
}

function saveDraft() {
  const f = $('#form-booking'); if (!f) return;
  const o = Object.fromEntries(new FormData(f)); delete o.website;
  try { localStorage.setItem('sp_draft', JSON.stringify(o)); } catch (e) { /* abaikan */ }
}

function saveDraft() {
  const f = $('#form-booking'); if (!f) return;
  const o = Object.fromEntries(new FormData(f)); delete o.website;
  try { localStorage.setItem('sp_draft', JSON.stringify(o)); } catch (e) { /* abaikan */ }
}

async function submitBooking(e) {
  e.preventDefault();
  const f = e.target, err = $('.form-error', f), btn = $('[type=submit]', f);
  err.hidden = true;
  const d = Object.fromEntries(new FormData(f));
  if (!d.nama.trim() || !d.whatsapp.trim() || !d.tanggal || !d.jenis_acara) { err.textContent = 'Lengkapi nama, WhatsApp, jenis acara, dan tanggal terlebih dahulu.'; err.hidden = false; return; }
  try {
    const r = await busy(btn, () => api('createBooking', d));
    try { localStorage.removeItem('sp_draft'); } catch (x) { /* abaikan */ }
    const wa = S.pub.config.nomor_wa_admin;
    const msg = `Halo ${S.pub.config.nama_usaha}, saya ${r.nama}. Saya sudah mengisi form booking dengan kode ${r.kode_booking} (${d.jenis_acara}, ${fmtTgl(d.tanggal)}). Mohon info konfirmasi jadwal dan biayanya.`;
    $('#booking-card').innerHTML = `<div style="text-align:center;padding:12px 0">
      <div class="avatar" style="width:56px;height:56px;margin:0 auto 12px;background:var(--green-soft);color:var(--green)">${ic('check', 28)}</div>
      <h3 class="serif" style="font-size:22px">Booking Terkirim!</h3>
      <p class="muted" style="margin-top:6px">Simpan kode booking berikut. Anda membutuhkannya untuk mengunduh hasil foto. Admin akan menghubungi Anda lewat WhatsApp untuk konfirmasi jadwal, biaya, dan DP.</p>
      <div class="code-box" id="kode-out">${esc(r.kode_booking)}</div>
      <div class="row" style="justify-content:center">
        <button class="btn btn-outline" id="btn-copy">${ic('copy')} Salin Kode</button>
        ${wa ? `<a class="btn btn-wa" target="_blank" rel="noopener" href="${esc(waLink(wa, msg))}">${ic('wa')} Konfirmasi via WhatsApp</a>` : ''}
      </div></div>`;
    $('#btn-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(r.kode_booking); toast('Kode disalin.', 'success'); } catch (x) { toast('Salin manual: ' + r.kode_booking); } });
    toast('Booking berhasil dikirim.', 'success');
  } catch (x) { err.textContent = x.message; err.hidden = false; }
}

async function submitHasil(e) {
  e.preventDefault();
  const f = e.target, out = $('#hasil-out'), btn = $('[type=submit]', f);
  const d = Object.fromEntries(new FormData(f));
  out.innerHTML = '';
  try {
    const r = await busy(btn, () => api('lookupHasil', d));
    const link = safeUrl(r.link);
    out.innerHTML = r.ready && link
      ? `<div class="notice" style="background:var(--green-soft);color:var(--green-text)">${ic('check')}<div style="flex:1"><b>Halo, ${esc(r.nama)}!</b> Hasil foto Anda sudah siap.</div><a class="btn btn-accent btn-sm" target="_blank" rel="noopener noreferrer" href="${esc(link)}">${ic('download')} Buka Folder</a></div>`
      : `<div class="notice" style="background:var(--amber-soft);color:var(--amber-text)">${ic('clock')}<div><b>Halo, ${esc(r.nama)}.</b> Hasil foto Anda belum tersedia. Kami akan menghubungi Anda saat sudah siap.</div></div>`;
  } catch (x) { out.innerHTML = `<div class="form-error">${esc(x.message)}</div>`; }
}

function openTestimoniForm() {
  modalForm({
    title: 'Tulis Testimoni', submitLabel: 'Kirim Testimoni',
    intro: 'Testimoni akan tampil setelah disetujui admin.',
    fields: [
      { name: 'nama', label: 'Nama', required: true, full: true },
      { name: 'rating', label: 'Penilaian', type: 'select', options: [[5, '★★★★★ — Sangat puas'], [4, '★★★★ — Puas'], [3, '★★★ — Cukup'], [2, '★★ — Kurang'], [1, '★ — Buruk']], value: 5 },
      { name: 'isi', label: 'Pengalaman Anda', type: 'textarea', required: true, hint: 'Minimal 10 karakter.' }
    ],
    onSubmit: async v => { await api('submitTestimoni', v); toast('Terima kasih! Testimoni menunggu persetujuan admin.', 'success'); }
  });
}

/* ---------- Login ---------- */
function renderLogin() {
  if (S.token) { navigate(isAdmin() ? '/dashboard' : '/jadwal'); return; }
  $('#app').innerHTML = `<div class="wrap section" style="max-width:460px">
    <div class="card">
      <div style="text-align:center;margin-bottom:18px"><div class="avatar" style="width:48px;height:48px;margin:0 auto 10px">${ic('lock', 22)}</div>
        <h1 class="serif" style="font-size:26px">Masuk Tim Studio</h1><p class="muted">Khusus admin dan fotografer ${esc(S.pub?.config.nama_usaha || 'Sans Photo')}.</p></div>
      <form id="form-login" class="stack" novalidate>
        <div class="field"><label for="l_u">Username</label><input class="input" id="l_u" name="username" autocomplete="username" autocapitalize="none" required></div>
        <div class="field"><label for="l_p">Password</label><input class="input" id="l_p" name="password" type="password" autocomplete="current-password" required></div>
        <div class="form-error" hidden></div>
        <button class="btn btn-primary btn-block" type="submit">Masuk</button>
      </form>
    </div></div>`;
  $('#form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, err = $('.form-error', f), btn = $('[type=submit]', f);
    err.hidden = true;
    const d = Object.fromEntries(new FormData(f));
    try {
      const r = await busy(btn, () => api('login', d));
      S.token = r.token; S.user = { ...r.user, wajib_ganti: !!r.wajib_ganti }; saveSession(); renderChrome();
      navigate(r.user.role === 'admin' ? '/dashboard' : '/jadwal'); // dialog ganti password dibuka oleh router setelah halaman tampil
    } catch (x) { err.textContent = x.message; err.hidden = false; }
  });
}

function forcePasswordChange() {
  modalForm({
    title: 'Ganti Password Awal', submitLabel: 'Simpan Password Baru', dismiss: false,
    intro: 'Demi keamanan, ganti password bawaan sebelum melanjutkan.',
    fields: [
      { name: 'lama', label: 'Password saat ini', type: 'password', required: true, autocomplete: 'current-password', full: true },
      { name: 'baru', label: 'Password baru (min. 8 karakter)', type: 'password', required: true, autocomplete: 'new-password', full: true }
    ],
    onSubmit: async v => { await api('changePassword', v); if (S.user) { S.user.wajib_ganti = false; saveSession(); } toast('Password berhasil diganti.', 'success'); }
  });
}
