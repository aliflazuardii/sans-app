'use strict';
/* ============================================================
   KEUANGAN & INVOICE
   ============================================================ */
const FN = { mode: 'bulanan', year: new Date().getFullYear(), month: new Date().getMonth() + 1, pay: [], keluar: [], rep: null, q: '', status: '' };

async function renderKeuangan() {
  $('#app').innerHTML = skeletonPage();
  const [pay, keluar] = await Promise.all([api('listPembayaran'), api('list', { entity: 'pengeluaran' })]);
  FN.pay = pay; FN.keluar = keluar;
  FN.rep = await api('getReport', { mode: FN.mode, year: FN.year, month: FN.month });
  drawKeuangan();
}

async function reloadKeuangan() {
  const [pay, keluar, rep] = await Promise.all([api('listPembayaran'), api('list', { entity: 'pengeluaran' }), api('getReport', { mode: FN.mode, year: FN.year, month: FN.month })]);
  FN.pay = pay; FN.keluar = keluar; FN.rep = rep;
  killCharts(); drawKeuangan();
}

function periodLabel() {
  const r = FN.rep;
  return r.mode === 'harian' ? `${BULAN[r.month - 1]} ${r.year}` : r.mode === 'bulanan' ? `Tahun ${r.year}` : `${r.year - 4}–${r.year}`;
}

