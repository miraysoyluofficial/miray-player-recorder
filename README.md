# Miray Player Recorder

Mobil öncelikli, Vanilla HTML/CSS/JavaScript ile yapılmış PWA MP3 player ve ses kayıt uygulaması.

## Proje nasıl çalıştırılır

Bu proje framework gerektirmez. PWA, IndexedDB ve mikrofon özellikleri için yerel sunucu üzerinden çalıştırın:

```bash
python3 -m http.server 8080
```

Sonra tarayıcıda şu adresi açın:

```text
http://localhost:8080
```

## Kategori sistemi nasıl çalışır?

Alt navigasyonda beş ana ekran vardır:

1. **Player**: Şarkı, telefon müziği ve REC kayıtlarını çalar.
2. **Kayıt Al**: Büyük kırmızı kayıt butonu, süre, format ve dalga animasyonu olan recorder ekranıdır.
3. **Liste**: REC kayıtlarını örnek ses kaydedici uygulamaları gibi satır satır gösterir.
4. **Kategoriler**: Şarkı, telefon müziği, REC, favoriler, kaydedilenler ve demoları filtreler.
5. **Notlar**: Şarkı ve kayıt notlarını gösterir.

Uygulamada yatay kaydırılabilir kategori barı vardır. Aktif kategori vurgulanır ve içerik alanında sadece o kategoriye ait liste görünür.

Kategoriler:

1. **Tüm Şarkılar**: `script.js` içindeki `songs` array'indeki bütün şarkıları listeler.
2. **Telefon Müziklerim**: Telefonda seçilen ses dosyalarını listeler.
3. **REC Kayıtlarım**: Uygulama içindeki Record tuşuyla alınan kayıtları listeler.
4. **Kayıt Notlarım**: Şarkı, telefon müziği veya REC kayıtlarına eklenen notları gösterir.
5. **⭐ En Beğendiklerim**: Yıldızlanan şarkı, telefon müziği ve REC kayıtlarını gösterir.
6. **Kaydettiğim Şarkılar**: Kaydet butonuyla işaretlenen şarkıları gösterir.
7. **Demolar**: `category: "demo"` olan şarkıları listeler.

Üstteki arama alanı aktif kategori içinde şarkı adı, sanatçı, kayıt adı, dosya adı, tag ve notlara göre arama yapar.

## Telefonda müzik seçme nasıl yapılır?

**Telefon Müziklerim** kategorisine girin ve **Telefondan müzik seç** butonuna dokunun. MP3, WAV, M4A gibi `audio/*` dosyalarını seçebilirsiniz. Destekleyen tarayıcılarda seçilen dosyalar IndexedDB içinde saklanır. Tarayıcı saklayamazsa uygulama “Telefon müziklerini tekrar seçmen gerekebilir” mesajı gösterir.

## MP3 dosyaları nasıl eklenir?

Yeni gömülü müzik eklemek için:

1. MP3 dosyasını `/music` klasörüne koy.
2. Kapak görselini `/covers` klasörüne koy.
3. `script.js` içindeki `songs` array'e `id`, `title`, `artist`, `src`, `cover`, `category`, `tags`, `isStarred`, `isSaved`, `playCount`, `dateAdded` ve `notes` bilgilerini ekle.
4. Sayfayı yenile.

Örnek:

```js
{
  id: "song-003",
  title: "Yeni Demo",
  artist: "Miray Soylu",
  src: "music/yeni-demo.mp3",
  cover: "covers/yeni-demo.jpg",
  category: "demo",
  tags: ["demo", "vocal"],
  isStarred: false,
  isSaved: false,
  playCount: 0,
  dateAdded: "2026-06-06",
  notes: []
}
```

## REC kayıtları nasıl oluşturulur?

**Kayıt Al** ekranında Record tuşuna dokunun, mikrofon iznini verin ve Stop ile kaydı bitirin. Uygulama tarayıcının desteklediği gerçek formatı gösterir; çoğu Chrome cihazda `WEBM / 48000Hz` kullanılır. Kayıt Blob olarak oluşturulur ve IndexedDB içinde saklanır.

