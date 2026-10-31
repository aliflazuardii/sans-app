'use strict';
/* ============================================================
   KALENDER JADWAL — FullCalendar (Bulan/Minggu/Hari/Agenda)
   ============================================================ */
const CS = { jadwal: [], tim: [], bookings: [], fot: '', jenis: '', warna: 'fotografer', mine: false, hideAlert: false };
const STATUS_WARNA = { Dikonfirmasi: '#10B981', Pending: '#F59E0B', Selesai: '#3B82F6', Batal: '#9CA3AF' };
const STATUS_JADWAL = ['Dikonfirmasi', 'Pending', 'Selesai', 'Batal'];

function eventColor(j) {
  if (CS.warna === 'status') return STATUS_WARNA[j.status] || '#6B7280';
  return j.warna_kalender || '#6B7280';
}

function overlap(a, b) { return a.tanggal === b.tanggal && toMin(a.jam_mulai) < toMin(b.jam_selesai) && toMin(b.jam_mulai) < toMin(a.jam_selesai); }

/** Cari pasangan jadwal bentrok (fotografer sama, jam tumpang tindih) */
function findConflictPairs() {
  const today = todayStr(), out = [];
  const act = CS.jadwal.filter(j => j.status !== 'Batal' && j.id_fotografer && j.tanggal >= today);
  for (let i = 0; i < act.length; i++) for (let k = i + 1; k < act.length; k++) {
    if (act[i].id_fotografer === act[k].id_fotografer && overlap(act[i], act[k])) out.push([act[i], act[k]]);
  }
  return out;
}

function freePhotographer(j) {
  return CS.tim.find(t => t.id !== j.id_fotografer && !CS.jadwal.some(x => x.id !== j.id && x.id_fotografer === t.id && x.status !== 'Batal' && overlap(x, j)));
}

function visibleJadwal() {
  return CS.jadwal.filter(j => (!CS.fot || j.id_fotografer === CS.fot) && (!CS.jenis || j.jenis_acara === CS.jenis) && (!CS.mine || j.id_fotografer === S.user.id_tim));
}

function toEvents() {
  const bentrok = new Set(findConflictPairs().flat().map(j => j.id));
  return visibleJadwal().map(j => ({
    id: j.id, title: j.judul, start: `${j.tanggal}T${j.jam_mulai}:00`, end: `${j.tanggal}T${j.jam_selesai}:00`,
    backgroundColor: eventColor(j), borderColor: eventColor(j), classNames: bentrok.has(j.id) ? ['ev-conflict'] : [], extendedProps: j
  }));
}

async function loadCalendarData() {
  const d = await api(isAdmin() ? 'listJadwal' : 'myJadwal');
  CS.jadwal = d.jadwal; CS.tim = d.tim; CS.bookings = d.bookings || [];
}