function drawKeuangan() {
  const r = FN.rep, bank = S.pub?.config;
  $('#app').innerHTML = `<div class="wrap-admin stack">
    <section class="row between" style="align-items:flex-end">
      <div><span class="cap">Finansial & akuntansi</span><h1 class="serif" style="font-size:30px;font-weight:500;margin-top:4px">Laporan Finansial & Generator Invoice</h1>
        <p class="muted">Konsolidasi penerimaan klien, biaya operasional, dan penerbitan dokumen resmi.</p></div>
      <div class="row">
        <select class="input" id="fn-mode" aria-label="Jenis laporan" style="width:auto"><option value="harian">Harian</option><option value="bulanan">Bulanan</option><option value="tahunan">Tahunan</option></select>
        <select class="input" id="fn-month" aria-label="Bulan" style="width:auto">${BULAN.map((b, i) => `<option value="${i + 1}">${b}</option>`).join('')}</select>
        <input class="input" id="fn-year" type="number" min="2020" max="2100" aria-label="Tahun" style="width:96px">
        <button class="btn btn-outline" id="fn-exp-add">${ic('plus')} Catat Pengeluaran</button>
        <button class="btn btn-primary" id="fn-xlsx">${ic('download')} Ekspor Laporan (.xlsx)</button>
      </div></section>

    <section class="grid g3" aria-label="Ringkasan keuangan">
      <div class="card kpi"><div class="top"><div><span class="cap">Total pemasukan · ${esc(periodLabel())}</span><div class="val tnum" style="font-size:26px">${rp(r.total_pemasukan)}</div></div><span class="ic ic-green">${ic('wallet')}</span></div>
        <div class="muted" style="font-size:12px">${r.jumlah_faktur} pembayaran tercatat</div></div>
      <div class="card kpi"><div class="top"><div><span class="cap">Pengeluaran operasional</span><div class="val tnum" style="font-size:26px">${rp(r.total_pengeluaran)}</div></div><span class="ic ic-red">${ic('wallet')}</span></div>
        <div class="muted" style="font-size:12px">${FN.keluar.length} catatan pengeluaran (semua waktu)</div></div>
      <div class="card kpi"><div class="top"><div><span class="cap">Laba bersih</span><div class="val tnum" style="font-size:26px;color:${r.laba < 0 ? 'var(--red)' : 'var(--accent)'}">${rp(r.laba)}</div></div><span class="ic ic-blue">${ic('wallet')}</span></div>
        <div><div class="row between muted" style="font-size:12px"><span>Nett margin</span><b class="tnum">${r.margin}%</b></div><div class="bar green" style="margin-top:6px"><i style="width:${Math.max(0, Math.min(100, r.margin))}%"></i></div></div></div>
    </section>

    <div class="split">
      <section class="card"><div class="card-head"><div><h2>Arus Kas — ${esc(periodLabel())}</h2><p class="muted">Pemasukan (pelunasan & DP) vs pengeluaran operasional.</p></div></div>
        <div class="chart-box"><canvas id="ch-fn" role="img" aria-label="Grafik arus kas periode ${esc(periodLabel())}"></canvas></div>
        <div class="notice" style="margin-top:14px">${ic('alert')}<div>Total tagihan tertunda saat ini: <b>${rp(r.tagihan_tertunda)}</b> (${r.jumlah_tertunda} klien). Pemasukan dicatat pada tanggal pembayaran terakhir.</div></div></section>
      <aside class="stack">
        <section class="card"><div class="card-head"><h3>Distribusi Pendapatan</h3></div>
          ${r.distribusi.length ? r.distribusi.map(x => { const p = r.total_pemasukan ? Math.round(x.nilai / r.total_pemasukan * 1000) / 10 : 0; return `<div class="dist-row"><div><span>${esc(x.label)}</span><b class="tnum">${rp(x.nilai)} (${p}%)</b></div><div class="bar"><i style="width:${p}%"></i></div></div>`; }).join('') : '<p class="muted">Belum ada pemasukan pada periode ini.</p>'}
          <div class="cap" style="margin:16px 0 8px">Rekening penerimaan studio</div>
          <div class="bank"><span class="avatar">${esc((bank?.rekening_bank || 'BANK').slice(0, 4))}</span><div><b class="mono" id="rek-no">—</b><div class="muted" style="font-size:12px" id="rek-nm"></div></div></div></section>
      </aside>
    </div>

    <section class="card"><div class="card-head"><div><h2>Manajemen Pembayaran & Penagihan</h2><p class="muted">Rekonsiliasi down payment dan pencetakan faktur pelanggan.</p></div></div>
      <div class="filters"><div class="search-wrap">${ic('search')}<input class="input input-search" id="fn-q" placeholder="Cari invoice, klien, booking…" aria-label="Cari pembayaran" style="min-height:40px"></div>
        <select class="input" id="fn-status" aria-label="Filter status bayar"><option value="">Semua status</option><option>Belum bayar</option><option>DP</option><option>Lunas</option></select></div>
      <div id="fn-table"></div></section>

    <section class="card"><div class="card-head"><div><h2>Catatan Pengeluaran</h2><p class="muted">Sewa alat, transport, fee asisten, dan biaya lain.</p></div><button class="btn btn-outline btn-sm" id="fn-exp-add2">${ic('plus')} Tambah</button></div><div id="fn-exp"></div></section>
  </div>`;

  $('#fn-mode').value = FN.mode; $('#fn-month').value = FN.month; $('#fn-year').value = FN.year;
  $('#fn-month').hidden = FN.mode !== 'harian';
  const reload = async () => {
    FN.mode = $('#fn-mode').value; FN.month = Number($('#fn-month').value); FN.year = Number($('#fn-year').value) || FN.year;
    try { await reloadKeuangan(); } catch (e) { toast(e.message, 'error'); }
  };
  ['fn-mode', 'fn-month', 'fn-year'].forEach(id => $('#' + id).addEventListener('change', reload));
  $('#fn-exp-add').addEventListener('click', () => openExpenseForm());
  $('#fn-exp-add2').addEventListener('click', () => openExpenseForm());
  $('#fn-xlsx').addEventListener('click', exportXlsx);
  const upd = debounce(() => { FN.q = $('#fn-q').value.trim().toLowerCase(); FN.status = $('#fn-status').value; renderPayTable(); }, 150);
  $('#fn-q').addEventListener('input', upd); $('#fn-status').addEventListener('change', upd);
  drawBarChart('ch-fn', r.labels, r.pemasukan, r.pengeluaran);
  renderPayTable(); renderExpenseTable();
  // rekening (butuh config admin)
  api('getConfig').then(c => { $('#rek-no').textContent = [c.rekening_bank, c.rekening_nomor].filter(Boolean).join(' · ') || '—'; $('#rek-nm').textContent = c.rekening_nama ? 'a.n. ' + c.rekening_nama : ''; }).catch(() => {});
}

