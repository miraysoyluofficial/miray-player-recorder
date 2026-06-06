"use strict";

// ============================================================
// SONGS ARRAY
// Kendi müziklerinizi eklemek için sadece bu listeyi düzenleyin.
// 1. MP3 dosyasını /music klasörüne koyun.
// 2. Kapak görselini /covers klasörüne koyun.
// 3. Aşağıdaki örnek formatta yeni bir şarkı objesi ekleyin.
//
// Örnek:
// {
//   id: "song-003",
//   title: "Şarkı Adı",
//   artist: "Sanatçı Adı",
//   src: "music/sarki-dosyasi.mp3",
//   cover: "covers/kapak-gorseli.jpg",
//   category: "demo",
//   tags: ["demo", "melodic"],
//   isStarred: false,
//   isSaved: false,
//   playCount: 0,
//   dateAdded: "2026-06-06",
//   notes: []
// }
// ============================================================
const songs = [
  {
    id: "song-001",
    title: "Demo Song",
    artist: "Miray Soylu",
    src: "music/demo.mp3",
    cover: "covers/demo.svg",
    category: "demo",
    tags: ["demo", "melodic", "ethnic"],
    isStarred: false,
    isSaved: false,
    playCount: 0,
    dateAdded: "2026-06-06",
    notes: [],
  },
  {
    id: "song-002",
    title: "Miray Night",
    artist: "Miray Soylu",
    src: "music/miray-night.mp3",
    cover: "covers/miray-night.svg",
    category: "demo",
    tags: ["demo", "night", "studio"],
    isStarred: false,
    isSaved: false,
    playCount: 0,
    dateAdded: "2026-06-06",
    notes: [],
  },
];

const categories = [
  { id: "all", label: "Tüm Şarkılar", icon: "♫", empty: "Bu kategoride henüz şarkı yok." },
  { id: "phone", label: "Telefon Müziklerim", icon: "▣", empty: "Telefondan müzik seçerek buraya ekleyebilirsin." },
  { id: "recordings", label: "REC Kayıtlarım", icon: "●", empty: "Henüz REC kaydı yok. Record tuşuyla kayıt al." },
  { id: "notes", label: "Kayıt Notlarım", icon: "✎", empty: "Henüz not yok. Şarkı veya kayıtlara not ekleyebilirsin." },
  { id: "favorites", label: "⭐ En Beğendiklerim", icon: "", empty: "Yıldızladığın içerikler burada görünecek.", favorite: true },
  { id: "saved", label: "Kaydettiğim Şarkılar", icon: "✓", empty: "Kaydettiğin şarkılar burada listelenecek." },
  { id: "demos", label: "Demolar", icon: "◇", empty: "category: \"demo\" olan şarkılar burada görünecek." },
];

const DB_NAME = "miray-player-recorder";
const DB_VERSION = 2;
const RECORDINGS_STORE = "recordings";
const PHONE_MUSIC_STORE = "phoneMusic";
const STORAGE_KEYS = {
  stars: "miray-stars",
  savedSongs: "miray-saved-songs",
  notes: "miray-notes",
};

const audioPlayer = document.querySelector("#audioPlayer");
const coverArt = document.querySelector("#coverArt");
const trackTitle = document.querySelector("#trackTitle");
const trackArtist = document.querySelector("#trackArtist");
const progress = document.querySelector("#progress");
const currentTimeLabel = document.querySelector("#currentTime");
const durationLabel = document.querySelector("#duration");
const playPauseBtn = document.querySelector("#playPauseBtn");
const prevBtn = document.querySelector("#prevBtn");
const nextBtn = document.querySelector("#nextBtn");
const volume = document.querySelector("#volume");
const trackList = document.querySelector("#trackList");
const recordBtn = document.querySelector("#recordBtn");
const stopBtn = document.querySelector("#stopBtn");
const recordTimer = document.querySelector("#recordTimer");
const message = document.querySelector("#message");
const installStatus = document.querySelector("#installStatus");
const categoryBar = document.querySelector("#categoryBar");
const categoryContent = document.querySelector("#categoryContent");
const categoryCount = document.querySelector("#categoryCount");
const libraryTitle = document.querySelector("#libraryTitle");
const searchInput = document.querySelector("#searchInput");

