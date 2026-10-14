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

Ruangku dapat dipasang dari browser yang mendukung instalasi web app. Buka situs melalui HTTPS (atau `localhost`), lalu pilih **Pasang Ruangku** atau gunakan menu instalasi browser. Di iPhone/iPad, buka dengan Safari dan pilih **Bagikan → Tambah ke Layar Utama**. Service worker menyimpan aset Next.js dan halaman beranda yang pernah dibuka agar dapat dimuat kembali saat offline; data Forex/API tidak disimpan dan memerlukan koneksi internet.

Logo aplikasi dan ikon browser/PWA menggunakan PNG `public/ruangku-logo.png`, dengan ukuran ikon instalasi yang dibuat dari file tersebut.

## Trading Forex

Salin `.env.example` menjadi `.env.local`, lalu isi variabel yang diperlukan untuk fitur yang sudah digunakan:

```bash
cp .env.example .env.local
```

Menu Trading menyediakan analisa aturan EMA 20/50 dan RSI 14, serta prediksi statistik analog historis untuk pair Forex, watchlist yang dapat diubah, timeframe candle, dan estimasi risiko. Prediksi membandingkan kondisi tren/RSI/momentum sekarang dengan hingga 30 kondisi historis terdekat dan merangkum arah pergerakan setelah 1, 3, atau 6 candle. API meminta hingga 500 candle dari Twelve Data; isi `TWELVE_DATA_API_KEY` untuk mengaktifkannya. Jangan gunakan prefix `NEXT_PUBLIC_` untuk API key. Tanpa key atau saat penyedia data tidak tersedia, halaman menampilkan status error dan tidak menggunakan angka simulasi sebagai sinyal.

Persentase arah adalah frekuensi berbobot dari sampel analog, bukan probabilitas terkalibrasi atau jaminan prediksi. Hasil tidak ditampilkan bila kurang dari 15 sampel tersedia. Metode ini belum merupakan machine-learning model dan belum divalidasi dengan backtest terpisah.

Analisa fundamental AI memakai `GEMINI_API_KEY` dan `GEMINI_MODEL` di server; endpoint menggunakan model yang ditentukan melalui environment tersebut dan tidak melakukan fallback. Google Search grounding dipakai untuk mencari konteks ekonomi terkini dan menampilkan tautan sumber. Biaya serta ketersediaan model/grounding bergantung pada model, kuota, dan tier proyek Google AI; periksa halaman harga dan penggunaan Google AI Studio. Permintaan hanya dikirim setelah pengguna menekan tombol analisa. Endpoint memiliki batas sementara per alamat proses; karena aplikasi belum memiliki autentikasi pengguna, lindungi aplikasi sebelum membukanya untuk publik. Batas in-memory ini bukan pengganti autentikasi atau rate limiting terdistribusi pada deployment serverless.

Variabel Firebase Web SDK dan Firebase Admin SDK di `.env.example` adalah persiapan integrasi mendatang; Firebase belum diinisialisasi atau digunakan aplikasi. `NEXT_PUBLIC_FIREBASE_*` tersedia di browser. Variabel `FIREBASE_*` untuk Admin SDK harus tetap rahasia di server. Simpan private key service account dengan line break sebagai `\n`, gunakan service account berizin minimum, dan jangan pernah commit kredensial nyata.

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
