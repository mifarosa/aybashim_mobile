# aybashim mobile

[aybashim](https://github.com/mifarosa/aybashim) kişisel finans uygulamasının **sunucusuz PWA** sürümü.
Banka ekstreleri telefonda okunur, işlemler otomatik kategorilendirilir ve aylık gelir/gider özeti çıkarılır.
Hesap, sunucu ya da backend yoktur; tüm veriler cihazın tarayıcısında (IndexedDB) saklanır.

## Özellikler

- ING hesap (PDF), ING kredi kartı (PDF), A101 Hadi (PDF) ve Garanti BBVA (XLS) ekstrelerini cihazda okuma
- Bankayı otomatik algılama (ekstredeki banka işaretleri, yoksa satır biçimi); algılanan banka değiştirilebilir
- Web sürümündeki keyword kurallarıyla birebir aynı otomatik kategorilendirme
- Ad soyada göre kendi hesapların arasındaki transferleri ayırma ("Kendime" sekmesi)
- Aylık özet: net denge, gelir/gider, gider dağılımı (halka grafik), son 6 ayın nakit akışı
- İşlem listesi: arama, banka/tip/kategori/tarih filtreleri, sıralama, gider/gelir kaynakları görünümü
- Mükerrer kayıt koruması (aynı ekstreyi tekrar yüklemek kayıt eklemez; aynı gün aynı tutarlı iki gerçek işlem korunur)
- Elle yanlış banka seçilirse uyarı ve yükleme geçmişinden tek dokunuşla geri alma
- Tutarları gizleme (dokununca birkaç saniye görünür)
- JSON yedek alma / geri yükleme (birleştir veya değiştir), yedek hatırlatması
- Çevrimdışı çalışma: uygulama ve ekstre okuma internet olmadan da çalışır
- Ana ekrana eklenebilir (iOS ve Android), açık/koyu tema

## Teknoloji

- Vue 3 + Vite, `vite-plugin-pwa` (Workbox)
- Dexie (IndexedDB)
- pdf.js (`pdfjs-dist`) ile PDF metin çıkarma, SheetJS (`@e965/xlsx`) ile XLS okuma; ikisi de yalnızca ekstre yüklenirken indirilir
- Vitest

## Proje yapısı

```text
src/
  core/            Saf iş mantığı (UI ve tarayıcıdan bağımsız, test edilir)
    parsers/       Banka ayrıştırıcıları (backend'deki Java parser'ların portu)
    classifier.js  Kategori kuralları (backend CategoryClassifier portu)
    analytics.js   Özet, dağılım, filtre ve sıralama hesapları
    pdfText.js     pdf.js çıktısını PDFBox'a benzer satırlara dönüştürme
  data/            Dexie veritabanı, kayıt işlemleri, yedekleme
  components/      Ortak bileşenler
  views/           Özet, İşlemler, Yükle, Ayarlar ve ilk açılış ekranları
  store.js         Uygulama durumu
tests/             Birim ve entegrasyon testleri
```

Kategoriler veritabanına yazılmaz, okuma anında hesaplanır. Bu yüzden kurallar ya da ad soyad değiştiğinde
tüm işlemler kendiliğinden yeniden kategorilendirilir.

## Geliştirme

Gereksinim: Node.js 22.13+

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # birim + entegrasyon testleri
npm run build     # dist/ altına üretim derlemesi
npm run preview   # derlemeyi yerelde sunar
```

`npm run dev` ve `npm run build` öncesinde pdf.js'in CMap ve font dosyaları `public/pdfjs/` altına kopyalanır
(`scripts/copy-pdfjs-assets.mjs`).

Telefonda denemek için service worker'ın çalışması gerektiğinden uygulama HTTPS üzerinden sunulmalıdır
(`localhost` istisnadır).

## Yayınlama

Uygulama statik dosyalardan oluşur; GitHub Pages, Cloudflare Pages veya Netlify gibi herhangi bir statik
barındırmada çalışır. Alt dizinden sunulacaksa `VITE_BASE` verilmelidir:

```bash
VITE_BASE=/aybashim_mobile/ npm run build
```

GitHub Pages için `.github/workflows/deploy.yml` hazırdır ve `main`'e her push'ta çalışır. Bir kereye mahsus
repo ayarlarında **Settings → Pages → Source: GitHub Actions** seçilmeli ve varsayılan dal `main` olmalıdır.
Adres öneki Pages ayarlarından otomatik alınır: özel alan adıyla kökten (`https://aybashim.mifarosa.com/`),
özel alan adı yoksa `/<repo>/` altından yayınlanır.

## Veri ve gizlilik

- Ekstreler ve işlemler hiçbir sunucuya gönderilmez.
- Veriler yalnızca o cihazdaki tarayıcıda durur; cihazlar arası senkron yoktur.
- Telefon kaybolursa veya tarayıcı verisi silinirse veriler geri gelmez. **Ayarlar → Yedek al** ile düzenli
  yedek alın. Yedek dosyası şifresizdir.
- Uygulama ilk açılışta kalıcı depolama izni ister; ana ekrana eklenmiş uygulamalarda bu izin daha kolay verilir.

## Bilinen sınırlar

- ING hesap, ING kredi kartı ve Garanti ayrıştırıcıları gerçek ekstrelerle doğrulandı (bakiye zinciri ve toplam
  borç kuruşu kuruşuna tutuyor). A101 Hadi henüz gerçek bir ekstreyle denenmedi; algılaması ING işareti
  taşımayan kart biçimli PDF'lere dayanır.
- Bir ekstrede işlem bulunamazsa **Yükle** ekranındaki "Çıkarılan metni göster" ile ham metin görülebilir.
