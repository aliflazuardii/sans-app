# Panduan Instalasi — Sans Photo

Aplikasi ini terdiri dari dua bagian yang dipasang terpisah:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** | `Kode.gs` + `appsscript.json` | Google Apps Script (data di Google Sheets & Drive) |
| **Frontend** | ZIP `sans-photo-frontend` (index.html, css/, js/) | GitHub Pages |

Urutan wajib: **Backend dulu → salin URL → isi `config.js` → upload frontend.**

---

## A. Pasang Backend (Google Apps Script)

1. Buka <https://script.google.com> → **Proyek baru**.
2. Ganti nama file `Code.gs` menjadi `Kode`, hapus isinya, lalu **tempel seluruh isi `Kode.gs`**.
3. (Disarankan) Klik ⚙️ **Project Settings** → centang **Show "appsscript.json" manifest file** → buka `appsscript.json` → ganti isinya dengan file `appsscript.json` yang diberikan (zona waktu Asia/Jakarta).
4. Pilih fungsi **`setupAppEnvironment`** di dropdown → klik ▶ **Run** → **Review permissions** → izinkan akses Drive & Sheets.
   - **Jalankan HANYA SEKALI.** Bila perlu mengulang, hapus dulu folder & spreadsheet hasil setup, lalu hapus Script Properties.
   - Buka **Execution log**: pastikan muncul `✅ Setup selesai!`.
   - Akan terbentuk folder **📁 Sans Photo** di Drive berisi spreadsheet database + folder Portofolio.
5. **Deploy → New deployment → ⚙️ Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy**, lalu **salin URL yang berakhiran `/exec`**.

> ⚠️ Setiap kali `Kode.gs` diubah, buat **New deployment / Manage deployments → Edit → New version** agar perubahan aktif.

**Akun awal** (wajib ganti password saat login pertama):

| Username | Password | Peran |
|---|---|---|
| `admin` | `sans12345` | Admin (pemilik) |
| `rizky` | `sans12345` | Fotografer (hanya lihat jadwal sendiri) |
| `dimas` | `sans12345` | Fotografer |

---

## B. Siapkan Frontend

1. Ekstrak `sans-photo-frontend.zip`. **Folder hasil ekstrak itulah folder proyek** (di dalamnya langsung ada `index.html`, `css/`, `js/`).
2. Buka `js/config.js` dengan Notepad, ganti
   ```js
   const GAS_URL = 'GANTI_DENGAN_URL_EXEC_APPS_SCRIPT';
   ```
   dengan URL `/exec` dari langkah A5 (tetap di dalam tanda kutip). Simpan.

---

## C. Upload ke GitHub Pages (lewat terminal)

> Jangan memakai “Upload files” di web GitHub — struktur folder `css/` dan `js/` akan rusak.

