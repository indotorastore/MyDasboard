This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Progressive Web App

Ruangku dapat dipasang dari menu instalasi browser yang mendukung web app. Di iPhone/iPad, buka dengan Safari dan pilih **Bagikan → Tambah ke Layar Utama**. Saat offline, service worker menampilkan halaman offline sederhana dan memakai cache aset aplikasi jika diperlukan; halaman akun dan data Forex/API memerlukan koneksi internet. Service worker memeriksa versi terbaru aset dari server sebelum menggunakan cache agar tidak memakai bundle lama setelah pembaruan aplikasi.

Logo aplikasi dan ikon browser/PWA menggunakan PNG `public/ruangku-logo.png`, dengan ukuran ikon instalasi yang dibuat dari file tersebut.

## Trading Forex

Salin `.env.example` menjadi `.env.local`, lalu isi variabel yang diperlukan untuk fitur yang sudah digunakan:

```bash
cp .env.example .env.local
```

Menu Trading menyediakan analisa aturan EMA 20/50 dan RSI 14, serta prediksi statistik analog historis untuk pair Forex, watchlist yang dapat diubah, timeframe candle, dan estimasi risiko. Prediksi membandingkan kondisi tren/RSI/momentum sekarang dengan hingga 30 kondisi historis terdekat dan merangkum arah pergerakan setelah 1, 3, atau 6 candle. API meminta hingga 500 candle dari Twelve Data; isi `TWELVE_DATA_API_KEY` untuk mengaktifkannya. Jangan gunakan prefix `NEXT_PUBLIC_` untuk API key. Tanpa key atau saat penyedia data tidak tersedia, halaman menampilkan status error dan tidak menggunakan angka simulasi sebagai sinyal.

Persentase arah adalah frekuensi berbobot dari sampel analog, bukan probabilitas terkalibrasi atau jaminan prediksi. Hasil tidak ditampilkan bila kurang dari 15 sampel tersedia. Metode ini belum merupakan machine-learning model dan belum divalidasi dengan backtest terpisah.

Analisa fundamental AI memakai `GEMINI_API_KEY` dan `GEMINI_MODEL` di server; endpoint menggunakan model yang ditentukan melalui environment tersebut dan tidak melakukan fallback. Google Search grounding dipakai untuk mencari konteks ekonomi terkini dan menampilkan tautan sumber. Biaya serta ketersediaan model/grounding bergantung pada model, kuota, dan tier proyek Google AI; periksa halaman harga dan penggunaan Google AI Studio. Permintaan hanya dikirim setelah pengguna menekan tombol analisa dan berhasil masuk. Endpoint memiliki batas sementara per alamat proses, tetapi batas in-memory ini bukan pengganti rate limiting terdistribusi pada deployment serverless.

Login dan pendaftaran publik Ruangku memakai Firebase Authentication, termasuk pendaftaran melalui Google. Pendaftaran Google tidak meminta isian tambahan; nama mengikuti profil Google dan username otomatis dibuat, lalu dapat diubah di **Pengaturan**. Pendaftaran email tersedia sebagai opsi terpisah. Aktifkan provider Google di Firebase Console → Authentication → Sign-in method, dan tambahkan domain aplikasi ke daftar authorized domains. Akun baru memperoleh peran `user`; hanya claim `admin: true` yang ditetapkan melalui Admin SDK dapat memberikan peran admin. Admin dengan claim tersebut mendapat dashboard terpisah yang menampilkan ringkasan dan hingga 100 profil pengguna terbaru dari Firestore. Firebase Admin SDK memvalidasi sesi `HttpOnly` server-side dan melindungi workspace serta endpoint Trading. Profil disimpan di Firestore pada `users/{uid}`; username unik dicatat di `usernames/{username}`. Aturan `firestore.rules` menolak akses langsung dari browser; operasi profil dilakukan server menggunakan Admin SDK. Terapkan aturan tersebut ke Firebase project dengan `firebase deploy --only firestore:rules` sebelum membuka pendaftaran ke publik. Pengguna dapat mengirim email reset sandi dari halaman login; ubah sandi tersedia di **Pengaturan** dan memerlukan sandi saat ini. `NEXT_PUBLIC_FIREBASE_*` adalah konfigurasi Firebase Web SDK untuk login; variabel `FIREBASE_*` harus tetap rahasia di server. Simpan private key service account dengan line break sebagai `\n`, gunakan service account berizin minimum, dan jangan pernah commit kredensial nyata.

Untuk deploy ke Vercel, tambahkan variabel yang diperlukan di **Project → Settings → Environment Variables** untuk environment Development, Preview, dan/atau Production. Jangan unggah `.env.local` atau private key ke repository. Redeploy setelah mengubah environment variables agar perubahan berlaku. Mulai ulang server lokal setelah mengubah `.env.local`.

Analisa bersifat informatif, menggunakan candle tertutup, dan tidak mengeksekusi order. Data dapat tertunda; uji strategi serta biaya transaksi pada broker yang digunakan sebelum mengambil keputusan.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