async function renderKalender() {
  const admin = isAdmin();
  $('#app').innerHTML = skeletonPage();
  await loadCalendarData();
  CS.mine = !admin; CS.fot = ''; CS.jenis = ''; CS.hideAlert = false;
  const jenisList = [...new Set(CS.jadwal.map(j => j.jenis_acara).filter(Boolean))];

  $('#app').innerHTML = `<div class="wrap-admin stack">
    <section class="card"><div class="row between" style="align-items:flex-start">
      <div><div class="row"><span class="avatar" style="border-radius:12px">${ic('calendar', 18)}</span><h1 class="serif" style="font-size:26px;font-weight:500">${admin ? 'Kalender Jadwal Studio' : 'Jadwal Tugas Saya'}</h1></div>
        <p class="muted" style="margin-top:6px">${admin ? 'Pantau jadwal tim fotografer dan cegah bentrok waktu secara otomatis.' : 'Jadwal tugas Anda (hanya baca). Hubungi admin bila ada perubahan.'}</p></div>
      <div class="row">
        ${admin ? `<label class="check" style="min-height:40px"><input type="checkbox" id="cal-mine"> Hanya tugas saya</label>` : ''}
        <button class="btn btn-outline" id="cal-ics">${ic('cloud')} Ekspor .ics</button>
        ${admin ? `<button class="btn btn-primary" id="cal-add">${ic('plus')} Tambah Jadwal Sesi</button>` : ''}
      </div></div>
      <div class="filters" style="margin:16px 0 0">
        ${admin ? `<select class="input" id="cal-fot" aria-label="Filter fotografer"><option value="">Semua fotografer</option>${CS.tim.map(t => `<option value="${esc(t.id)}">${esc(t.nama)}</option>`).join('')}</select>
        <select class="input" id="cal-jenis" aria-label="Filter jenis acara"><option value="">Semua jenis acara</option>${jenisList.map(j => `<option>${esc(j)}</option>`).join('')}</select>` : ''}
        <select class="input" id="cal-warna" aria-label="Warna acara"><option value="fotografer">Warna per fotografer</option><option value="status">Warna per status</option></select>
      </div></section>
    <div id="cal-alert"></div>
    <div class="split">
      <section class="card"><div id="cal" aria-label="Kalender jadwal"></div><div class="legend" id="cal-legend"></div></section>
      <aside class="stack"><section class="card"><div class="card-head"><h3>Tim Fotografer</h3><span class="badge b-gray">${CS.tim.length} anggota</span></div><div class="stack" id="cal-team"></div></section></aside>
    </div></div>`;

  const mobile = window.matchMedia('(max-width: 768px)').matches;
  CAL = new FullCalendar.Calendar($('#cal'), {
    locale: 'id', timeZone: 'local', initialView: mobile ? 'listWeek' : 'timeGridWeek', firstDay: 1, height: 'auto', nowIndicator: true,
    allDaySlot: false, slotMinTime: '06:00:00', slotMaxTime: '23:00:00', expandRows: true, navLinks: true,
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
    buttonText: { today: 'Hari Ini', month: 'Bulan', week: 'Minggu', day: 'Hari', list: 'Agenda' },
    editable: admin, eventDurationEditable: admin, eventStartEditable: admin, dayMaxEvents: 3,
    events: (info, ok) => ok(toEvents()),
    dateClick: info => { if (admin) openJadwalForm({ tanggal: info.dateStr.slice(0, 10), jam_mulai: info.dateStr.length > 10 ? info.dateStr.slice(11, 16) : '09:00' }); },
    eventClick: info => showJadwalDetail(info.event.extendedProps),
    eventDrop: onMoveEvent, eventResize: onMoveEvent
  });
  CAL.render();
  refreshCalendarUI();

  $('#cal-warna').addEventListener('change', e => { CS.warna = e.target.value; refreshCalendarUI(); });
  $('#cal-ics').addEventListener('click', exportIcs);
  if (admin) {
    $('#cal-add').addEventListener('click', () => openJadwalForm({ tanggal: todayStr() }));
    $('#cal-mine').addEventListener('change', e => { CS.mine = e.target.checked; refreshCalendarUI(); });
    $('#cal-fot').addEventListener('change', e => { CS.fot = e.target.value; refreshCalendarUI(); });
    $('#cal-jenis').addEventListener('change', e => { CS.jenis = e.target.value; refreshCalendarUI(); });
  }
}

function refreshCalendarUI() {
  if (!CAL) return;
  CAL.refetchEvents();
  // legenda
  $('#cal-legend').innerHTML = (CS.warna === 'status'
    ? STATUS_JADWAL.map(s => `<span><i class="dot" style="background:${STATUS_WARNA[s]}"></i>${s}</span>`)
    : CS.tim.map(t => `<span><i class="dot" style="background:${esc(t.warna_kalender)}"></i>${esc(t.nama)}</span>`)
  ).join('') + `<span><i class="dot" style="background:transparent;outline:2px solid var(--red)"></i>Bentrok</span><span class="muted" style="margin-left:auto">Zona waktu: WIB (UTC+7)</span>`;
  // panel tim: jumlah sesi minggu ini
  const now = new Date(), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const a = localDate(mon), sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  $('#cal-team').innerHTML = CS.tim.map(t => {
    const n = CS.jadwal.filter(j => j.id_fotografer === t.id && j.status !== 'Batal' && j.tanggal >= a && j.tanggal <= localDate(sun)).length;
    return `<div class="team-row"><span class="avatar" style="background:${esc(t.warna_kalender)};color:#fff">${esc(initials(t.nama))}</span><div class="grow"><b>${esc(t.nama)}</b><small>${n} sesi minggu ini</small></div>${n >= 4 ? '<span class="badge b-red">Sibuk</span>' : '<span class="badge b-green">Tersedia</span>'}</div>`;
  }).join('') || '<p class="muted">Belum ada data tim.</p>';
  // peringatan bentrok
  const box = $('#cal-alert'), pairs = isAdmin() && !CS.hideAlert ? findConflictPairs() : [];
  if (!pairs.length) { box.innerHTML = ''; return; }
  const [x, y] = pairs[0], free = freePhotographer(y);
  box.innerHTML = `<div class="alert-conflict" role="alert"><span class="ic">${ic('alert')}</span>
    <div class="grow"><span class="badge b-amber">PERINGATAN BENTROK</span> <span class="muted" style="font-size:12px">${esc(fmtTglPanjang(x.tanggal))}${pairs.length > 1 ? ` · +${pairs.length - 1} bentrok lain` : ''}</span>
      <p style="margin-top:6px">Fotografer <b>${esc(x.fotografer)}</b> memiliki 2 sesi yang tumpang tindih: <b>${esc(x.judul)}</b> (${esc(x.jam_mulai)}–${esc(x.jam_selesai)}) dan <b>${esc(y.judul)}</b> (${esc(y.jam_mulai)}–${esc(y.jam_selesai)}).</p>
      ${free ? `<p class="muted" style="font-size:12px">Disarankan: alihkan sesi kedua ke ${esc(free.nama)} yang memiliki slot kosong.</p>` : ''}</div>
    <div class="row">${free ? `<button class="btn btn-sm" style="background:var(--amber);color:#fff" id="cf-move">Alihkan ke ${esc(free.nama.split(' ')[0])}</button>` : ''}
      <button class="btn btn-outline btn-sm" id="cf-edit">Ubah Jam Sesi</button><button class="btn btn-ghost btn-sm" id="cf-hide">Abaikan</button></div></div>`;
  $('#cf-hide').addEventListener('click', () => { CS.hideAlert = true; box.innerHTML = ''; });
  $('#cf-edit').addEventListener('click', () => openJadwalForm(y));
  const mv = $('#cf-move');
  if (mv) mv.addEventListener('click', async () => {
    try { await busy(mv, () => api('saveJadwal', { ...y, id_fotografer: free.id })); toast(`Sesi dialihkan ke ${free.nama}.`, 'success'); await loadCalendarData(); refreshCalendarUI(); }
    catch (e) { toast(e.message, 'error'); }
  });
}