## REC kayıtları nasıl isimlendirilir?

Stop sonrası uygulama kayda isim vermenizi ister. Boş bırakırsanız otomatik isim oluşturur:

```text
REC Kaydı - YYYY-MM-DD HH:mm
```

REC kayıt kartındaki **Adlandır** butonuyla kayıt adı sonradan değiştirilebilir. Yeni isim IndexedDB'de saklanır ve sayfa yenilenince kaybolmaz.

## Kayıtlar nerede listelenir?

**Liste** ekranında kayıtlar en yeniden eskiye satır satır görünür. Her satırda play butonu, kayıt adı, tarih/saat, süre, dosya boyutu ve üç nokta menüsü vardır.

## Üç nokta menüsü ne işe yarar?

Kayıt satırındaki üç nokta menüsü bottom sheet açar. Buradan kayıt dinlenebilir, adı düzenlenebilir, çalma listesine eklenebilir, yıldızlanabilir, not eklenebilir, indirilebilir, paylaşılabilir, silinebilir ve ayrıntıları görüntülenebilir. İçeriği kırpma/düzenleme özelliği sonraki sürüm için uyarı gösterir.

## Sıralama ve seçim modu nasıl çalışır?

Liste ekranında sıralama menüsüyle kayıtları en yeni, en eski, ada göre, boyuta göre veya süreye göre sıralayabilirsiniz. Seçim modu birden fazla kaydı seçip toplu yıldızlama veya toplu silme yapar. Toplu indirme tarayıcı kısıtları nedeniyle uyarı gösterir.

## Yıldızlı “En Beğendiklerim” sistemi nasıl çalışır?

Şarkı, telefon müziği veya REC kaydı üzerindeki yıldız butonuna dokununca içerik **⭐ En Beğendiklerim** kategorisine eklenir. Yıldızı kaldırınca bu kategoriden çıkar. Yıldız bilgisi localStorage içinde saklanır.

## Kaydettiğim Şarkılar nasıl çalışır?

Tüm Şarkılar veya Demolar içinde bir şarkıdaki **Kaydet** butonuna dokunun. Şarkı **Kaydettiğim Şarkılar** kategorisinde görünür. Tekrar dokunarak kaydedilenlerden çıkarabilirsiniz.

## Şarkı veya kayda not nasıl eklenir?

Şarkı, telefon müziği veya REC kaydı kartındaki **Not ekle** butonuna dokunun. Not başlığı ve metni girin. Notlar **Kayıt Notlarım** kategorisinde listelenir. Notlar düzenlenebilir ve silinebilir. Notlar localStorage içinde saklanır.

## Demo şarkılar nasıl eklenir?

`songs` array içindeki bir şarkının `category` değerini `"demo"` yapın. İsterseniz `tags` içine `"demo"` da ekleyin. Bu şarkı **Demolar** kategorisinde görünür ve kartında küçük **Demo** etiketi çıkar.

## Mobilde ana ekrana nasıl eklenir?

Android Chrome'da yayınlanmış HTTPS linkini açın. Sağ üst menüden **Ana ekrana ekle** veya **Uygulamayı yükle** seçeneğine dokunun. Uygulama `manifest.json` ve service worker sayesinde standalone modda açılır.

## Tarayıcı kısıtları nelerdir?

- Mikrofon kaydı için `MediaRecorder`, `getUserMedia` ve genelde HTTPS gerekir.
- `localhost` geliştirme için güvenli kabul edilir.
- iOS Safari'de MediaRecorder, IndexedDB ve PWA davranışları sürüme göre değişebilir.
- File System Access API her tarayıcıda yoktur; desteklenmezse normal indirme fallback'i çalışır.
- IndexedDB veya tarayıcı site verileri temizlenirse REC kayıtları ve telefon müzikleri silinebilir.
- localStorage temizlenirse yıldızlar, kaydedilen şarkılar ve notlar silinebilir.
