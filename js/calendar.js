'use strict';
/* ============================================================
   KALENDER JADWAL — FullCalendar (Bulan/Minggu/Hari/Agenda)
   Satu sesi bisa ditugaskan ke 2 fotografer sekaligus.
   ============================================================ */
const CS = { jadwal: [], tim: [], bookings: [], fot: '', jenis: '', warna: 'fotografer', mine: false, hideAlert: false };
const STATUS_WARNA = { Dikonfirmasi: '#10B981', Pending: '#F59E0B', Selesai: '#3B82F6', Batal: '#9CA3AF' };
const STATUS_JADWAL = ['Dikonfirmasi', 'Pending', 'Selesai', 'Batal'];

const fotsOf = j => [j.id_fotografer, j.id_fotografer2].filter(Boolean);
const sharedFots = (a, b) => { const fb = fotsOf(b); return fotsOf(a).filter(f => fb.includes(f)); };
const timNama = id => (CS.tim.find(t => t.id === id) || {}).nama || '';

function eventColor(j) {
  if (CS.warna === 'status') return STATUS_WARNA[j.status] || '#6B7280';
  return j.warna_kalender || '#6B7280';
}

function overlap(a, b) { return a.tanggal === b.tanggal && toMin(a.jam_mulai) < toMin(b.jam_selesai) && toMin(b.jam_mulai) < toMin(a.jam_selesai); }

/** Cari pasangan jadwal bentrok (ada fotografer yang sama, jam tumpang tindih) */
function findConflictPairs() {
  const today = todayStr(), out = [];
  const act = CS.jadwal.filter(j => j.status !== 'Batal' && fotsOf(j).length && j.tanggal >= today);
  for (let i = 0; i < act.length; i++) for (let k = i + 1; k < act.length; k++) {
    if (sharedFots(act[i], act[k]).length && overlap(act[i], act[k])) out.push([act[i], act[k]]);
  }
  return out;
}

function freePhotographer(j) {
  return CS.tim.find(t => !fotsOf(j).includes(t.id) && !CS.jadwal.some(x => x.id !== j.id && fotsOf(x).includes(t.id) && x.status !== 'Batal' && overlap(x, j)));
}

function visibleJadwal() {
  return CS.jadwal.filter(j => (!CS.fot || fotsOf(j).includes(CS.fot)) && (!CS.jenis || j.jenis_acara === CS.jenis) && (!CS.mine || fotsOf(j).includes(S.user.id_tim)));
}

function toEvents() {
  const bentrok = new Set(findConflictPairs().flat().map(j => j.id));
  return visibleJadwal().map(j => ({
    id: j.id, title: j.judul, start: `${j.tanggal}T${j.jam_mulai}:00`, end: `${j.tanggal}T${j.jam_selesai}:00`,
    classNames: ['sp-ev', 'ev-st-' + j.status].concat(bentrok.has(j.id) ? ['ev-conflict'] : []), extendedProps: j
  }));
}

async function loadCalendarData() {
  const d = await api(isAdmin() ? 'listJadwal' : 'myJadwal');
  CS.jadwal = d.jadwal; CS.tim = d.tim; CS.bookings = d.bookings || [];
}

const avatarFot = (nama, warna, size) => `<span class="avatar" style="background:${esc(warna || '#6B7280')};color:#fff;${size ? `width:${size}px;height:${size}px;font-size:${Math.round(size / 2.6)}px` : ''}" title="${esc(nama)}">${esc(initials(nama))}</span>`;