async function onMoveEvent(info) {
  const j = info.event.extendedProps, ev = info.event;
  const dur = toMin(j.jam_selesai) - toMin(j.jam_mulai);
  const start = ev.start, tanggal = localDate(start), mulai = localTime(start);
  const selesai = ev.end && localDate(ev.end) === tanggal ? localTime(ev.end) : fromMin(Math.min(toMin(mulai) + dur, 1439));
  const kirim = force => api('moveJadwal', { id: j.id, tanggal, jam_mulai: mulai, jam_selesai: selesai, force });
  try {
    try { await kirim(false); }
    catch (e) {
      if (e.code !== 'CONFLICT') throw e;
      const daftar = (e.extra.conflicts || []).map(c => `<li>${esc(c.judul)} (${esc(c.jam_mulai)}–${esc(c.jam_selesai)})</li>`).join('');
      if (!await confirmBox(`<p>Jadwal bentrok dengan sesi lain milik fotografer yang sama:</p><ul>${daftar}</ul><p>Tetap pindahkan?</p>`, { title: 'Jadwal bentrok', okLabel: 'Tetap pindahkan' })) { info.revert(); return; }
      await kirim(true);
    }
    toast('Jadwal dipindahkan.', 'success');
    await loadCalendarData(); refreshCalendarUI();
  } catch (e) { info.revert(); toast(e.message, 'error'); }
}

function showJadwalDetail(j) {
  const admin = isAdmin();
  const m = openModal(`<div class="modal-head"><h2>${esc(j.judul)}</h2><button class="btn btn-ghost btn-icon" data-close aria-label="Tutup">${ic('x')}</button></div>
    <div class="stack">
      <div class="row">${badge(j.status)}${j.kode_booking ? `<span class="badge b-gray mono">${esc(j.kode_booking)}</span>` : ''}</div>
      <div class="row">${ic('calendar')}<span>${esc(fmtTglPanjang(j.tanggal))}</span></div>
      <div class="row">${ic('clock')}<span>${esc(j.jam_mulai)} – ${esc(j.jam_selesai)} WIB</span></div>
      ${j.lokasi ? `<div class="row">${ic('pin')}<span>${esc(j.lokasi)}</span></div>` : ''}
      <div class="row">${ic('camera')}<span>${j.fotografer ? esc(j.fotografer) : '<i class="muted">Belum ada fotografer</i>'}</span></div>
      ${admin && j.klien ? `<div class="row">${ic('users')}<span>${esc(j.klien)} · ${esc(fmtWa(j.klien_wa))}</span></div>` : ''}
      ${admin && j.catatan ? `<div class="notice">${esc(j.catatan)}</div>` : ''}
    </div>
    ${admin ? `<div class="modal-foot">
      ${j.klien_wa ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waReminderKlien(j))}">${ic('wa')} Pengingat Klien</a>` : ''}
      ${j.fotografer_wa ? `<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${esc(waReminderFotografer(j))}">${ic('wa')} Pengingat Fotografer</a>` : ''}
      <button class="btn btn-outline btn-sm" data-edit>${ic('edit')} Ubah</button><button class="btn btn-danger btn-sm" data-del>${ic('trash')} Hapus</button></div>` : ''}`);
  if (!admin) return;
  $('[data-edit]', m).addEventListener('click', () => openJadwalForm(j));
  $('[data-del]', m).addEventListener('click', async () => {
    if (!await confirmBox(`Hapus jadwal <b>${esc(j.judul)}</b>?`, { danger: true, okLabel: 'Hapus' })) return;
    try { await api('deleteJadwal', { id: j.id }); toast('Jadwal dihapus.', 'success'); await loadCalendarData(); refreshCalendarUI(); } catch (e) { toast(e.message, 'error'); }
  });
}