function renderPayTable() {
  const rows = FN.pay.filter(p => (!FN.status || p.status === FN.status) &&
    (!FN.q || [p.nomor_invoice, p.nama, p.kode_booking].some(x => String(x).toLowerCase().includes(FN.q))));
  $('#fn-table').innerHTML = rows.length ? `<table class="tbl"><thead><tr><th>No. invoice</th><th>Booking & klien</th><th>Total tagihan</th><th>Terbayar</th><th>Sisa tagihan</th><th>Status</th><th><span class="sr">Aksi</span></th></tr></thead><tbody>
    ${rows.map(p => `<tr>
      <td data-label="Invoice"><span class="mono" style="color:var(--accent);font-weight:700">${esc(p.nomor_invoice)}</span></td>
      <td data-label="Klien"><b>${esc(p.nama)}</b><span class="sub">${esc(p.kode_booking)} · ${esc(p.nama_paket)}</span></td>
      <td data-label="Total" class="tnum">${rp(p.total_tagihan)}</td>
      <td data-label="Terbayar" class="tnum" style="color:var(--green-text)">${rp(p.jumlah_dibayar)}</td>
      <td data-label="Sisa" class="tnum" style="font-weight:700;color:${p.sisa > 0 ? 'var(--amber-text)' : 'var(--text3)'}">${rp(p.sisa)}</td>
      <td data-label="Status">${badge(p.status)}<span class="sub">${p.tanggal_bayar ? esc(fmtTgl(p.tanggal_bayar)) : ''}${p.metode ? ' · ' + esc(p.metode) : ''}</span></td>
      <td class="nolabel"><div class="acts">
        <button class="btn btn-outline btn-sm" data-inv="${esc(p.id_booking)}">${ic('print')} Invoice</button>
        ${p.status !== 'Lunas' ? `<button class="btn btn-primary btn-sm" data-pay="${esc(p.id)}">${p.jumlah_dibayar > 0 ? 'Update Bayar' : 'Catat DP'}</button>` : `<button class="btn btn-outline btn-sm" data-pay="${esc(p.id)}">Ubah</button>`}
        ${p.sisa > 0 && p.whatsapp ? `<a class="btn btn-wa btn-icon" target="_blank" rel="noopener" aria-label="Tagih via WhatsApp" href="${esc(waLink(p.whatsapp, `Halo ${p.nama}, mengingatkan invoice ${p.nomor_invoice} (${p.kode_booking}). Sisa tagihan: ${rp(p.sisa)}. Terima kasih 🙏`))}">${ic('wa')}</a>` : ''}</div></td></tr>`).join('')}
    </tbody></table>` : `<div class="empty">${ic('file', 32)}<p>Belum ada data pembayaran yang cocok.</p></div>`;
  $$('[data-inv]').forEach(b => b.addEventListener('click', () => showInvoice(b.dataset.inv)));
  $$('[data-pay]').forEach(b => b.addEventListener('click', () => openPayForm(FN.pay.find(x => x.id === b.dataset.pay))));
}