async function renderKalender() {
  const admin = isAdmin();
  $('#app').innerHTML = skeletonPage();
  await loadCalendarData();
  CS.mine = !admin; CS.fot = ''; CS.jenis = ''; CS.hideAlert = false;
  const jenisList = [...new Set(CS.jadwal.map(j => j.jenis_acara).filter(Boolean))];

  $('#app').innerHTML = `<div class="wrap-admin stack" style="--gap:16px">
    <section class="greet">
      <div><span class="tag"><span class="dot" style="background:#10B981"></span>${admin ? 'KALENDER STUDIO' : 'JADWAL TUGAS'}</span>
        <h1>${admin ? 'Kalender Jadwal Studio' : 'Jadwal Tugas Saya'}</h1>
        <p>${admin ? 'Pantau jadwal tim, tugaskan hingga 2 fotografer per sesi, dan cegah bentrok waktu secara otomatis. Klik atau seret di kalender untuk membuat sesi baru.' : 'Jadwal tugas Anda (hanya baca). Hubungi admin bila ada perubahan.'}</p></div>
      <div class="row">
        <button class="btn btn-outline" id="cal-ics">${ic('cloud')} Ekspor .ics</button>
        ${admin ? `<button class="btn btn-primary" id="cal-add">${ic('plus')} Tambah Jadwal Sesi</button>` : ''}
      </div>
    </section>

    <section class="cal-stats" id="cal-stats" aria-label="Ringkasan jadwal"></section>
    <div id="cal-alert"></div>

    <div class="split">
      <section class="card cal-card">
        <div class="cal-filters">
          ${admin ? `<select class="input" id="cal-fot" aria-label="Filter fotografer"><option value="">Semua fotografer</option>${CS.tim.map(t => `<option value="${esc(t.id)}">${esc(t.nama)}</option>`).join('')}</select>
          <select class="input" id="cal-jenis" aria-label="Filter jenis acara"><option value="">Semua jenis acara</option>${jenisList.map(j => `<option>${esc(j)}</option>`).join('')}</select>
          <label class="check cal-mine"><input type="checkbox" id="cal-mine"> Hanya tugas saya</label>` : ''}
          <select class="input" id="cal-warna" aria-label="Warna acara"><option value="fotografer">Warna per fotografer</option><option value="status">Warna per status</option></select>
        </div>
        <div id="cal" aria-label="Kalender jadwal"></div>
        <div class="legend" id="cal-legend"></div>
      </section>
      <aside class="stack" style="--gap:16px">
        <section class="card"><div class="card-head"><h3>Agenda Hari Ini</h3><span class="badge b-accent" id="cal-today-n"></span></div><div class="stack" style="--gap:8px" id="cal-agenda"></div></section>
        <section class="card"><div class="card-head"><h3>Tim Fotografer</h3><span class="badge b-gray">${CS.tim.length} anggota</span></div><div class="stack" style="--gap:8px" id="cal-team"></div></section>
      </aside>
    </div></div>`;

  const mobile = window.matchMedia('(max-width: 768px)').matches;
  CAL = new FullCalendar.Calendar($('#cal'), {
    locale: 'id', timeZone: 'local', initialView: mobile ? 'listWeek' : 'timeGridWeek', firstDay: 1,
    height: mobile ? 'auto' : 780, expandRows: true, nowIndicator: true, navLinks: true, scrollTime: '07:00:00',
    allDaySlot: false, slotMinTime: '06:00:00', slotMaxTime: '23:00:00', slotDuration: '00:30:00',
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false }, eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
    buttonText: { today: 'Hari Ini', month: 'Bulan', week: 'Minggu', day: 'Hari', list: 'Agenda' },
    eventDisplay: 'block', dayMaxEvents: 3, moreLinkText: n => `+${n} lagi`,
    editable: admin, eventDurationEditable: admin, eventStartEditable: admin,
    selectable: admin, selectMirror: true, unselectAuto: true,
    events: (info, ok) => ok(toEvents()),
    select: info => {
      const tanggal = info.startStr.slice(0, 10);
      if (info.allDay) openJadwalForm({ tanggal });
      else openJadwalForm({ tanggal, jam_mulai: info.startStr.slice(11, 16), jam_selesai: info.endStr.slice(0, 10) === tanggal ? info.endStr.slice(11, 16) : '' });
      CAL.unselect();
    },
    eventClick: info => showJadwalDetail(info.event.extendedProps),
    eventContent: eventContentHTML,
    eventDidMount: info => {
      const j = info.event.extendedProps, c = eventColor(j);
      info.el.style.setProperty('--c1', c);
      const dot = info.el.querySelector('.fc-list-event-dot'); if (dot) dot.style.borderColor = c;
      info.el.title = `${j.judul}\n${j.jam_mulai}–${j.jam_selesai}${j.fotografer ? '\nFotografer: ' + j.fotografer : ''}${j.lokasi ? '\n' + j.lokasi : ''}`;
    },
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

function eventContentHTML(arg) {
  const j = arg.event.extendedProps, type = arg.view.type;
  const c1 = eventColor(j), c2 = CS.warna === 'status' ? c1 : (j.warna_kalender2 || '#6B7280');
  if (type.startsWith('list')) return { html: `<b>${esc(arg.event.title)}</b>${j.fotografer ? ` <span class="muted">· ${esc(j.fotografer)}</span>` : ' <span class="muted">· belum ditugaskan</span>'}` };
  const people = [[j.fotografer1, c1], [j.fotografer2, c2]].filter(x => x[0])
    .map(([n, c]) => `<span class="ev-av" style="background:${esc(c)}" title="${esc(n)}">${esc(initials(n))}</span>`).join('');
  if (type === 'dayGridMonth') return { html: `<div class="ev-in ev-row"><span class="ev-time">${esc(j.jam_mulai)}</span><span class="ev-title">${esc(arg.event.title)}</span>${people}</div>` };
  return { html: `<div class="ev-in"><div class="ev-time">${esc(j.jam_mulai)} – ${esc(j.jam_selesai)}</div><div class="ev-title">${esc(arg.event.title)}</div>${people ? `<div class="ev-people">${people}</div>` : '<div class="ev-people ev-none">Belum ditugaskan</div>'}</div>` };
}

function refreshCalendarUI() {
  if (!CAL) return;
  CAL.refetchEvents();
  const admin = isAdmin(), today = todayStr();
  const aktif = visibleJadwal().filter(j => j.status !== 'Batal');
  // ringkasan
  const now = new Date(), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const a = localDate(mon), z = localDate(sun), ym = today.slice(0, 7);
  const tiles = [
    ['calendar', 'Sesi hari ini', aktif.filter(j => j.tanggal === today).length, 'ic-blue'],
    ['clock', 'Sesi minggu ini', aktif.filter(j => j.tanggal >= a && j.tanggal <= z).length, 'ic-green'],
    ['camera', 'Sesi bulan ini', aktif.filter(j => j.tanggal.slice(0, 7) === ym).length, 'ic-amber']
  ];
  if (admin) tiles.push(['alert', 'Belum ada fotografer', CS.jadwal.filter(j => j.status !== 'Batal' && !fotsOf(j).length && j.tanggal >= today).length, 'ic-red']);
  else tiles.push(['star', 'Sesi mendatang', aktif.filter(j => j.tanggal >= today).length, 'ic-red']);
  $('#cal-stats').innerHTML = tiles.map(([i, l, n, cls]) => `<div class="cal-stat"><span class="ic ${cls}">${ic(i)}</span><div><b class="tnum">${n}</b><small>${l}</small></div></div>`).join('');

  // legenda
  $('#cal-legend').innerHTML = (CS.warna === 'status'
    ? STATUS_JADWAL.map(s => `<span><i class="dot" style="background:${STATUS_WARNA[s]}"></i>${s}</span>`)
    : CS.tim.map(t => `<span><i class="dot" style="background:${esc(t.warna_kalender)}"></i>${esc(t.nama)}</span>`)
  ).join('') + `<span><i class="dot" style="background:transparent;outline:2px solid var(--red)"></i>Bentrok</span><span class="muted" style="margin-left:auto">Zona waktu: WIB (UTC+7)</span>`;

  // agenda hari ini
  const hariIni = aktif.filter(j => j.tanggal === today).sort((x, y) => x.jam_mulai < y.jam_mulai ? -1 : 1);
  $('#cal-today-n').textContent = hariIni.length ? hariIni.length + ' sesi' : 'Kosong';
  $('#cal-agenda').innerHTML = hariIni.length ? hariIni.map(j => `<button class="agenda-item" data-ag="${esc(j.id)}" style="--c1:${esc(eventColor(j))}">
      <span class="ag-time tnum"><b>${esc(j.jam_mulai)}</b><small>${esc(j.jam_selesai)}</small></span>
      <span class="grow"><b>${esc(j.judul)}</b><small>${j.fotografer ? esc(j.fotografer) : 'Belum ditugaskan'}${j.lokasi ? ' · ' + esc(j.lokasi) : ''}</small></span></button>`).join('')
    : `<div class="empty" style="padding:18px 8px">${ic('calendar', 26)}<p>Tidak ada sesi hari ini.</p></div>`;
  $$('[data-ag]').forEach(b => b.addEventListener('click', () => { const j = CS.jadwal.find(x => x.id === b.dataset.ag); if (j) showJadwalDetail(j); }));

  // panel tim: beban minggu ini
  $('#cal-team').innerHTML = CS.tim.map(t => {
    const n = CS.jadwal.filter(j => fotsOf(j).includes(t.id) && j.status !== 'Batal' && j.tanggal >= a && j.tanggal <= z).length;
    return `<div class="team-row">${avatarFot(t.nama, t.warna_kalender)}<div class="grow"><b>${esc(t.nama)}</b><small>${n} sesi minggu ini</small><div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, n * 25)}%;background:${esc(t.warna_kalender)}"></i></div></div>${n >= 4 ? '<span class="badge b-red">Sibuk</span>' : '<span class="badge b-green">Tersedia</span>'}</div>`;
  }).join('') || '<p class="muted">Belum ada data tim.</p>';

  // peringatan bentrok
  const box = $('#cal-alert'), pairs = admin && !CS.hideAlert ? findConflictPairs() : [];
  if (!pairs.length) { box.innerHTML = ''; return; }
  const [x, y] = pairs[0], dobel = sharedFots(x, y), free = freePhotographer(y);
  const siapa = dobel.map(timNama).join(' & ');
  box.innerHTML = `<div class="alert-conflict" role="alert"><span class="ic">${ic('alert')}</span>
    <div class="grow"><span class="badge b-amber">PERINGATAN BENTROK</span> <span class="muted" style="font-size:12px">${esc(fmtTglPanjang(x.tanggal))}${pairs.length > 1 ? ` · +${pairs.length - 1} bentrok lain` : ''}</span>
      <p style="margin-top:6px"><b>${esc(siapa)}</b> memiliki 2 sesi yang tumpang tindih: <b>${esc(x.judul)}</b> (${esc(x.jam_mulai)}–${esc(x.jam_selesai)}) dan <b>${esc(y.judul)}</b> (${esc(y.jam_mulai)}–${esc(y.jam_selesai)}).</p>
      ${free ? `<p class="muted" style="font-size:12px">Disarankan: alihkan ${esc(timNama(dobel[0]))} pada sesi kedua ke ${esc(free.nama)} yang memiliki slot kosong.</p>` : ''}</div>
    <div class="row">${free ? `<button class="btn btn-sm" style="background:var(--amber);color:#fff" id="cf-move">Alihkan ke ${esc(free.nama.split(' ')[0])}</button>` : ''}
      <button class="btn btn-outline btn-sm" id="cf-edit">Ubah Sesi</button><button class="btn btn-ghost btn-sm" id="cf-hide">Abaikan</button></div></div>`;
  $('#cf-hide').addEventListener('click', () => { CS.hideAlert = true; box.innerHTML = ''; });
  $('#cf-edit').addEventListener('click', () => openJadwalForm(y));
  const mv = $('#cf-move');
  if (mv) mv.addEventListener('click', async () => {
    const baru = { ...y }; if (y.id_fotografer === dobel[0]) baru.id_fotografer = free.id; else baru.id_fotografer2 = free.id;
    try { await busy(mv, () => api('saveJadwal', baru)); toast(`Sesi dialihkan ke ${free.nama}.`, 'success'); await loadCalendarData(); refreshCalendarUI(); }
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
      const daftar = (e.extra.conflicts || []).map(c => `<li><b>${esc(c.fotografer)}</b>: ${esc(c.judul)} (${esc(c.jam_mulai)}–${esc(c.jam_selesai)})</li>`).join('');
      if (!await confirmBox(`<p>Jadwal bentrok dengan sesi lain milik fotografer yang sama:</p><ul>${daftar}</ul><p>Tetap pindahkan?</p>`, { title: 'Jadwal bentrok', okLabel: 'Tetap pindahkan' })) { info.revert(); return; }
      await kirim(true);
    }
    toast('Jadwal dipindahkan.', 'success');
    await loadCalendarData(); refreshCalendarUI();
  } catch (e) { info.revert(); toast(e.message, 'error'); }
}

function showJadwalDetail(j) {
  const admin = isAdmin();
  const orang = [[j.fotografer1, j.warna_kalender, j.fotografer_wa, 1], [j.fotografer2, j.warna_kalender2, j.fotografer2_wa, 2]].filter(x => x[0]);
  const m = openModal(`<div class="modal-head"><h2>${esc(j.judul)}</h2><button class="btn btn-ghost btn-icon" data-close aria-label="Tutup">${ic('x')}</button></div>
    <div class="stack">
      <div class="row">${badge(j.status)}${j.kode_booking ? `<span class="badge b-gray mono">${esc(j.kode_booking)}</span>` : ''}${j.jenis_acara ? `<span class="badge b-accent">${esc(j.jenis_acara)}</span>` : ''}</div>
      <div class="row">${ic('calendar')}<span>${esc(fmtTglPanjang(j.tanggal))}</span></div>
      <div class="row">${ic('clock')}<span>${esc(j.jam_mulai)} – ${esc(j.jam_selesai)} WIB</span></div>
      ${j.lokasi ? `<div class="row">${ic('pin')}<span>${esc(j.lokasi)}</span></div>` : ''}
      <div><span class="cap">Fotografer bertugas</span>
        <div class="stack" style="--gap:8px;margin-top:8px">${orang.length ? orang.map(([n, c]) => `<div class="team-row">${avatarFot(n, c)}<div class="grow"><b>${esc(n)}</b></div></div>`).join('') : '<i class="muted">Belum ada fotografer</i>'}</div></div>
      ${admin && j.klien ? `<div class="row">${ic('users')}<span>${esc(j.klien)} · ${esc(fmtWa(j.klien_wa))}</span></div>` : ''}
      ${admin && j.catatan ? `<div class="notice">${esc(j.catatan)}</div>` : ''}
    </div>
    ${admin ? `<div class="modal-foot">
      ${j.klien_wa ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(waReminderKlien(j))}">${ic('wa')} Pengingat Klien</a>` : ''}
      ${orang.filter(o => o[2]).map(o => `<a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="${esc(waReminderFotografer(j, o[3]))}">${ic('wa')} ${esc(o[0].split(' ')[0])}</a>`).join('')}
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
      { name: 'judul', label: 'Judul sesi', required: true, full: true, placeholder: 'Contoh: Engagement Anisa & Fajar' },
      { name: 'tanggal', label: 'Tanggal', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', options: STATUS_JADWAL },
      { name: 'jam_mulai', label: 'Jam mulai', type: 'time', required: true },
      { name: 'jam_selesai', label: 'Jam selesai', type: 'time', required: true },
      { name: 'id_fotografer', label: 'Fotografer 1', type: 'select', options: [['', '— Belum ditugaskan —'], ...CS.tim.map(t => [t.id, t.nama])] },
      { name: 'id_fotografer2', label: 'Fotografer 2 (opsional)', type: 'select', options: [['', '— Tidak ada —'], ...CS.tim.map(t => [t.id, t.nama])] },
      { name: 'id_booking', label: 'Terkait booking', type: 'select', options: [['', '— Tanpa booking —'], ...CS.bookings.map(b => [b.id, `${b.kode_booking} · ${b.nama}`])], full: true },
      { name: 'lokasi', label: 'Lokasi', full: true }
    ],
    onSubmit: async val => {
      const kirim = force => api('saveJadwal', { ...val, id: edit ? j.id : undefined, force });
      try { await kirim(false); }
      catch (e) {
        if (e.code !== 'CONFLICT') throw e;
        const daftar = (e.extra.conflicts || []).map(c => `${c.fotografer}: ${c.judul} (${c.jam_mulai}–${c.jam_selesai})`).join('; ');
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