function openJadwalForm(j = {}) {
  const edit = !!j.id;
  const mulai = j.jam_mulai || '09:00';
  const v = { status: 'Dikonfirmasi', ...j, jam_mulai: mulai, jam_selesai: j.jam_selesai || fromMin(Math.min(toMin(mulai) + 120, 1439)) };
  modalForm({
    title: edit ? 'Ubah Jadwal Sesi' : 'Tambah Jadwal Sesi', wide: true, values: v,
    fields: [
      { name: 'judul', label: 'Judul sesi', required: true, full: true, placeholder: 'Contoh: Prewedding Anisa & Fajar' },
      { name: 'tanggal', label: 'Tanggal', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', options: STATUS_JADWAL },
      { name: 'jam_mulai', label: 'Jam mulai', type: 'time', required: true },
      { name: 'jam_selesai', label: 'Jam selesai', type: 'time', required: true },
      { name: 'id_fotografer', label: 'Fotografer', type: 'select', options: [['', '— Belum ditugaskan —'], ...CS.tim.map(t => [t.id, t.nama])] },
      { name: 'id_booking', label: 'Terkait booking', type: 'select', options: [['', '— Tanpa booking —'], ...CS.bookings.map(b => [b.id, `${b.kode_booking} · ${b.nama}`])] },
      { name: 'lokasi', label: 'Lokasi', full: true }
    ],
    onSubmit: async val => {
      const kirim = force => api('saveJadwal', { ...val, id: edit ? j.id : undefined, force });
      try { await kirim(false); }
      catch (e) {
        if (e.code !== 'CONFLICT') throw e;
        const daftar = (e.extra.conflicts || []).map(c => `${c.judul} (${c.jam_mulai}–${c.jam_selesai})`).join(', ');
        if (!confirm(`⚠️ Jadwal bentrok dengan: ${daftar}.\n\nTetap simpan?`)) throw new Error('Penyimpanan dibatalkan karena jadwal bentrok. Ubah jam atau fotografer.');
        await kirim(true);
      }
      toast('Jadwal disimpan.', 'success');
      await loadCalendarData(); refreshCalendarUI();
    }
  });
}

/* ---------- Ekspor .ics (impor ke Google Calendar) ---------- */
function exportIcs() {
  const icsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const dt = (t, h) => t.replace(/-/g, '') + 'T' + h.replace(':', '') + '00';
  const list = visibleJadwal().filter(j => j.status !== 'Batal');
  if (!list.length) { toast('Tidak ada jadwal untuk diekspor.', 'error'); return; }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sans Photo//Jadwal//ID', 'CALSCALE:GREGORIAN', 'X-WR-TIMEZONE:Asia/Jakarta'];
  list.forEach(j => lines.push('BEGIN:VEVENT', `UID:${j.id}@sansphoto`, `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Asia/Jakarta:${dt(j.tanggal, j.jam_mulai)}`, `DTEND;TZID=Asia/Jakarta:${dt(j.tanggal, j.jam_selesai)}`,
    `SUMMARY:${icsEsc(j.judul)}`, `LOCATION:${icsEsc(j.lokasi)}`,
    `DESCRIPTION:${icsEsc([j.fotografer && 'Fotografer: ' + j.fotografer, j.kode_booking && 'Booking: ' + j.kode_booking, 'Status: ' + j.status].filter(Boolean).join('\n'))}`, 'END:VEVENT'));
  lines.push('END:VCALENDAR');
  downloadBlob('jadwal-sans-photo.ics', lines.join('\r\n'), 'text/calendar;charset=utf-8');
  toast(`${list.length} jadwal diekspor. Impor file ke Google Calendar.`, 'success');
}
