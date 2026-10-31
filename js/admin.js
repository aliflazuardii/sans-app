'use strict';
/* ============================================================
   DASHBOARD ADMIN & MANAJEMEN BOOKING
   ============================================================ */
const BK = { list: [], paket: [], page: 1, per: 8, f: { q: '', status: '', jenis: '', dari: '', sampai: '' } };
let charts = {};
let CAL = null;

function killCharts() {
  Object.values(charts).forEach(c => c && c.destroy());
  charts = {};
  if (CAL) { CAL.destroy(); CAL = null; }
}
function chartTheme() {
  const cs = getComputedStyle(document.documentElement);
  return { text: cs.getPropertyValue('--text2').trim() || '#4B5563', grid: cs.getPropertyValue('--line').trim() || '#E5E7EB' };
}
const skeletonPage = () => `<div class="wrap-admin"><div class="skeleton" style="height:140px"></div><div class="grid g4" style="margin-top:16px">${'<div class="skeleton" style="height:130px"></div>'.repeat(4)}</div><div class="skeleton" style="height:360px;margin-top:16px"></div></div>`;

const STATUS_BOOKING = ['Baru', 'Dikonfirmasi', 'Selesai', 'Batal'];

function waBooking(b) {
  const studio = S.pub?.config.nama_usaha || 'Sans Photo';
  return waLink(b.whatsapp, `Halo ${b.nama}, terima kasih telah booking di ${studio}. Kami ingin mengonfirmasi booking ${b.kode_booking} untuk ${b.jenis_acara} pada ${fmtTglPanjang(b.tanggal)} pukul ${b.jam}. Apakah jadwal tersebut sudah sesuai?`);
}
function waReminderKlien(j) {
  const studio = S.pub?.config.nama_usaha || 'Sans Photo';
  return waLink(j.klien_wa, `Halo ${j.klien || ''}, mengingatkan jadwal sesi foto Anda bersama ${studio}: ${fmtTglPanjang(j.tanggal)}, pukul ${j.jam_mulai}–${j.jam_selesai}${j.lokasi ? ' di ' + j.lokasi : ''}. Sampai jumpa!`);
}
function waReminderFotografer(j) {
  return waLink(j.fotografer_wa, `Halo ${j.fotografer}, pengingat tugas: ${j.judul}. ${fmtTglPanjang(j.tanggal)}, pukul ${j.jam_mulai}–${j.jam_selesai}${j.lokasi ? ', lokasi: ' + j.lokasi : ''}. Mohon siapkan peralatan. Terima kasih!`);
}