function openPayForm(p) {
  modalForm({
    title: `Pembayaran ${p.nomor_invoice}`, intro: `${esc(p.nama)} · ${esc(p.kode_booking)}. Status (Belum bayar / DP / Lunas) dan sisa tagihan dihitung otomatis.`,
    values: { total_tagihan: p.total_tagihan, jumlah_dibayar: p.jumlah_dibayar, tanggal_bayar: p.tanggal_bayar || todayStr(), metode: p.metode, catatan: p.catatan },
    fields: [
      { name: 'total_tagihan', label: 'Total tagihan (Rp)', type: 'number', min: 0, step: 1000, hint: 'Ubah bila ada diskon/tambahan.' },
      { name: 'jumlah_dibayar', label: 'Total sudah dibayar (Rp)', type: 'number', min: 0, step: 1000, hint: 'Isi kumulatif, mis. DP 500.000 lalu pelunasan jadi total.' },
      { name: 'tanggal_bayar', label: 'Tanggal bayar', type: 'date' },
      { name: 'metode', label: 'Metode', type: 'select', options: ['', 'Transfer Bank', 'QRIS', 'Tunai', 'Lainnya'] },
      { name: 'catatan', label: 'Catatan', full: true }
    ],
    extra: `<div class="row" style="margin-top:12px"><button type="button" class="btn btn-outline btn-sm" data-lunas>Tandai lunas</button></div>`,
    onSubmit: async v => { await api('savePembayaran', { id: p.id, ...v }); toast('Pembayaran disimpan.', 'success'); await reloadKeuangan(); }
  });
  $('[data-lunas]').addEventListener('click', () => { $('[name=jumlah_dibayar]').value = $('[name=total_tagihan]').value; });
}

function renderExpenseTable() {
  const rows = FN.keluar.slice(0, 30);
  $('#fn-exp').innerHTML = rows.length ? `<table class="tbl"><thead><tr><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>Jumlah</th><th></th></tr></thead><tbody>
    ${rows.map(x => `<tr><td data-label="Tanggal">${esc(fmtTgl(x.tanggal))}</td><td data-label="Kategori">${esc(x.kategori) || '-'}</td><td data-label="Ket.">${esc(x.keterangan)}</td><td data-label="Jumlah" class="tnum">${rp(x.jumlah)}</td>
      <td class="nolabel"><div class="acts"><button class="btn btn-outline btn-icon" data-xe="${esc(x.id)}" aria-label="Ubah">${ic('edit')}</button><button class="btn btn-outline btn-icon" data-xd="${esc(x.id)}" aria-label="Hapus">${ic('trash')}</button></div></td></tr>`).join('')}</tbody></table>
    ${FN.keluar.length > 30 ? `<p class="muted" style="margin-top:8px">Menampilkan 30 terbaru dari ${FN.keluar.length}. Semua data ikut diekspor ke Excel.</p>` : ''}`
    : `<div class="empty">${ic('wallet', 32)}<p>Belum ada pengeluaran tercatat.</p></div>`;
  $$('[data-xe]').forEach(b => b.addEventListener('click', () => openExpenseForm(FN.keluar.find(x => x.id === b.dataset.xe))));
  $$('[data-xd]').forEach(b => b.addEventListener('click', async () => {
    if (!await confirmBox('Hapus catatan pengeluaran ini?', { danger: true, okLabel: 'Hapus' })) return;
    try { await api('remove', { entity: 'pengeluaran', id: b.dataset.xd }); toast('Dihapus.', 'success'); await reloadKeuangan(); } catch (e) { toast(e.message, 'error'); }
  }));
}

function openExpenseForm(x) {
  modalForm({
    title: x ? 'Ubah Pengeluaran' : 'Catat Pengeluaran', values: x || { tanggal: todayStr() },
    fields: [
      { name: 'tanggal', label: 'Tanggal', type: 'date', required: true },
      { name: 'kategori', label: 'Kategori', type: 'select', options: ['Sewa alat', 'Transport', 'Fee asisten', 'Cetak', 'Operasional studio', 'Marketing', 'Lainnya'] },
      { name: 'keterangan', label: 'Keterangan', required: true, full: true },
      { name: 'jumlah', label: 'Jumlah (Rp)', type: 'number', min: 0, step: 1000, required: true, full: true }
    ],
    onSubmit: async v => { await api('save', { entity: 'pengeluaran', values: { ...v, id: x?.id } }); toast('Pengeluaran disimpan.', 'success'); await reloadKeuangan(); }
  });
}