let db;
let mediaRecorder;
let mediaStream;
let recordingChunks = [];
let recordingStartedAt = 0;
let timerInterval;
let hasTriedToPlay = false;
let activeCategory = "all";
let searchTerm = "";
let recordings = [];
let phoneMusic = [];
let notes = [];
let stars = {};
let savedSongs = {};
let currentQueue = [];
let currentQueueIndex = 0;
let objectUrls = new Map();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function formatDateForFile(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

function formatDisplayDate(dateValue) {
  return new Date(dateValue).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRecordingNameDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
  if (isError) console.error(text);
}

function readJsonStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (error) {
    console.warn("localStorage okunamadı:", key, error);
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function starKey(itemId, itemType) {
  return `${itemType}:${itemId}`;
}

function isStarred(itemId, itemType) {
  return Boolean(stars[starKey(itemId, itemType)]);
}

function isSavedSong(songId) {
  return Boolean(savedSongs[songId]);
}

function getNoteCount(itemId, itemType) {
  return notes.filter((note) => note.itemId === itemId && note.itemType === itemType).length;
}

function describeRecordingError(error) {
  if (!window.isSecureContext) return "Mikrofon için HTTPS veya localhost üzerinden açman gerekir.";
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") return "Mikrofon izni reddedildi. Tarayıcı izinlerinden mikrofonu açıp tekrar dene.";
  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") return "Mikrofon bulunamadı. Telefonda veya tarayıcıda mikrofon erişimini kontrol et.";
  if (error?.name === "NotReadableError" || error?.name === "TrackStartError") return "Mikrofon şu anda başka bir uygulama tarafından kullanılıyor olabilir.";
  return "Mikrofon izni alınamadı veya kayıt başlatılamadı.";
}

function describePlaybackError(error) {
  if (error?.name === "NotAllowedError") return "Tarayıcı sesi otomatik başlatmayı engelledi. Play tuşuna tekrar dokun.";
  if (error?.name === "NotSupportedError") return "Bu ses dosyası tarayıcı tarafından desteklenmiyor.";
  if (error?.name === "AbortError") return "Ses başlatılırken işlem kesildi. Tekrar dene.";
  return "Ses çalınamadı. Dosyanın doğru klasörde olduğundan emin ol.";
}

function describeStorageError(error) {
  if (error?.name === "QuotaExceededError") {
    return "Kayıt saklanamadı: tarayıcı depolama alanı dolu. Chrome site verilerinde yer açıp tekrar dene.";
  }

  if (error?.name === "InvalidStateError" || error?.name === "TransactionInactiveError") {
    return "Kayıt saklanamadı: IndexedDB bağlantısı kapandı. Sayfayı yenileyip tekrar kayıt al.";
  }

  if (error?.name === "VersionError" || error?.name === "UpgradeBlocked") {
    return "Kayıt saklanamadı: eski uygulama sekmesi veritabanını kilitliyor. Diğer Miray Player sekmelerini kapatıp sayfayı yenile.";
  }

  if (error?.name === "DataCloneError") {
    return "Kayıt saklanamadı: tarayıcı bu ses Blob'unu IndexedDB içinde saklayamadı.";
  }

  return `Kayıt IndexedDB içine kaydedilemedi${error?.name ? ` (${error.name})` : ""}. Sayfayı yenileyip tekrar dene.`;
}

function normalizeSong(song) {
  return {
    ...song,
    type: "song",
    name: song.title,
    subtitle: song.artist,
    url: song.src,
    coverUrl: song.cover,
    searchable: [song.title, song.artist, song.category, ...(song.tags || [])].join(" "),
  };
}

function normalizeRecording(recording) {
  return {
    ...recording,
    type: "recording",
    title: recording.name || recording.fileName,
    subtitle: formatDisplayDate(recording.createdAt),
    url: getRecordingUrl(recording),
    coverUrl: "covers/demo.svg",
    searchable: [recording.name, recording.fileName, recording.duration, formatDisplayDate(recording.createdAt)].join(" "),
  };
}

function normalizePhoneMusic(item) {
  return {
    ...item,
    type: "phone",
    title: item.name || item.fileName,
    subtitle: item.fileName,
    url: getPhoneMusicUrl(item),
    coverUrl: "covers/miray-night.svg",
    searchable: [item.name, item.fileName, item.type].join(" "),
  };
}

function matchesSearch(item) {
  const term = searchTerm.trim().toLocaleLowerCase("tr-TR");
  if (!term) return true;
  const itemNotes = notes
    .filter((note) => note.itemId === item.id && note.itemType === item.type)
    .map((note) => `${note.title} ${note.text}`)
    .join(" ");
  return `${item.searchable || ""} ${itemNotes}`.toLocaleLowerCase("tr-TR").includes(term);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORDINGS_STORE)) {
        database.createObjectStore(RECORDINGS_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(PHONE_MUSIC_STORE)) {
        database.createObjectStore(PHONE_MUSIC_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new DOMException("IndexedDB upgrade blocked", "UpgradeBlocked"));
  });
}