async function renderDashboard() {
  $('#app').innerHTML = skeletonPage();
  const [d, list, paket] = await Promise.all([api('getDashboard'), api('listBookings'), api('list', { entity: 'paket' })]);
  BK.list = list; BK.paket = paket; BK.page = 1; BK.dash = d;
  const delta = d.pemasukan_lalu > 0 ? Math.round((d.pemasukan - d.pemasukan_lalu) / d.pemasukan_lalu * 100) : null;
  const pctSesi = Math.min(100, Math.round(d.sesi_bulan_ini / d.target_sesi * 1000) / 10);
  const jenisList = [...new Set(list.map(b => b.jenis_acara))];

  $('#app').innerHTML = `<div class="wrap-admin stack" style="--gap:16px">
    <section class="greet">
      <div><span class="tag"><span class="dot" style="background:#10B981"></span>SISTEM AKTIF</span> <span style="font-size:12px;color:#CBD5E1;margin-left:8px">${esc(fmtTglPanjang(d.today))}</span>
        <h1>Halo, ${esc(S.user.nama)}!</h1>
        <p>Berikut ringkasan studio hari ini. Ada <b>${d.booking_baru} booking baru</b> yang membutuhkan konfirmasi dan penugasan fotografer.</p></div>
      <div class="row"><button class="btn btn-outline" id="btn-rem">${ic('wa')} Kirim Pengingat WA</button><button class="btn btn-primary" id="btn-new-booking">${ic('plus')} Tambah Booking Manual</button></div>
    </section>

    <section class="grid g4" aria-label="Ringkasan">
      <div class="card kpi"><div class="top"><div><span class="cap">Booking baru</span><div class="val">${d.booking_baru} <small>booking</small></div></div><span class="ic ic-amber">${ic('file')}</span></div>
        <div class="row between"><span class="badge b-amber"><i></i>Menunggu konfirmasi</span><button class="btn btn-ghost btn-sm" id="btn-review">Review ${ic('right')}</button></div></div>
      <div class="card kpi"><div class="top"><div><span class="cap">Sesi bulan ini</span><div class="val">${d.sesi_bulan_ini} <small>sesi</small></div></div><span class="ic ic-blue">${ic('camera')}</span></div>
        <div><div class="row between muted" style="font-size:12px"><span>Target ${d.target_sesi} sesi/bln</span><b class="tnum">${pctSesi}%</b></div><div class="bar" style="margin-top:6px"><i style="width:${pctSesi}%"></i></div></div></div>
      <div class="card kpi"><div class="top"><div><span class="cap">Pendapatan bulan ini</span><div class="val tnum" style="font-size:24px">${rp(d.pemasukan)}</div></div><span class="ic ic-green">${ic('wallet')}</span></div>
        <div class="row between"><span class="badge ${delta !== null && delta < 0 ? 'b-red' : 'b-green'}">${delta === null ? 'Belum ada data bulan lalu' : (delta >= 0 ? '+' : '') + delta + '% vs bln lalu'}</span><span class="muted" style="font-size:12px">Uang masuk</span></div></div>
      <div class="card kpi"><div class="top"><div><span class="cap">Laba bersih</span><div class="val tnum" style="font-size:24px">${rp(d.laba)}</div></div><span class="ic ic-blue">${ic('wallet')}</span></div>
        <div class="row between"><span class="badge b-accent">Margin ${d.margin}%</span><span class="muted" style="font-size:12px">Biaya: ${rp(d.pengeluaran)}</span></div></div>
    </section>

    <div class="split split-dash">
      <section class="card" id="card-booking" aria-labelledby="h-bk">
        <div class="card-head"><div><h2 id="h-bk">Daftar Reservasi & Sesi Foto</h2><p class="muted">Kelola status pesanan, jadwal, dan tautan serah terima hasil foto.</p></div><span class="badge b-gray" id="bk-total"></span></div>
        <div class="filters">
          <div class="search-wrap"><span class="sr"><label for="bk-q">Cari</label></span>${ic('search')}<input class="input input-search" id="bk-q" placeholder="Cari nama klien / kode booking…" style="min-height:40px"></div>
          <select class="input" id="bk-status" aria-label="Filter status"><option value="">Semua Status</option>${STATUS_BOOKING.map(s => `<option>${s}</option>`).join('')}</select>
          <select class="input" id="bk-jenis" aria-label="Filter jenis acara"><option value="">Semua Acara</option>${jenisList.map(j => `<option>${esc(j)}</option>`).join('')}</select>
          <input class="input" type="date" id="bk-dari" aria-label="Dari tanggal" title="Dari tanggal acara">
          <input class="input" type="date" id="bk-sampai" aria-label="Sampai tanggal" title="Sampai tanggal acara">
        </div>
        <div id="bk-table" class="tbl-wrap"></div><div class="pager" id="bk-pager"></div>
      </section>

      <aside class="stack" style="--gap:16px">
        <section class="card" id="card-rem"><div class="card-head"><h3>Pengingat Jadwal</h3><span class="badge b-green">1 klik WA</span></div>
          ${d.upcoming.length ? d.upcoming.slice(0, 3).map(j => `<div class="rem" style="margin-bottom:10px">
            <div class="row between"><b>${esc(j.judul)}</b><span class="badge b-amber">${esc(daysLabel(j.tanggal, d.today))}</span></div>
            <div class="muted" style="font-size:12px">${esc(fmtTgl(j.tanggal, true))} · ${esc(j.jam_mulai)}–${esc(j.jam_selesai)}${j.fotografer ? ' · ' + esc(j.fotografer) : ''}</div>
            <div class="row">${j.klien_wa ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waReminderKlien(j))}">${ic('wa')} Klien</a>` : ''}${j.fotografer_wa ? `<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${esc(waReminderFotografer(j))}">${ic('wa')} Fotografer</a>` : ''}</div></div>`).join('')
      : `<div class="empty" style="padding:16px">${ic('calendar', 28)}<p>Belum ada jadwal mendatang.</p></div>`}
        </section>
        <section class="card"><div class="card-head"><h3>Kapasitas Tim Hari Ini</h3><span class="muted" style="font-size:12px">${d.tim_hari_ini.length} fotografer</span></div>
          <div class="stack">${d.tim_hari_ini.map(t => `<div class="team-row"><span class="avatar" style="background:${esc(t.warna)};color:#fff">${esc(initials(t.nama))}</span><div class="grow"><b>${esc(t.nama)}</b><small>${esc(t.peran)}</small></div>
            <span class="badge ${t.sesi ? 'b-amber' : 'b-green'}">${t.sesi ? t.sesi + ' sesi hari ini' : 'Tersedia'}</span></div>`).join('') || '<p class="muted">Belum ada data tim.</p>'}</div></section>
        <section class="card"><div class="card-head"><h3>Arus Kas 6 Bulan</h3></div><div class="chart-box" style="height:220px"><canvas id="ch-dash" role="img" aria-label="Grafik pemasukan dan pengeluaran 6 bulan terakhir"></canvas></div></section>
      </aside>
    </div>
  </div>`;

  drawBarChart('ch-dash', d.chart.map(x => x.label), d.chart.map(x => x.pemasukan), d.chart.map(x => x.pengeluaran));
  $('#btn-new-booking').addEventListener('click', () => openBookingForm());
  $('#btn-rem').addEventListener('click', () => $('#card-rem').scrollIntoView({ behavior: 'smooth', block: 'center' }));
  $('#btn-review').addEventListener('click', () => { $('#bk-status').value = 'Baru'; BK.f.status = 'Baru'; BK.page = 1; renderBookingTable(); $('#card-booking').scrollIntoView({ behavior: 'smooth' }); });
  const upd = debounce(() => {
    BK.f = { q: $('#bk-q').value.trim().toLowerCase(), status: $('#bk-status').value, jenis: $('#bk-jenis').value, dari: $('#bk-dari').value, sampai: $('#bk-sampai').value };
    BK.page = 1; renderBookingTable();
  }, 150);
  ['bk-q', 'bk-status', 'bk-jenis', 'bk-dari', 'bk-sampai'].forEach(id => $('#' + id).addEventListener('input', upd));
  BK.f = { q: '', status: '', jenis: '', dari: '', sampai: '' };
  renderBookingTable();
}

function daysLabel(tgl, today) {
  const n = Math.round((dateObj(tgl) - dateObj(today)) / 86400000);
  return n === 0 ? 'Hari ini' : n === 1 ? 'Besok' : 'H-' + n;
}

function drawBarChart(canvasId, labels, masuk, keluar) {
  const el = document.getElementById(canvasId);
  if (!el || typeof Chart === 'undefined') return;
  const t = chartTheme();
  charts[canvasId] = new Chart(el, {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Pemasukan', data: masuk, backgroundColor: '#3B82F6', borderRadius: 6, maxBarThickness: 28 },
      { label: 'Pengeluaran', data: keluar, backgroundColor: '#EF4444', borderRadius: 6, maxBarThickness: 28 }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { color: t.text, usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${rp(c.parsed.y)}` } } },
      scales: { x: { ticks: { color: t.text }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: t.text, callback: v => v >= 1e6 ? (v / 1e6) + ' jt' : v >= 1e3 ? (v / 1e3) + ' rb' : v }, grid: { color: t.grid } } } }
  });
}