/* ---------- Invoice ---------- */
async function showInvoice(idBooking) {
  let inv;
  try { inv = await api('getInvoice', { id_booking: idBooking }); } catch (e) { toast(e.message, 'error'); return; }
  const { pembayaran: p, booking: b, paket, studio: s, fotografer } = inv;
  const harga = paket ? paket.harga : p.total_tagihan, selisih = p.total_tagihan - harga;
  const jatuhTempo = (() => { const d = dateObj(b.tanggal); d.setDate(d.getDate() - 3); return localDate(d) < p.tanggal_invoice ? p.tanggal_invoice : localDate(d); })();
  const logo = safeUrl(s.logo_url);
  const wa = waLink(b.whatsapp, `Halo ${b.nama}, berikut ringkasan invoice ${p.nomor_invoice} (${b.kode_booking}): total ${rp(p.total_tagihan)}, terbayar ${rp(p.jumlah_dibayar)}, sisa ${rp(p.sisa)}. Pembayaran ke ${s.rekening_bank} ${s.rekening_nomor} a.n. ${s.rekening_nama}. Terima kasih 🙏`);
  openModal(`<div class="modal-head"><h2>Invoice ${esc(p.nomor_invoice)}</h2><button class="btn btn-ghost btn-icon" data-close aria-label="Tutup">${ic('x')}</button></div>
    <div id="invoice-print" class="invoice">
      <div class="inv-head"><div>${logo ? `<img class="inv-logo" src="${esc(logo)}" alt="Logo" referrerpolicy="no-referrer">` : ''}<h2>${esc(s.nama_usaha).toUpperCase()}</h2>
        <div style="color:#6B7280">${esc(s.tagline)}<br>${esc(s.alamat)}<br>${s.nomor_wa_admin ? 'WA: +' + esc(s.nomor_wa_admin) : ''}${s.email ? ' · ' + esc(s.email) : ''}</div></div>
        <div style="text-align:right"><span class="badge b-blue" style="background:#EEF2FF;color:#3730A3">FAKTUR RESERVASI RESMI</span><div class="inv-no">${esc(p.nomor_invoice)}</div>
          <div style="color:#6B7280;margin-top:6px">Tanggal terbit: ${esc(fmtTglPanjang(p.tanggal_invoice))}<br>Jatuh tempo pelunasan: ${esc(fmtTglPanjang(jatuhTempo))}</div></div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-top:18px">
        <div><div style="font-size:11px;letter-spacing:.06em;color:#6B7280;font-weight:700">DITAGIHKAN KEPADA</div><b style="font-size:16px">${esc(b.nama)}</b><br>${esc(fmtWa(b.whatsapp))}${b.email ? ' · ' + esc(b.email) : ''}<br>${b.lokasi ? 'Lokasi: ' + esc(b.lokasi) : ''}</div>
        <div style="background:#F9FAFB;border-radius:10px;padding:12px"><div style="font-size:11px;letter-spacing:.06em;color:#6B7280;font-weight:700">INFORMASI SESI</div>${esc(fmtTglPanjang(b.tanggal))} · ${esc(b.jam)} WIB<br>${esc(b.jenis_acara)}${fotografer.length ? '<br>Fotografer: ' + esc(fotografer.join(', ')) : ''}<br><span class="mono" style="font-size:12px">${esc(b.kode_booking)}</span></div></div>
      <table><thead><tr><th>Rincian paket & layanan</th><th class="r">Qty</th><th class="r">Harga satuan</th><th class="r">Total (IDR)</th></tr></thead><tbody>
        <tr><td><b>${esc(paket ? paket.nama_paket : 'Layanan fotografi')}</b><br><span style="color:#6B7280">${esc(String(paket?.fitur || paket?.deskripsi || '').split('\n').filter(Boolean).slice(0, 3).join(' · '))}</span></td><td class="r">1</td><td class="r">${rp(harga)}</td><td class="r">${rp(harga)}</td></tr>
        ${selisih ? `<tr><td>${selisih < 0 ? 'Diskon / penyesuaian' : 'Biaya tambahan'}</td><td class="r">1</td><td class="r">${rp(selisih)}</td><td class="r">${rp(selisih)}</td></tr>` : ''}</tbody></table>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;align-items:start">
        <div class="payinfo"><b>Instruksi pembayaran</b><br>${esc(s.rekening_bank)} · <b class="mono">${esc(s.rekening_nomor)}</b><br>a.n. ${esc(s.rekening_nama)}<br><span style="color:#6B7280;font-size:12px">Mohon lakukan pelunasan sebelum hari H pemotretan.</span></div>
        <div class="tot"><div><span>Subtotal tagihan</span><b class="tnum">${rp(p.total_tagihan)}</b></div><div style="color:#047857"><span>Terbayar</span><b class="tnum">− ${rp(p.jumlah_dibayar)}</b></div>
          <div class="big"><span>Sisa tagihan</span><b class="tnum">${rp(p.sisa)}</b></div>${p.status === 'Lunas' ? '<div style="justify-content:flex-end"><span class="lunas">LUNAS</span></div>' : ''}</div></div>
      <p style="color:#6B7280;font-size:12px;margin-top:18px">Dokumen digital ini sah tanpa tanda tangan basah fisik.</p>
    </div>
    <div class="modal-foot"><button class="btn btn-outline" id="inv-print">${ic('print')} Cetak / Simpan PDF</button><a class="btn btn-wa" target="_blank" rel="noopener" href="${esc(wa)}">${ic('wa')} Kirim Invoice via WhatsApp</a></div>`, { wide: true });
  $('#inv-print').addEventListener('click', () => window.print());
}