async function ensureDb() {
  if (db && db.objectStoreNames.contains(RECORDINGS_STORE)) return db;
  db = await openDb();
  return db;
}

function store(name, mode = "readonly") {
  return db.transaction(name, mode).objectStore(name);
}

function getAllFromStore(name) {
  return new Promise((resolve, reject) => {
    const request = store(name).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putToStore(name, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, "readwrite");
    const request = tx.objectStore(name).put(value);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || request.error);
    tx.onabort = () => reject(tx.error || request.error);
  });
}

function deleteFromStore(name, id) {
  return new Promise((resolve, reject) => {
    const request = store(name, "readwrite").delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function saveToIndexedDB(storeName, value) {
  await ensureDb();
  await putToStore(storeName, value);
}

async function loadFromIndexedDB() {
  await ensureDb();
  const rawRecordings = await getAllFromStore(RECORDINGS_STORE);
  recordings = rawRecordings.map((recording) => {
    const createdAt = recording.createdAt || new Date().toISOString();
    return {
      ...recording,
      createdAt,
      name: recording.name || recording.fileName || `REC Kaydı - ${formatRecordingNameDate(new Date(createdAt))}`,
      duration: recording.duration || "00:00",
      notes: recording.notes || [],
      isStarred: recording.isStarred || false,
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  phoneMusic = (await getAllFromStore(PHONE_MUSIC_STORE)).map((item) => ({
    ...item,
    notes: item.notes || [],
    isStarred: item.isStarred || false,
  })).sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
}

function getRecordingUrl(recording) {
  const key = `recording:${recording.id}`;
  if (!objectUrls.has(key)) objectUrls.set(key, URL.createObjectURL(recording.blob));
  return objectUrls.get(key);
}

function getPhoneMusicUrl(item) {
  const key = `phone:${item.id}`;
  if (!objectUrls.has(key)) objectUrls.set(key, URL.createObjectURL(item.file));
  return objectUrls.get(key);
}

function renderCategories() {
  categoryBar.innerHTML = "";
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-tab${category.id === activeCategory ? " active" : ""}${category.favorite ? " favorite" : ""}`;
    button.textContent = category.icon ? `${category.icon} ${category.label}` : category.label;
    button.addEventListener("click", () => setActiveCategory(category.id));
    categoryBar.appendChild(button);
  });
}

function setActiveCategory(categoryId) {
  activeCategory = categoryId;
  const category = categories.find((item) => item.id === categoryId);
  libraryTitle.textContent = category?.label || "Kütüphane";
  renderCategories();
  renderCurrentCategory();
}

function renderCurrentCategory() {
  const category = categories.find((item) => item.id === activeCategory);
  categoryContent.innerHTML = "";

  if (activeCategory === "phone") {
    renderPhoneMusic(phoneMusic.map(normalizePhoneMusic).filter(matchesSearch));
    return;
  }

  if (activeCategory === "recordings") {
    renderRecordings(recordings.map(normalizeRecording).filter(matchesSearch));
    return;
  }

  if (activeCategory === "notes") {
    renderNotes(notes.filter(matchesNoteSearch));
    return;
  }

  let list = songs.map(normalizeSong);
  if (activeCategory === "favorites") {
    list = [
      ...songs.map(normalizeSong).filter((item) => isStarred(item.id, "song")),
      ...recordings.map(normalizeRecording).filter((item) => isStarred(item.id, "recording")),
      ...phoneMusic.map(normalizePhoneMusic).filter((item) => isStarred(item.id, "phone")),
    ];
  } else if (activeCategory === "saved") {
    list = list.filter((item) => isSavedSong(item.id));
  } else if (activeCategory === "demos") {
    list = list.filter((item) => item.category === "demo");
  }

  const filtered = list.filter(matchesSearch);
  if (activeCategory === "favorites") renderMixedItems(filtered);
  else renderSongs(filtered);

  if (!filtered.length) renderEmpty(category?.empty);
}

function renderEmpty(text) {
  categoryCount.textContent = "0";
  categoryContent.innerHTML = `<p class="empty-state">${escapeHtml(text || "Bu kategoride içerik yok.")}</p>`;
}

function renderSongs(list) {
  categoryCount.textContent = list.length;
  if (!list.length) return;
  categoryContent.innerHTML = `<div class="item-list">${list.map(songCardHtml).join("")}</div>`;
  bindSongCardActions();
}

function renderMixedItems(list) {
  categoryCount.textContent = list.length;
  if (!list.length) return;
  categoryContent.innerHTML = `<div class="item-list">${list.map((item) => {
    if (item.type === "song") return songCardHtml(item);
    if (item.type === "recording") return recordingCardHtml(item);
    return phoneMusicCardHtml(item);
  }).join("")}</div>`;
  bindSongCardActions();
  bindRecordingActions();
  bindPhoneMusicActions();
}

function songCardHtml(song) {
  const starred = isStarred(song.id, "song");
  const saved = isSavedSong(song.id);
  const noteCount = getNoteCount(song.id, "song");
  return `
    <article class="library-item" data-type="song" data-id="${escapeHtml(song.id)}">
      <img class="item-cover" src="${escapeHtml(song.coverUrl)}" alt="" />
      <div class="item-body">
        <div class="item-topline">
          <div>
            <p class="item-title">${escapeHtml(song.title)}</p>
            <p class="item-meta">${escapeHtml(song.artist)} · ${escapeHtml(song.dateAdded || "")}</p>
          </div>
        </div>
        <div class="tag-row">
          ${song.category === "demo" ? '<span class="tag demo-tag">Demo</span>' : ""}
          ${(song.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
          ${noteCount ? `<span class="tag">${noteCount} not</span>` : ""}
        </div>
        <div class="item-actions">
          <button type="button" class="primary" data-action="play-song">▶ Play</button>
          <button type="button" class="${starred ? "starred" : ""}" data-action="star-song">${starred ? "★ Yıldızlı" : "☆ Yıldız"}</button>
          <button type="button" class="${saved ? "saved" : ""}" data-action="save-song">${saved ? "✓ Kaydedildi" : "Kaydet"}</button>
          <button type="button" data-action="note-song">Not ekle</button>
        </div>
      </div>
    </article>
  `;
}

function recordingCardHtml(recording) {
  const starred = isStarred(recording.id, "recording");
  const noteCount = getNoteCount(recording.id, "recording");
  return `
    <article class="library-item recording-item" data-type="recording" data-id="${escapeHtml(recording.id)}">
      <img class="item-cover" src="covers/demo.svg" alt="" />
      <div class="item-body">
        <p class="recording-name">${escapeHtml(recording.title)}</p>
        <p class="recording-date">${escapeHtml(recording.subtitle)} · ${escapeHtml(recording.duration || "00:00")}</p>
        <div class="tag-row">
          <span class="tag">REC</span>
          ${noteCount ? `<span class="tag">${noteCount} not</span>` : ""}
        </div>
        <div class="recording-actions">
          <button type="button" class="listen" data-action="play-recording">Dinle</button>
          <button type="button" class="${starred ? "starred" : ""}" data-action="star-recording">${starred ? "★" : "☆"} Yıldız</button>
          <button type="button" class="rename" data-action="rename-recording">Adlandır</button>
          <button type="button" class="download" data-action="download-recording">İndir</button>
          <button type="button" class="note" data-action="note-recording">Not ekle</button>
          <button type="button" class="delete" data-action="delete-recording">Sil</button>
        </div>
      </div>
    </article>
  `;
}

function phoneMusicCardHtml(item) {
  const starred = isStarred(item.id, "phone");
  const noteCount = getNoteCount(item.id, "phone");
  return `
    <article class="library-item" data-type="phone" data-id="${escapeHtml(item.id)}">
      <img class="item-cover" src="covers/miray-night.svg" alt="" />
      <div class="item-body">
        <p class="item-title">${escapeHtml(item.title)}</p>
        <p class="item-meta">${escapeHtml(item.fileName)} · ${escapeHtml(formatDisplayDate(item.dateAdded))}</p>
        <div class="tag-row">
          <span class="tag">${escapeHtml(item.type || "audio")}</span>
          ${noteCount ? `<span class="tag">${noteCount} not</span>` : ""}
        </div>
        <div class="item-actions">
          <button type="button" class="primary" data-action="play-phone">▶ Dinle</button>
          <button type="button" class="${starred ? "starred" : ""}" data-action="star-phone">${starred ? "★ Yıldızlı" : "☆ Yıldız"}</button>
          <button type="button" data-action="note-phone">Not ekle</button>
        </div>
      </div>
    </article>
  `;
}

function renderRecordings(list) {
  categoryCount.textContent = list.length;
  if (!list.length) {
    renderEmpty(categories.find((item) => item.id === "recordings")?.empty);
    return;
  }
  categoryContent.innerHTML = `<div class="item-list">${list.map(recordingCardHtml).join("")}</div>`;
  bindRecordingActions();
}

function renderPhoneMusic(list) {
  categoryCount.textContent = list.length;
  categoryContent.innerHTML = `
    <div class="file-picker">
      <input id="phoneMusicInput" type="file" accept="audio/*" multiple />
      <button type="button" id="pickPhoneMusicBtn">Telefondan müzik seç</button>
      <p>MP3, WAV, M4A gibi ses dosyalarını seçebilirsin. Destekleyen tarayıcılarda seçilen müzikler IndexedDB içinde saklanır.</p>
    </div>
    ${list.length ? `<div class="item-list">${list.map(phoneMusicCardHtml).join("")}</div>` : `<p class="empty-state">${escapeHtml(categories.find((item) => item.id === "phone")?.empty)}</p>`}
  `;
  document.querySelector("#pickPhoneMusicBtn").addEventListener("click", () => document.querySelector("#phoneMusicInput").click());
  document.querySelector("#phoneMusicInput").addEventListener("change", handlePhoneMusicSelection);
  bindPhoneMusicActions();
}

function matchesNoteSearch(note) {
  const term = searchTerm.trim().toLocaleLowerCase("tr-TR");
  if (!term) return true;
  return `${note.title} ${note.text} ${getItemLabel(note.itemId, note.itemType)}`.toLocaleLowerCase("tr-TR").includes(term);
}

function renderNotes(list) {
  categoryCount.textContent = list.length;
  if (!list.length) {
    renderEmpty(categories.find((item) => item.id === "notes")?.empty);
    return;
  }
  categoryContent.innerHTML = `<div class="item-list">${list.map((note) => `
    <article class="note-item" data-note-id="${escapeHtml(note.id)}">
      <p class="note-title">${escapeHtml(note.title)}</p>
      <p class="note-meta">${escapeHtml(getItemLabel(note.itemId, note.itemType))} · ${escapeHtml(formatDisplayDate(note.updatedAt || note.createdAt))}</p>
      <p class="note-text">${escapeHtml(note.text)}</p>
      <div class="note-actions">
        <button type="button" data-action="edit-note">Düzenle</button>
        <button type="button" class="delete" data-action="delete-note">Sil</button>
      </div>
    </article>
  `).join("")}</div>`;
  bindNoteActions();
}

function renderTrackList() {
  trackList.innerHTML = "";
  currentQueue.slice(0, 5).forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `track-item${index === currentQueueIndex ? " active" : ""}`;
    button.innerHTML = `
      <img class="mini-cover" src="${escapeHtml(item.coverUrl || "covers/demo.svg")}" alt="" />
      <span>
        <span class="track-name">${escapeHtml(item.title || item.name)}</span>
        <span class="track-artist">${escapeHtml(item.subtitle || item.artist || item.fileName || "")}</span>
      </span>
    `;
    button.addEventListener("click", () => playQueueItem(index));
    trackList.appendChild(button);
  });
}

function setQueue(items, selectedId) {
  currentQueue = items;
  currentQueueIndex = Math.max(0, currentQueue.findIndex((item) => item.id === selectedId));
}

function updateNowPlaying(item) {
  coverArt.src = item.coverUrl || "covers/demo.svg";
  trackTitle.textContent = item.title || item.name;
  trackArtist.textContent = item.subtitle || item.artist || item.fileName || "";
  progress.value = 0;
  currentTimeLabel.textContent = "0:00";
  durationLabel.textContent = "0:00";
}

async function playItem(item, queue = [item]) {
  setQueue(queue, item.id);
  updateNowPlaying(item);
  audioPlayer.src = item.url || item.src;
  renderTrackList();
  await playAudio();
}

async function playQueueItem(index) {
  const item = currentQueue[index];
  if (!item) return;
  currentQueueIndex = index;
  updateNowPlaying(item);
  audioPlayer.src = item.url || item.src;
  renderTrackList();
  await playAudio();
}

async function playAudio() {
  try {
    hasTriedToPlay = true;
    await audioPlayer.play();
    playPauseBtn.textContent = "Ⅱ";
    playPauseBtn.setAttribute("aria-label", "Duraklat");
  } catch (error) {
    console.error(error);
    showMessage(describePlaybackError(error), true);
  }
}

function pauseAudio() {
  audioPlayer.pause();
  playPauseBtn.textContent = "▶";
  playPauseBtn.setAttribute("aria-label", "Oynat");
}

function playNextItem() {
  if (!currentQueue.length) return;
  playQueueItem((currentQueueIndex + 1) % currentQueue.length);
}

function playPreviousItem() {
  if (!currentQueue.length) return;
  playQueueItem((currentQueueIndex - 1 + currentQueue.length) % currentQueue.length);
}

function findCard(button) {
  return button.closest("[data-id]");
}

function bindSongCardActions() {
  categoryContent.querySelectorAll("[data-action='play-song']").forEach((button) => {
    button.addEventListener("click", () => {
      const id = findCard(button).dataset.id;
      const item = normalizeSong(songs.find((song) => song.id === id));
      playItem(item, songs.map(normalizeSong));
    });
  });

  categoryContent.querySelectorAll("[data-action='star-song']").forEach((button) => {
    button.addEventListener("click", () => toggleStar(findCard(button).dataset.id, "song"));
  });

  categoryContent.querySelectorAll("[data-action='save-song']").forEach((button) => {
    button.addEventListener("click", () => toggleSavedSong(findCard(button).dataset.id));
  });

  categoryContent.querySelectorAll("[data-action='note-song']").forEach((button) => {
    button.addEventListener("click", () => addNote(findCard(button).dataset.id, "song"));
  });
}

function bindRecordingActions() {
  categoryContent.querySelectorAll("[data-action='play-recording']").forEach((button) => {
    button.addEventListener("click", () => {
      const item = normalizeRecording(recordings.find((recording) => recording.id === findCard(button).dataset.id));
      playItem(item, recordings.map(normalizeRecording));
    });
  });

  categoryContent.querySelectorAll("[data-action='star-recording']").forEach((button) => {
    button.addEventListener("click", () => toggleStar(findCard(button).dataset.id, "recording"));
  });

  categoryContent.querySelectorAll("[data-action='rename-recording']").forEach((button) => {
    button.addEventListener("click", () => {
      const recording = recordings.find((item) => item.id === findCard(button).dataset.id);
      const newName = prompt("Kayıt adı:", recording?.name || "");
      if (newName !== null) renameRecording(recording.id, newName.trim());
    });
  });

  categoryContent.querySelectorAll("[data-action='download-recording']").forEach((button) => {
    button.addEventListener("click", () => downloadRecording(recordings.find((item) => item.id === findCard(button).dataset.id)));
  });

  categoryContent.querySelectorAll("[data-action='note-recording']").forEach((button) => {
    button.addEventListener("click", () => addNote(findCard(button).dataset.id, "recording"));
  });

  categoryContent.querySelectorAll("[data-action='delete-recording']").forEach((button) => {
    button.addEventListener("click", () => removeRecording(findCard(button).dataset.id));
  });
}

function bindPhoneMusicActions() {
  categoryContent.querySelectorAll("[data-action='play-phone']").forEach((button) => {
    button.addEventListener("click", () => {
      const item = normalizePhoneMusic(phoneMusic.find((music) => music.id === findCard(button).dataset.id));
      playItem(item, phoneMusic.map(normalizePhoneMusic));
    });
  });

  categoryContent.querySelectorAll("[data-action='star-phone']").forEach((button) => {
    button.addEventListener("click", () => toggleStar(findCard(button).dataset.id, "phone"));
  });

  categoryContent.querySelectorAll("[data-action='note-phone']").forEach((button) => {
    button.addEventListener("click", () => addNote(findCard(button).dataset.id, "phone"));
  });
}

function bindNoteActions() {
  categoryContent.querySelectorAll("[data-action='edit-note']").forEach((button) => {
    button.addEventListener("click", () => editNote(button.closest("[data-note-id]").dataset.noteId));
  });

  categoryContent.querySelectorAll("[data-action='delete-note']").forEach((button) => {
    button.addEventListener("click", () => deleteNote(button.closest("[data-note-id]").dataset.noteId));
  });
}

function toggleStar(itemId, itemType) {
  const key = starKey(itemId, itemType);
  if (stars[key]) delete stars[key];
  else stars[key] = true;
  writeJsonStorage(STORAGE_KEYS.stars, stars);
  renderCurrentCategory();
}

function toggleSavedSong(songId) {
  if (savedSongs[songId]) delete savedSongs[songId];
  else savedSongs[songId] = true;
  writeJsonStorage(STORAGE_KEYS.savedSongs, savedSongs);
  renderCurrentCategory();
}

async function renameRecording(recordingId, newName) {
  const recording = recordings.find((item) => item.id === recordingId);
  if (!recording) return;
  recording.name = newName || `REC Kaydı - ${formatRecordingNameDate(new Date(recording.createdAt))}`;
  await saveToIndexedDB(RECORDINGS_STORE, recording);
  await loadFromIndexedDB();
  renderCurrentCategory();
  showMessage("Kayıt adı güncellendi.");
}

function addNote(itemId, itemType) {
  const title = prompt("Not başlığı:", getItemLabel(itemId, itemType));
  if (title === null) return;
  const text = prompt("Not metni:", "");
  if (text === null) return;
  const now = new Date().toISOString();
  notes.unshift({
    id: crypto.randomUUID(),
    itemId,
    itemType,
    title: title.trim() || "İsimsiz not",
    text: text.trim(),
    createdAt: now,
    updatedAt: now,
  });
  writeJsonStorage(STORAGE_KEYS.notes, notes);
  renderCurrentCategory();
  showMessage("Not eklendi.");
}

function editNote(noteId) {
  const note = notes.find((item) => item.id === noteId);
  if (!note) return;
  const title = prompt("Not başlığı:", note.title);
  if (title === null) return;
  const text = prompt("Not metni:", note.text);
  if (text === null) return;
  note.title = title.trim() || "İsimsiz not";
  note.text = text.trim();
  note.updatedAt = new Date().toISOString();
  writeJsonStorage(STORAGE_KEYS.notes, notes);
  renderCurrentCategory();
  showMessage("Not güncellendi.");
}

function deleteNote(noteId) {
  if (!confirm("Bu not silinsin mi?")) return;
  notes = notes.filter((note) => note.id !== noteId);
  writeJsonStorage(STORAGE_KEYS.notes, notes);
  renderCurrentCategory();
  showMessage("Not silindi.");
}

function getItemLabel(itemId, itemType) {
  if (itemType === "song") {
    const song = songs.find((item) => item.id === itemId);
    return song ? `${song.title} - ${song.artist}` : "Şarkı";
  }
  if (itemType === "recording") {
    return recordings.find((item) => item.id === itemId)?.name || "REC kaydı";
  }
  return phoneMusic.find((item) => item.id === itemId)?.name || "Telefon müziği";
}

async function handlePhoneMusicSelection(event) {
  const files = [...event.target.files].filter((file) => file.type.startsWith("audio/"));
  if (!files.length) return;

  try {
    for (const file of files) {
      const item = {
        id: `local-${crypto.randomUUID()}`,
        name: file.name.replace(/\.[^.]+$/, ""),
        fileName: file.name,
        file,
        type: file.type || "audio/*",
        dateAdded: new Date().toISOString(),
        isStarred: false,
        notes: [],
      };
      await saveToIndexedDB(PHONE_MUSIC_STORE, item);
    }
    await loadFromIndexedDB();
    renderCurrentCategory();
    showMessage("Telefon müzikleri eklendi.");
  } catch (error) {
    console.error(error);
    showMessage("Telefon müziklerini tekrar seçmen gerekebilir. Tarayıcı dosyaları kalıcı saklayamadı.", true);
  }
}

function updateRecordTimer() {
  recordTimer.textContent = formatTimer(Math.floor((Date.now() - recordingStartedAt) / 1000));
}

async function startRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    showMessage("Zaten devam eden bir kayıt var.", true);
    return;
  }
  if (!("MediaRecorder" in window)) {
    showMessage("Bu tarayıcı MediaRecorder API desteklemiyor.", true);
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    showMessage("Bu tarayıcı mikrofon erişimini desteklemiyor.", true);
    return;
  }
  if (MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported("audio/webm")) {
    showMessage("Bu tarayıcı audio/webm kayıt formatını desteklemiyor.", true);
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: "audio/webm" });
    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) recordingChunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", handleRecordingStop);
    mediaRecorder.start();
    recordingStartedAt = Date.now();
    timerInterval = window.setInterval(updateRecordTimer, 500);
    updateRecordTimer();
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    recordBtn.classList.add("is-recording");
    showMessage("Kayıt devam ediyor.");
  } catch (error) {
    console.error(error);
    showMessage(describeRecordingError(error), true);
  }
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;
  mediaRecorder.stop();
  stopBtn.disabled = true;
}

async function handleRecordingStop() {
  window.clearInterval(timerInterval);
  recordTimer.textContent = "00:00";
  recordBtn.disabled = false;
  recordBtn.classList.remove("is-recording");
  mediaStream?.getTracks().forEach((track) => track.stop());

  try {
    const createdAt = new Date();
    const seconds = Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000));
    const defaultName = `REC Kaydı - ${formatRecordingNameDate(createdAt)}`;
    const givenName = prompt("Kayda isim ver:", defaultName);
    const name = givenName === null || !givenName.trim() ? defaultName : givenName.trim();
    const fileName = `miray-recording-${formatDateForFile(createdAt)}.webm`;
    const blob = new Blob(recordingChunks, { type: "audio/webm" });
    if (!blob.size) {
      showMessage("Kayıt boş geldi. Mikrofon sesini algılayıp tekrar dene.", true);
      return;
    }
    await saveToIndexedDB(RECORDINGS_STORE, {
      id: `rec-${crypto.randomUUID()}`,
      name,
      fileName,
      blob,
      duration: formatTimer(seconds),
      createdAt: createdAt.toISOString(),
      isStarred: false,
      notes: [],
    });
    await loadFromIndexedDB();
    setActiveCategory("recordings");
    showMessage("Kayıt REC Kayıtlarım bölümüne eklendi.");
  } catch (error) {
    console.error(error);
    showMessage(describeStorageError(error), true);
  }
}

async function removeRecording(recordingId) {
  if (!confirm("Bu REC kaydı silinsin mi?")) return;
  await deleteFromStore(RECORDINGS_STORE, recordingId);
  stars = Object.fromEntries(Object.entries(stars).filter(([key]) => key !== starKey(recordingId, "recording")));
  notes = notes.filter((note) => !(note.itemId === recordingId && note.itemType === "recording"));
  writeJsonStorage(STORAGE_KEYS.stars, stars);
  writeJsonStorage(STORAGE_KEYS.notes, notes);
  const url = objectUrls.get(`recording:${recordingId}`);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(`recording:${recordingId}`);
  await loadFromIndexedDB();
  renderCurrentCategory();
  showMessage("REC kaydı silindi.");
}

async function downloadRecording(recording) {
  try {
    if ("showDirectoryPicker" in window) {
      const directoryHandle = await window.showDirectoryPicker();
      const fileHandle = await directoryHandle.getFileHandle(recording.fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(recording.blob);
      await writable.close();
      showMessage("Kayıt seçilen klasöre kaydedildi.");
      return;
    }
  } catch (error) {
    console.warn("File System Access iptal edildi veya başarısız oldu, normal indirme deneniyor.", error);
  }

  const url = URL.createObjectURL(recording.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = recording.fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  showMessage("Kayıt indirme olarak başlatıldı.");
}

playPauseBtn.addEventListener("click", () => {
  if (audioPlayer.paused) playAudio();
  else pauseAudio();
});

prevBtn.addEventListener("click", playPreviousItem);
nextBtn.addEventListener("click", playNextItem);

audioPlayer.addEventListener("loadedmetadata", () => {
  durationLabel.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener("timeupdate", () => {
  if (!audioPlayer.duration) return;
  progress.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  currentTimeLabel.textContent = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener("ended", playNextItem);
audioPlayer.addEventListener("error", () => {
  if (hasTriedToPlay) showMessage("Ses dosyası bulunamadı veya açılamadı.", true);
});

progress.addEventListener("input", () => {
  if (!audioPlayer.duration) return;
  audioPlayer.currentTime = (progress.value / 100) * audioPlayer.duration;
});

volume.addEventListener("input", () => {
  audioPlayer.volume = volume.value;
});

searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value;
  renderCurrentCategory();
});

recordBtn.addEventListener("click", startRecording);
stopBtn.addEventListener("click", stopRecording);

window.addEventListener("beforeunload", () => {
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").then(() => {
      installStatus.textContent = "Offline hazır";
    }).catch((error) => {
      console.error(error);
      installStatus.textContent = "SW hatası";
    });
  });
}

async function init() {
  audioPlayer.volume = volume.value;
  stars = readJsonStorage(STORAGE_KEYS.stars, {});
  savedSongs = readJsonStorage(STORAGE_KEYS.savedSongs, {});
  notes = readJsonStorage(STORAGE_KEYS.notes, []);
  setQueue(songs.map(normalizeSong), songs[0]?.id);
  updateNowPlaying(currentQueue[0]);
  renderTrackList();
  renderCategories();

  try {
    db = await openDb();
    await loadFromIndexedDB();
  } catch (error) {
    console.error(error);
    showMessage("IndexedDB açılamadı. REC ve telefon müzikleri kalıcı saklanamayabilir.", true);
  }

  setActiveCategory("all");
}

init();