1. **Install Git** (<https://git-scm.com/download/win> untuk Windows; Mac: ketik `git --version` di Terminal). Cek: `git --version`.
2. **Buat akun** di <https://github.com>, lalu atur identitas (sekali saja):
   ```bash
   git config --global user.name "Nama Anda"
   git config --global user.email "email@akun-github-anda.com"
   ```
3. Di GitHub: **+ → New repository** → nama mis. `sans-photo` → **Public** → **jangan** centang README/.gitignore/license → **Create**.
4. Buka terminal **di dalam folder hasil ekstrak** (Windows: buka foldernya di File Explorer → klik address bar → ketik `powershell` → Enter).
5. **Cek dulu** bahwa Anda di folder yang benar:
   ```powershell
   dir
   ```
   Harus terlihat `index.html`, `css`, `js`. Jika yang terlihat folder lain, masuk dulu ke folder yang berisi `index.html`.
6. Jalankan satu per satu:
   ```bash
   git init
   git add .
   git commit -m "Upload pertama"
   git branch -M main
   git remote add origin https://github.com/USERNAME/sans-photo.git
   git push -u origin main
   ```
   Saat diminta **Password**, tempel **Personal Access Token** (layar tampak kosong saat paste — itu normal):
   GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate → centang **repo** → salin token (`ghp_…`).
7. Aktifkan Pages: repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch **main** / **(root)** → **Save** → centang **Enforce HTTPS**.
8. Tunggu 1–2 menit. Situs aktif di `https://USERNAME.github.io/sans-photo/`.

**Update di kemudian hari** (dari folder yang sama):
```bash
git add .
git commit -m "Perbarui"
git push
```
Jika tampilan lama masih muncul: **Ctrl+Shift+R**.

---

## D. Setelah Situs Aktif

1. Buka situs → **Masuk Tim** → login `admin` → ganti password.
2. **Kelola → Pengaturan**: ganti **nama usaha, alamat, nomor WhatsApp admin (format 62…), rekening bank**, dan unggah **logo**. (Data bawaan hanya contoh!)
3. **Kelola → Jenis Acara & Pricelist**: ubah/tambah jenis acara (bawaan: Wedding, Engagement, Tedak Siten, Graduation) lalu **Unggah PDF** pricelist untuk masing-masing. Klien hanya memilih jenis acara; harga Anda tulis sendiri saat konfirmasi.
4. **Kelola → Portofolio**: unggah foto (dikompres otomatis).
5. **Kelola → Tim**: ubah data fotografer; isi username/password untuk akun login mereka.
6. **Kelola → Akun**: tambah/ubah akun, atur status **Admin** atau **Fotografer**, reset password.
7. **Kelola → Pengaturan → Foto Utama**: unggah foto halaman depan, atur zoom dan posisi.
8. **Kelola → Testimoni**: hapus 3 testimoni contoh bila perlu.

### Alur konfirmasi booking (baru)
**Dashboard → Konfirmasi** pada booking baru → pilih **Fotografer 1 dan 2**, isi **Total harga** dan **DP** → Simpan. Sesi otomatis masuk kalender; bila fotografer bentrok, sistem memperingatkan. Pelunasan dicatat di **Keuangan → Catat Bayar**. Invoice (1 halaman, tanpa jatuh tempo) ada di tombol **Invoice**.

### Cara kerja hasil foto untuk client
Setelah sesi selesai: siapkan folder di Google Drive → atur berbagi **“Siapa saja yang memiliki link”** → tempel link folder di **Dashboard → ikon ✏️ pada booking → “Link folder hasil foto”**. Client membuka **Portal Unduh Hasil Foto** dengan kode booking + nomor WhatsApp.

---

## E. Masalah Umum

| Gejala | Penyebab & solusi |
|---|---|
| Halaman 404 di GitHub Pages | `index.html` tidak di root repo. Cek halaman repo di browser: `index.html` harus terlihat langsung. Ulangi dari folder yang benar (`git push -u origin main --force`) |
| Halaman tanpa styling | Folder `css/` & `js/` tidak ikut ter-push. Gunakan terminal (bukan upload web) |
| “URL backend belum diisi” | `js/config.js` belum diganti URL `/exec` |
| “Respons server tidak valid” / data tak muncul | Deployment belum **Anyone**, atau belum deploy ulang setelah mengubah kode |
| `Password authentication is not supported` | Gunakan Personal Access Token (langkah C6) |
| Foto portofolio tidak tampil | Pastikan Drive tidak dibatasi organisasi (Google Workspace) untuk berbagi publik |
| Lupa password admin | Buka spreadsheet → sheet `Pengguna` → hapus baris admin, lalu minta bantuan untuk membuat ulang akun, atau jalankan ulang setup di proyek baru |

## F. Catatan Teknis Singkat
- Pemasukan di laporan dicatat pada **tanggal pembayaran terakhir** yang Anda isi.
- Nomor invoice `INV-TAHUN-NNNN` dan kode booking `SANS-TAHUN-NNN` dibuat otomatis dan tidak ganda (dengan penguncian).
- Sesi login berlaku maksimal 6 jam (batas CacheService), setelah itu login ulang.
- Disarankan membuat salinan (File → Make a copy) spreadsheet database secara berkala.


---

## F. Memperbarui dari Versi Sebelumnya (revisi 1 Nov 2026)

Data di Google Sheets Anda **tidak hilang**. Sheet baru (`JenisAcara`) dan kolom baru dibuat otomatis saat pertama kali aplikasi dibuka.

**1. Backend (Apps Script)**
1. Buka proyek Apps Script → ganti seluruh isi `Kode.gs` dengan `backend/Kode.gs` yang baru → **Simpan**.
2. **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy.** (URL `/exec` tetap sama.)

**2. Frontend (GitHub Pages)**
1. Ganti semua berkas di folder situs dengan isi ZIP ini, **kecuali `js/config.js`** (milik Anda, sudah berisi URL `/exec`).
2. Di terminal: `git add .` → `git commit -m "Revisi"` → `git push`. Lalu **Ctrl+Shift+R** di browser.

**Catatan data lama:** harga paket pada booking lama tetap terbaca sebagai total tagihan. Pembayaran lama otomatis dipetakan ke DP (bila belum lunas) atau pelunasan (bila lunas). Sheet `Paket` lama tidak dipakai lagi dan boleh dibiarkan.

**Lupa password?** Fungsi `resetPassword()` sudah ada di bagian bawah `Kode.gs`: ubah `USERNAME` dan `PASSWORD_BARU`, pilih fungsinya di dropdown, klik **Jalankan**.