function filteredBookings() {
  const f = BK.f;
  return BK.list.filter(b =>
    (!f.q || b.nama.toLowerCase().includes(f.q) || b.kode_booking.toLowerCase().includes(f.q) || String(b.whatsapp).includes(f.q.replace(/\D/g, '') || '§')) &&
    (!f.status || b.status === f.status) && (!f.jenis || b.jenis_acara === f.jenis) &&
    (!f.dari || b.tanggal >= f.dari) && (!f.sampai || b.tanggal <= f.sampai));
}

function renderBookingTable() {
  const all = filteredBookings();
  const pages = Math.max(1, Math.ceil(all.length / BK.per));
  BK.page = Math.min(BK.page, pages);
  const rows = all.slice((BK.page - 1) * BK.per, BK.page * BK.per);
  $('#bk-total').textContent = `Total: ${BK.list.length} sesi`;
  $('#bk-table').innerHTML = rows.length ? `<table class="tbl"><thead><tr><th>Kode</th><th>Klien & kontak</th><th>Paket acara</th><th>Jadwal & fotografer</th><th>Pembayaran</th><th>Status</th><th><span class="sr">Aksi</span></th></tr></thead><tbody>
    ${rows.map(b => `<tr class="${b.status === 'Batal' ? 'strike' : ''}" style="${b.status === 'Batal' ? 'opacity:.65' : ''}">
      <td data-label="Kode"><span class="mono" style="font-weight:700">${esc(b.kode_booking)}</span></td>
      <td data-label="Klien"><b>${esc(b.nama)}</b><span class="sub">${esc(fmtWa(b.whatsapp))}</span></td>
      <td data-label="Paket">${esc(b.jenis_acara)}<span class="sub">${esc(b.nama_paket)} · ${rp(b.harga_paket)}</span></td>
      <td data-label="Jadwal">${esc(fmtTgl(b.tanggal))}<span class="sub">${esc(b.jam)} WIB · ${b.durasi_jam} jam</span><span class="sub">${b.fotografer ? esc(b.fotografer) : 'Belum ditugaskan'}</span></td>
      <td data-label="Bayar">${b.pembayaran ? badge(b.pembayaran.status) + `<span class="sub">Sisa ${rp(b.pembayaran.sisa)}</span>` : '-'}</td>
      <td data-label="Status">${badge(b.status)}</td>
      <td class="nolabel"><div class="acts">
        ${b.status === 'Baru' ? `<button class="btn btn-accent btn-sm" data-confirm="${esc(b.id)}" title="Konfirmasi booking">${ic('check')} Konfirmasi</button>` : ''}
        <a class="btn btn-wa btn-icon" target="_blank" rel="noopener" href="${esc(waBooking(b))}" aria-label="Chat WhatsApp ${esc(b.nama)}">${ic('wa')}</a>
        <button class="btn btn-outline btn-icon" data-invoice="${esc(b.id)}" aria-label="Invoice ${esc(b.kode_booking)}">${ic('file')}</button>
        <button class="btn btn-outline btn-icon" data-edit="${esc(b.id)}" aria-label="Ubah ${esc(b.kode_booking)}">${ic('edit')}</button></div></td></tr>`).join('')}
    </tbody></table>` : `<div class="empty">${ic('search', 32)}<p>${BK.list.length ? 'Tidak ada booking yang cocok dengan filter.' : 'Belum ada booking. Bagikan link web Anda atau tambah booking manual.'}</p></div>`;

  $('#bk-pager').innerHTML = `<span>Menampilkan <b>${rows.length}</b> dari <b>${all.length}</b> reservasi</span>
    <div class="pills">${Array.from({ length: pages }, (_, i) => `<button class="pill" data-pg="${i + 1}" aria-pressed="${i + 1 === BK.page}">${i + 1}</button>`).join('')}</div>`;
  $$('[data-pg]').forEach(b => b.addEventListener('click', () => { BK.page = Number(b.dataset.pg); renderBookingTable(); }));
  $$('[data-edit]').forEach(b => b.addEventListener('click', () => openBookingForm(BK.list.find(x => x.id === b.dataset.edit))));
  $$('[data-invoice]').forEach(b => b.addEventListener('click', () => showInvoice(b.dataset.invoice)));
  $$('[data-confirm]').forEach(b => b.addEventListener('click', async () => {
    try { await busy(b, () => api('saveBooking', { id: b.dataset.confirm, status: 'Dikonfirmasi' })); toast('Booking dikonfirmasi. Jadwal otomatis masuk ke kalender.', 'success'); renderDashboard(); }
    catch (e) { toast(e.message, 'error'); }
  }));
}

