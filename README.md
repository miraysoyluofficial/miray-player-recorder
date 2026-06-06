# Miray Player Recorder

Mobil öncelikli, Vanilla HTML/CSS/JavaScript ile yapılmış PWA MP3 player ve ses kayıt uygulaması.

## Proje nasıl çalıştırılır

Bu proje framework gerektirmez. PWA ve mikrofon özellikleri için yerel sunucu üzerinden çalıştırın:

```bash
python3 -m http.server 8080
```

Sonra tarayıcıda şu adresi açın:

```text
http://localhost:8080
```

Telefonda test etmek için bilgisayar ve telefon aynı ağdaysa bilgisayarın yerel IP adresiyle açabilirsiniz. HTTPS olmayan uzak adreslerde mikrofon ve PWA davranışları tarayıcı tarafından kısıtlanabilir.

## Telefonda ana ekrana nasıl eklenir

Android Chrome’da siteyi açın, menüden **Ana ekrana ekle** seçeneğine dokunun. Uygulama manifest ve service worker içerdiği için standalone modda uygulama gibi açılır.

## MP3 dosyaları nasıl eklenir

Yeni müzik eklemek için:

1. MP3 dosyasını `/music` klasörüne koy.
2. Kapak görselini `/covers` klasörüne koy.
3. `script.js` içindeki `songs` array’e `title`, `artist`, `src` ve `cover` bilgilerini ekle.
4. Sayfayı yenile.

`songs` array içinde kullanılacak örnek şarkı objesi:

```js
{
  title: "Demo Song",
  artist: "Miray Soylu",
  src: "music/demo.mp3",
  cover: "covers/demo.jpg"
}
```

Demo listede `music/demo.mp3` ve `music/miray-night.mp3` bulunur. Kendi MP3 dosyalarınızı bu adlarla değiştirebilir veya array içine yeni objeler ekleyebilirsiniz.

## Kayıtlar nasıl indirilir

Record tuşuna dokunun, mikrofon iznini verin ve Stop ile kaydı bitirin. Kayıtlar IndexedDB içinde saklanır ve **Kayıtlarım** bölümünde kalıcı olarak görünür.

Her kaydın yanında **Telefona indir** butonu vardır. Tarayıcı destekliyorsa File System Access API klasör seçtirir. Desteklenmiyorsa normal dosya indirme yöntemi kullanılır.

## Tarayıcı kısıtları nelerdir

- `MediaRecorder` ve mikrofon erişimi gerekir.
- Mikrofon erişimi genelde HTTPS veya `localhost` üzerinde çalışır.
- iOS Safari’de MediaRecorder, PWA ve indirme davranışları sürüme göre değişebilir.
- File System Access API çoğunlukla Chromium tabanlı tarayıcılarda bulunur.
- IndexedDB temizlenirse uygulama içindeki kayıt arşivi de silinebilir.