/* ---------- Ekspor Excel ---------- */
function exportXlsx() {
  if (typeof XLSX === 'undefined') { toast('Pustaka Excel belum termuat. Periksa koneksi internet.', 'error'); return; }
  const r = FN.rep;
  const wb = XLSX.utils.book_new();
  const ringkas = [['Laporan Keuangan — ' + (S.pub?.config.nama_usaha || 'Sans Photo')], ['Periode', periodLabel()], [],
    ['Total pemasukan', r.total_pemasukan], ['Total pengeluaran', r.total_pengeluaran], ['Laba bersih', r.laba], ['Margin (%)', r.margin],
    ['Tagihan tertunda', r.tagihan_tertunda], [], ['Periode', 'Pemasukan', 'Pengeluaran', 'Selisih'],
    ...r.labels.map((l, i) => [l, r.pemasukan[i], r.pengeluaran[i], r.pemasukan[i] - r.pengeluaran[i]])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ringkas), 'Ringkasan');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(FN.pay.map(p => ({
    'No. Invoice': p.nomor_invoice, 'Kode Booking': p.kode_booking, Klien: p.nama, Paket: p.nama_paket, 'Tanggal Acara': p.tanggal_acara,
    'Total Tagihan': p.total_tagihan, Terbayar: p.jumlah_dibayar, Sisa: p.sisa, Status: p.status, 'Tanggal Bayar': p.tanggal_bayar, Metode: p.metode
  }))), 'Pembayaran');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(FN.keluar.map(x => ({ Tanggal: x.tanggal, Kategori: x.kategori, Keterangan: x.keterangan, Jumlah: x.jumlah }))), 'Pengeluaran');
  XLSX.writeFile(wb, `Laporan-Sans-Photo-${FN.mode}-${FN.year}${FN.mode === 'harian' ? '-' + pad(FN.month) : ''}.xlsx`);
  toast('Laporan Excel diunduh.', 'success');
}