function bookingFields() {
  return [
    { name: 'nama', label: 'Nama klien', required: true },
    { name: 'whatsapp', label: 'WhatsApp', type: 'tel', required: true, placeholder: '08123456789' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'jenis_acara', label: 'Jenis acara', type: 'select', options: JENIS_ACARA },
    { name: 'tanggal', label: 'Tanggal acara', type: 'date', required: true },
    { name: 'jam', label: 'Jam mulai', type: 'time' },
    { name: 'durasi_jam', label: 'Durasi (jam)', type: 'number', min: 1, step: 1 },
    { name: 'id_paket', label: 'Paket', type: 'select', options: BK.paket.map(p => [p.id, `${p.nama_paket} — ${rp(p.harga)}`]) },
    { name: 'lokasi', label: 'Lokasi', full: true },
    { name: 'catatan', label: 'Catatan', type: 'textarea' },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_BOOKING },
    { name: 'link_hasil_foto', label: 'Link folder hasil foto (Google Drive)', type: 'url', placeholder: 'https://drive.google.com/…', hint: 'Tempel link folder (akses "siapa saja yang memiliki link"). Client membukanya lewat Portal Unduh.', full: true }
  ];
}

function openBookingForm(b) {
  const edit = !!b;
  const m = modalForm({
    title: edit ? `Ubah Booking ${b.kode_booking}` : 'Tambah Booking Manual', wide: true,
    fields: bookingFields(), values: edit ? b : { jenis_acara: 'Wedding', tanggal: todayStr(), jam: '09:00', durasi_jam: 2, status: 'Dikonfirmasi', id_paket: BK.paket[0]?.id },
    extra: edit ? `<div style="margin-top:14px"><button type="button" class="btn btn-ghost btn-sm" data-del style="color:var(--red)">${ic('trash')} Hapus booking ini</button></div>` : '',
    onSubmit: async v => {
      await api('saveBooking', { ...v, id: edit ? b.id : undefined });
      toast(edit ? 'Booking diperbarui.' : 'Booking ditambahkan.', 'success');
      if (currentPath() === '/dashboard') renderDashboard(); else if (currentPath() === '/keuangan') renderKeuangan();
    }
  });
  const del = $('[data-del]', m);
  if (del) del.addEventListener('click', async () => {
    if (!await confirmBox(`Hapus booking <b>${esc(b.kode_booking)}</b> beserta jadwal dan data pembayarannya? Tindakan ini tidak bisa dibatalkan.`, { danger: true, okLabel: 'Hapus' })) return;
    try { await api('deleteBooking', { id: b.id }); toast('Booking dihapus.', 'success'); renderDashboard(); } catch (e) { toast(e.message, 'error'); }
  });
}
