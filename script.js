"use strict";

// ============================================================
// SONGS ARRAY
// Kendi müziklerinizi eklemek için sadece bu listeyi düzenleyin.
// 1. MP3 dosyasını /music klasörüne koyun.
// 2. Kapak görselini /covers klasörüne koyun.
// 3. Aşağıdaki örnek formatta yeni bir şarkı objesi ekleyin.
//
// Örnek olarak aşağıdaki objeyi kopyalayıp songs içine ekleyebilirsin:
// {
//   id: "song-001",
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
const songs = [];

const categories = [
  { id: "all", label: "Tüm Şarkılar", icon: "♫", empty: "Bu kategoride henüz şarkı yok." },
  { id: "phone", label: "Telefon Müziklerim", icon: "▣", empty: "Telefondan müzik seçerek buraya ekleyebilirsin." },
  { id: "recordings", label: "REC Kayıtlarım", icon: "●", empty: "Henüz REC kaydı yok. Record tuşuyla kayıt al." },
  { id: "notes", label: "Kayıt Notlarım", icon: "✎", empty: "Henüz not yok. Şarkı veya kayıtlara not ekleyebilirsin." },
  { id: "favorites", label: "En Çok Beğendiklerim", icon: "♥★", empty: "Kalp veya yıldız verdiğin içerikler burada görünecek.", favorite: true },
  { id: "saved", label: "Kaydettiğim Şarkılar", icon: "✓", empty: "Kaydettiğin şarkılar burada listelenecek." },
  { id: "trash", label: "Çöp Kutusu", icon: "⌫", empty: "Silinen şarkı ve kayıtlar burada kalır. İstersen geri alabilirsin." },
];

const DB_NAME = "miray-player-recorder";
const DB_VERSION = 2;
const RECORDINGS_STORE = "recordings";
const PHONE_MUSIC_STORE = "phoneMusic";
const STORAGE_KEYS = {
  stars: "miray-stars",
  hearts: "miray-hearts",
  savedSongs: "miray-saved-songs",
  notes: "miray-notes",
  deletedSongs: "miray-deleted-songs",
};

const audioPlayer = document.querySelector("#audioPlayer");
const coverArt = document.querySelector("#coverArt");
const trackTitle = document.querySelector("#trackTitle");
const trackArtist = document.querySelector("#trackArtist");
const progress = document.querySelector("#progress");
const currentTimeLabel = document.querySelector("#currentTime");
const durationLabel = document.querySelector("#duration");
const playPauseBtn = document.querySelector("#playPauseBtn");
const speedDownBtn = document.querySelector("#speedDownBtn");
const speedUpBtn = document.querySelector("#speedUpBtn");
const speedLabel = document.querySelector("#speedLabel");
const volume = document.querySelector("#volume");
const trackList = document.querySelector("#trackList");
const recordBtn = document.querySelector("#recordBtn");
const stopBtn = document.querySelector("#stopBtn");
const appendRecordBtn = document.querySelector("#appendRecordBtn");
const recordTimer = document.querySelector("#recordTimer");
const recordBigTime = document.querySelector("#recordBigTime");
const recordSize = document.querySelector("#recordSize");
const recordFormat = document.querySelector("#recordFormat");
const waveDisplay = document.querySelector("#waveDisplay");
const message = document.querySelector("#message");
const installStatus = document.querySelector("#installStatus");
const categoryBar = document.querySelector("#categoryBar");
const categoryContent = document.querySelector("#categoryContent");
const categoryCount = document.querySelector("#categoryCount");
const libraryTitle = document.querySelector("#libraryTitle");
const searchInput = document.querySelector("#searchInput");
const appScreenTitle = document.querySelector("#appScreenTitle");
const bottomNav = document.querySelector(".bottom-nav");
const screenPanels = document.querySelectorAll(".screen-panel");
const recordingListView = document.querySelector("#recordingListView");
const listTitle = document.querySelector("#listTitle");
const recordingSearchInput = document.querySelector("#recordingSearchInput");
const toggleListSearchBtn = document.querySelector("#toggleListSearchBtn");
const selectionModeBtn = document.querySelector("#selectionModeBtn");
const exportZipBtn = document.querySelector("#exportZipBtn");
const sortMenuBtn = document.querySelector("#sortMenuBtn");
const sortPanel = document.querySelector("#sortPanel");
const bulkActions = document.querySelector("#bulkActions");
const bulkStarBtn = document.querySelector("#bulkStarBtn");
const bulkDeleteBtn = document.querySelector("#bulkDeleteBtn");
const bulkDownloadBtn = document.querySelector("#bulkDownloadBtn");
const listBackBtn = document.querySelector("#listBackBtn");
const notesScreenCount = document.querySelector("#notesScreenCount");
const notesScreenContent = document.querySelector("#notesScreenContent");
const sheetBackdrop = document.querySelector("#sheetBackdrop");
const recordingMenu = document.querySelector("#recordingMenu");
const recordingMenuTitle = document.querySelector("#recordingMenuTitle");
const saveRecordingBackdrop = document.querySelector("#saveRecordingBackdrop");
const saveRecordingModal = document.querySelector("#saveRecordingModal");
const recordingNameInput = document.querySelector("#recordingNameInput");
const confirmSaveRecordingBtn = document.querySelector("#confirmSaveRecordingBtn");
const zipExportBackdrop = document.querySelector("#zipExportBackdrop");
const zipExportModal = document.querySelector("#zipExportModal");
const zipExportInfo = document.querySelector("#zipExportInfo");
const downloadZipBtn = document.querySelector("#downloadZipBtn");
const shareZipBtn = document.querySelector("#shareZipBtn");
const closeZipModalBtn = document.querySelector("#closeZipModalBtn");

let db;
let mediaRecorder;
let mediaStream;
let recordingChunks = [];
let recordingStartedAt = 0;
let appendTargetId = null;
let timerInterval;
let hasTriedToPlay = false;
let playbackRate = 1;
let activeCategory = "all";
let activeScreen = "player";
let searchTerm = "";
let recordingSearchTerm = "";
let recordingSort = "newest";
let favoriteFilter = "all";
let selectionMode = false;
let selectedRecordings = new Set();
let activeMenuRecordingId = null;
let recordings = [];
let deletedRecordings = [];
let phoneMusic = [];
let deletedPhoneMusic = [];
let notes = [];
let stars = {};
let hearts = {};
let savedSongs = {};
let deletedSongs = {};
let currentQueue = [];
let currentQueueIndex = 0;
let objectUrls = new Map();
let selectedRecordingMimeType = "audio/webm";
let pendingRecordingSave = null;
let preparedZipArchive = null;
let crcTable;
let toastTimeout;

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

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

function parseTimer(value) {
  const [minutes = "0", seconds = "0"] = String(value || "0:00").split(":");
  return Number(minutes) * 60 + Number(seconds);
}

function formatBytes(bytes = 0) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 1024 * 100 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSupportedRecordingMimeType() {
  const options = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];
  return options.find((type) => !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(type)) || "";
}

function getFormatLabel(mimeType) {
  if (mimeType.includes("mpeg")) return "MP3 / 44100Hz";
  if (mimeType.includes("mp4")) return "MP4 / 44100Hz";
  if (mimeType.includes("webm")) return "WEBM / 48000Hz";
  return "WEBM / 48000Hz";
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

function sanitizeFileName(value) {
  return String(value || "recording")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 90) || "recording";
}

function updatePlaybackRate(nextRate) {
  const safeRate = Math.min(2, Math.max(0.5, Number(nextRate) || 1));
  playbackRate = safeRate;
  audioPlayer.playbackRate = playbackRate;
  speedLabel.textContent = `${playbackRate.toFixed(2)}x`;
  speedDownBtn.disabled = playbackRate <= PLAYBACK_RATES[0];
  speedUpBtn.disabled = playbackRate >= PLAYBACK_RATES[PLAYBACK_RATES.length - 1];
}

function stepPlaybackRate(direction) {
  const currentIndex = PLAYBACK_RATES.findIndex((rate) => Math.abs(rate - playbackRate) < 0.01);
  const fallbackIndex = PLAYBACK_RATES.indexOf(1);
  const nextIndex = Math.min(
    PLAYBACK_RATES.length - 1,
    Math.max(0, (currentIndex === -1 ? fallbackIndex : currentIndex) + direction)
  );
  updatePlaybackRate(PLAYBACK_RATES[nextIndex]);
}

function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    crcTable[i] = crc >>> 0;
  }
  return crcTable;
}

function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(dateValue) {
  const date = new Date(dateValue || Date.now());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function zipHeader(length) {
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  return { bytes, view };
}

function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
  showToast(text, isError);
  if (isError) console.error(text);
}

function setActiveScreen(screenId) {
  activeScreen = screenId;
  screenPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.screen === screenId));
  bottomNav.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === screenId);
  });
  const titles = {
    player: "Miray Player",
    record: "Miray Recorder",
    list: `Liste [${recordings.length}]`,
    categories: "Kategoriler",
    notes: "Notlar",
  };
  appScreenTitle.textContent = titles[screenId] || "Miray Recorder";
  if (screenId === "list") renderRecordingsList();
  if (screenId === "categories") renderCurrentCategory();
  if (screenId === "notes") renderNotesScreen();
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

function showToast(text, isError = false) {
  let toast = document.querySelector("#toastMessage");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toastMessage";
    toast.className = "toast-message";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }

  toast.textContent = text;
  toast.classList.toggle("error", isError);
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), isError ? 4200 : 2600);
}

function starKey(itemId, itemType) {
  return `${itemType}:${itemId}`;
}

function isStarred(itemId, itemType) {
  return Boolean(stars[starKey(itemId, itemType)]);
}

function heartKey(itemId, itemType) {
  return `${itemType}:${itemId}`;
}

function isHearted(itemId, itemType) {
  return Boolean(hearts[heartKey(itemId, itemType)]);
}

function isSavedSong(songId) {
  return Boolean(savedSongs[songId]);
}

function isDeletedSong(songId) {
  return Boolean(deletedSongs[songId]);
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
    isHearted: recording.isHearted || false,
    deletedAt: recording.deletedAt || null,
  };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  deletedRecordings = recordings.filter((recording) => recording.deletedAt);
  recordings = recordings.filter((recording) => !recording.deletedAt);

  phoneMusic = (await getAllFromStore(PHONE_MUSIC_STORE)).map((item) => ({
    ...item,
    notes: item.notes || [],
    isStarred: item.isStarred || false,
    isHearted: item.isHearted || false,
    deletedAt: item.deletedAt || null,
  })).sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

  deletedPhoneMusic = phoneMusic.filter((item) => item.deletedAt);
  phoneMusic = phoneMusic.filter((item) => !item.deletedAt);
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

  if (activeCategory === "trash") {
    const trashItems = [
      ...songs.filter((song) => isDeletedSong(song.id)).map(normalizeSong),
      ...deletedRecordings.map(normalizeRecording),
      ...deletedPhoneMusic.map(normalizePhoneMusic),
    ].filter(matchesSearch);
    renderTrashItems(trashItems);
    return;
  }

  let list = songs.filter((song) => !isDeletedSong(song.id)).map(normalizeSong);
  if (activeCategory === "favorites") {
    list = [
      ...songs.filter((song) => !isDeletedSong(song.id)).map(normalizeSong),
      ...recordings.map(normalizeRecording),
      ...phoneMusic.map(normalizePhoneMusic),
    ].filter((item) => {
      const starred = isStarred(item.id, item.type);
      const hearted = isHearted(item.id, item.type);
      if (favoriteFilter === "star") return starred;
      if (favoriteFilter === "heart") return hearted;
      return starred || hearted;
    });
  } else if (activeCategory === "saved") {
    list = list.filter((item) => isSavedSong(item.id));
  }

  const filtered = list.filter(matchesSearch);
  if (activeCategory === "favorites") {
    renderFavoriteItems(filtered);
    return;
  }
  renderSongs(filtered);

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

function renderFavoriteItems(list) {
  categoryCount.textContent = list.length;
  const filterBar = `
    <div class="favorite-filter">
      <button type="button" class="${favoriteFilter === "all" ? "active" : ""}" data-favorite-filter="all">♥★ Hepsi</button>
      <button type="button" class="${favoriteFilter === "heart" ? "active" : ""}" data-favorite-filter="heart">♥ Kalpliler</button>
      <button type="button" class="${favoriteFilter === "star" ? "active" : ""}" data-favorite-filter="star">★ Yıldızlılar</button>
    </div>
  `;
  if (!list.length) {
    categoryContent.innerHTML = `${filterBar}<p class="empty-state">${escapeHtml(categories.find((item) => item.id === "favorites")?.empty)}</p>`;
  } else {
    categoryContent.innerHTML = `${filterBar}<div class="item-list">${list.map((item) => {
      if (item.type === "song") return songCardHtml(item);
      if (item.type === "recording") return recordingCardHtml(item);
      return phoneMusicCardHtml(item);
    }).join("")}</div>`;
  }
  categoryContent.querySelectorAll("[data-favorite-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      favoriteFilter = button.dataset.favoriteFilter;
      renderCurrentCategory();
    });
  });
  bindSongCardActions();
  bindRecordingActions();
  bindPhoneMusicActions();
}

function renderTrashItems(list) {
  categoryCount.textContent = list.length;
  const empty = categories.find((item) => item.id === "trash")?.empty;
  if (!list.length) {
    renderEmpty(empty);
    return;
  }
  categoryContent.innerHTML = `<div class="item-list">${list.map(trashCardHtml).join("")}</div>`;
  bindTrashActions();
}

function trashCardHtml(item) {
  return `
    <article class="library-item trash-item" data-type="${escapeHtml(item.type)}" data-id="${escapeHtml(item.id)}">
      <img class="item-cover" src="${escapeHtml(item.coverUrl || "covers/demo.svg")}" alt="" />
      <div class="item-body">
        <p class="item-title">${escapeHtml(item.title || item.name)}</p>
        <p class="item-meta">${escapeHtml(item.subtitle || item.fileName || "")}</p>
        <div class="tag-row">
          <span class="tag">Çöp Kutusu</span>
          ${item.deletedAt ? `<span class="tag">${escapeHtml(formatDisplayDate(item.deletedAt))}</span>` : ""}
        </div>
        <div class="item-actions">
          <button type="button" class="primary" data-action="restore-trash">Geri al</button>
          <button type="button" class="delete" data-action="purge-trash">Kalıcı sil</button>
        </div>
      </div>
    </article>
  `;
}

function songCardHtml(song) {
  const starred = isStarred(song.id, "song");
  const hearted = isHearted(song.id, "song");
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
          <button type="button" class="${hearted ? "hearted" : ""}" data-action="heart-song">${hearted ? "♥ Kalpli" : "♡ Kalp"}</button>
          <button type="button" class="${saved ? "saved" : ""}" data-action="save-song">${saved ? "✓ Kaydedildi" : "Kaydet"}</button>
          <button type="button" data-action="note-song">Not ekle</button>
          <button type="button" class="delete" data-action="delete-song">Çöpe taşı</button>
        </div>
      </div>
    </article>
  `;
}

function recordingCardHtml(recording) {
  const starred = isStarred(recording.id, "recording");
  const hearted = isHearted(recording.id, "recording");
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
          <button type="button" class="${hearted ? "hearted" : ""}" data-action="heart-recording">${hearted ? "♥" : "♡"} Kalp</button>
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
  const hearted = isHearted(item.id, "phone");
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
          <button type="button" class="${hearted ? "hearted" : ""}" data-action="heart-phone">${hearted ? "♥ Kalpli" : "♡ Kalp"}</button>
          <button type="button" data-action="note-phone">Not ekle</button>
          <button type="button" class="delete" data-action="delete-phone">Çöpe taşı</button>
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

function getSortedRecordings() {
  const term = recordingSearchTerm.trim().toLocaleLowerCase("tr-TR");
  let list = recordings.filter((recording) => {
    if (!term) return true;
    return `${recording.name} ${recording.fileName}`.toLocaleLowerCase("tr-TR").includes(term);
  });

  list = [...list].sort((a, b) => {
    if (recordingSort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
    if (recordingSort === "az") return (a.name || "").localeCompare(b.name || "", "tr");
    if (recordingSort === "za") return (b.name || "").localeCompare(a.name || "", "tr");
    if (recordingSort === "size") return (b.blob?.size || 0) - (a.blob?.size || 0);
    if (recordingSort === "duration") return parseTimer(b.duration) - parseTimer(a.duration);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return list;
}

function renderRecordingsList() {
  const list = getSortedRecordings();
  listTitle.textContent = `Liste [${list.length}]`;
  recordingListView.innerHTML = "";

  if (!list.length) {
    recordingListView.innerHTML = '<p class="empty-state">Henüz kayıt yok. Kayıt Al bölümünden yeni REC oluştur.</p>';
    return;
  }

  recordingListView.innerHTML = list.map((recording) => {
    const checked = selectedRecordings.has(recording.id) ? "checked" : "";
    return `
      <article class="recording-row" data-id="${escapeHtml(recording.id)}">
        ${selectionMode ? `<input class="row-check" type="checkbox" ${checked} aria-label="Kaydı seç" />` : `<button class="row-play" type="button" data-row-action="play">▶</button>`}
        <div>
          <p class="row-title">${escapeHtml(recording.name)}</p>
          <p class="row-meta">${escapeHtml(formatDisplayDate(recording.createdAt))}</p>
        </div>
        <div class="row-side">
          <div>${escapeHtml(recording.duration || "00:00")}</div>
          <div>${escapeHtml(formatBytes(recording.blob?.size || 0))}</div>
        </div>
        <button class="row-menu" type="button" data-row-action="menu" aria-label="Kayıt menüsü">⋮</button>
      </article>
    `;
  }).join("");

  recordingListView.querySelectorAll("[data-row-action='play']").forEach((button) => {
    button.addEventListener("click", () => {
      const recording = recordings.find((item) => item.id === button.closest("[data-id]").dataset.id);
      playItem(normalizeRecording(recording), [normalizeRecording(recording)]);
    });
  });

  recordingListView.querySelectorAll("[data-row-action='menu']").forEach((button) => {
    button.addEventListener("click", () => openRecordingMenu(button.closest("[data-id]").dataset.id));
  });

  recordingListView.querySelectorAll(".row-check").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.closest("[data-id]").dataset.id;
      if (checkbox.checked) selectedRecordings.add(id);
      else selectedRecordings.delete(id);
    });
  });
}

function openRecordingMenu(recordingId) {
  const recording = recordings.find((item) => item.id === recordingId);
  if (!recording) return;
  activeMenuRecordingId = recordingId;
  recordingMenuTitle.textContent = recording.name;
  const starButton = recordingMenu.querySelector("[data-menu-action='star']");
  const heartButton = recordingMenu.querySelector("[data-menu-action='heart']");
  starButton.textContent = isStarred(recordingId, "recording") ? "★ Yıldızı kaldır" : "☆ En Beğendiklerime ekle";
  heartButton.textContent = isHearted(recordingId, "recording") ? "♥ Kalbi kaldır" : "♡ Kalplilerime ekle";
  sheetBackdrop.hidden = false;
  recordingMenu.hidden = false;
}

function closeRecordingMenu() {
  sheetBackdrop.hidden = true;
  recordingMenu.hidden = true;
  activeMenuRecordingId = null;
}

function getActiveMenuRecording() {
  return recordings.find((item) => item.id === activeMenuRecordingId);
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

function renderNotesScreen() {
  notesScreenCount.textContent = notes.length;
  if (!notes.length) {
    notesScreenContent.innerHTML = '<p class="empty-state">Henüz not yok. Şarkı veya kayıt kartlarından not ekleyebilirsin.</p>';
    return;
  }
  notesScreenContent.innerHTML = `<div class="item-list">${notes.map((note) => `
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
  notesScreenContent.querySelectorAll("[data-action='edit-note']").forEach((button) => {
    button.addEventListener("click", () => editNote(button.closest("[data-note-id]").dataset.noteId));
  });
  notesScreenContent.querySelectorAll("[data-action='delete-note']").forEach((button) => {
    button.addEventListener("click", () => deleteNote(button.closest("[data-note-id]").dataset.noteId));
  });
}

function renderTrackList() {
  trackList.innerHTML = "";
  if (!currentQueue.length) {
    trackList.innerHTML = '<p class="empty-state">Player listesi boş. Telefon Müziklerim veya REC Kayıtlarım bölümünden ses ekleyebilirsin.</p>';
    return;
  }
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
  if (!item) {
    coverArt.src = "covers/demo.svg";
    trackTitle.textContent = "Henüz şarkı seçilmedi";
    trackArtist.textContent = "Telefon müziği veya REC kaydı ekle";
    progress.value = 0;
    currentTimeLabel.textContent = "0:00";
    durationLabel.textContent = "0:00";
    audioPlayer.removeAttribute("src");
    return;
  }
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
  audioPlayer.playbackRate = playbackRate;
  renderTrackList();
  await playAudio();
}

async function playQueueItem(index) {
  const item = currentQueue[index];
  if (!item) return;
  currentQueueIndex = index;
  updateNowPlaying(item);
  audioPlayer.src = item.url || item.src;
  audioPlayer.playbackRate = playbackRate;
  renderTrackList();
  await playAudio();
}

async function playAudio() {
  if (!audioPlayer.src) {
    showMessage("Önce bir şarkı veya kayıt seç.", true);
    return;
  }
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
  if (currentQueue.length < 2) return;
  playQueueItem((currentQueueIndex + 1) % currentQueue.length);
}

function playPreviousItem() {
  if (currentQueue.length < 2) return;
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

  categoryContent.querySelectorAll("[data-action='heart-song']").forEach((button) => {
    button.addEventListener("click", () => toggleHeart(findCard(button).dataset.id, "song"));
  });

  categoryContent.querySelectorAll("[data-action='save-song']").forEach((button) => {
    button.addEventListener("click", () => toggleSavedSong(findCard(button).dataset.id));
  });

  categoryContent.querySelectorAll("[data-action='note-song']").forEach((button) => {
    button.addEventListener("click", () => addNote(findCard(button).dataset.id, "song"));
  });

  categoryContent.querySelectorAll("[data-action='delete-song']").forEach((button) => {
    button.addEventListener("click", () => moveSongToTrash(findCard(button).dataset.id));
  });
}

function bindRecordingActions() {
  categoryContent.querySelectorAll("[data-action='play-recording']").forEach((button) => {
    button.addEventListener("click", () => {
      const item = normalizeRecording(recordings.find((recording) => recording.id === findCard(button).dataset.id));
      playItem(item, [item]);
    });
  });

  categoryContent.querySelectorAll("[data-action='star-recording']").forEach((button) => {
    button.addEventListener("click", () => toggleStar(findCard(button).dataset.id, "recording"));
  });

  categoryContent.querySelectorAll("[data-action='heart-recording']").forEach((button) => {
    button.addEventListener("click", () => toggleHeart(findCard(button).dataset.id, "recording"));
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

  categoryContent.querySelectorAll("[data-action='heart-phone']").forEach((button) => {
    button.addEventListener("click", () => toggleHeart(findCard(button).dataset.id, "phone"));
  });

  categoryContent.querySelectorAll("[data-action='note-phone']").forEach((button) => {
    button.addEventListener("click", () => addNote(findCard(button).dataset.id, "phone"));
  });

  categoryContent.querySelectorAll("[data-action='delete-phone']").forEach((button) => {
    button.addEventListener("click", () => movePhoneMusicToTrash(findCard(button).dataset.id));
  });
}

function bindTrashActions() {
  categoryContent.querySelectorAll("[data-action='restore-trash']").forEach((button) => {
    button.addEventListener("click", () => restoreFromTrash(findCard(button).dataset.id, findCard(button).dataset.type));
  });

  categoryContent.querySelectorAll("[data-action='purge-trash']").forEach((button) => {
    button.addEventListener("click", () => permanentlyDeleteFromTrash(findCard(button).dataset.id, findCard(button).dataset.type));
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
  if (activeScreen === "list") renderRecordingsList();
}

function toggleHeart(itemId, itemType) {
  const key = heartKey(itemId, itemType);
  if (hearts[key]) delete hearts[key];
  else hearts[key] = true;
  writeJsonStorage(STORAGE_KEYS.hearts, hearts);
  renderCurrentCategory();
  if (activeScreen === "list") renderRecordingsList();
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
  if (activeScreen === "list") renderRecordingsList();
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
  renderNotesScreen();
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
  renderNotesScreen();
  showMessage("Not güncellendi.");
}

function deleteNote(noteId) {
  if (!confirm("Bu not silinsin mi?")) return;
  notes = notes.filter((note) => note.id !== noteId);
  writeJsonStorage(STORAGE_KEYS.notes, notes);
  renderCurrentCategory();
  renderNotesScreen();
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
  const elapsed = Math.floor((Date.now() - recordingStartedAt) / 1000);
  const formatted = formatTimer(elapsed);
  recordTimer.textContent = formatted;
  recordBigTime.textContent = formatted;
  const currentBytes = recordingChunks.reduce((total, chunk) => total + chunk.size, 0);
  recordSize.textContent = formatBytes(currentBytes);
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
  selectedRecordingMimeType = getSupportedRecordingMimeType();
  if (!selectedRecordingMimeType) {
    showMessage("Bu tarayıcı desteklenen ses kayıt formatı sunmuyor.", true);
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: selectedRecordingMimeType });
    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) recordingChunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", handleRecordingStop);
    mediaRecorder.start();
    recordingStartedAt = Date.now();
    timerInterval = window.setInterval(updateRecordTimer, 500);
    updateRecordTimer();
    recordBtn.textContent = "■ Stop";
    stopBtn.disabled = false;
    appendRecordBtn.disabled = true;
    recordBtn.classList.add("is-recording");
    waveDisplay.classList.add("is-recording");
    showMessage("Kayıt devam ediyor.");
  } catch (error) {
    appendTargetId = null;
    updateAppendButton();
    console.error(error);
    showMessage(describeRecordingError(error), true);
  }
}

async function startAppendRecording() {
  const latest = recordings[0];
  if (!latest) {
    showMessage("Üzerine devam etmek için önce bir kayıt oluştur.", true);
    return;
  }
  appendTargetId = latest.id;
  showMessage(`Devam kaydı başladı: ${latest.name}`);
  await startRecording();
}

function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state !== "recording") return;
  mediaRecorder.stop();
  recordBtn.textContent = "● Record";
  stopBtn.disabled = true;
  updateAppendButton();
}

async function handleRecordingStop() {
  window.clearInterval(timerInterval);
  recordTimer.textContent = "00:00";
  recordBigTime.textContent = "00:00";
  recordSize.textContent = "0 KB";
  recordBtn.textContent = "● Record";
  recordBtn.classList.remove("is-recording");
  waveDisplay.classList.remove("is-recording");
  mediaStream?.getTracks().forEach((track) => track.stop());

  const createdAt = new Date();
  const seconds = Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000));
  const blob = new Blob(recordingChunks, { type: selectedRecordingMimeType || "audio/webm" });
  if (!blob.size) {
    appendTargetId = null;
    showMessage("Kayıt boş geldi. Mikrofon sesini algılayıp tekrar dene.", true);
    return;
  }

  if (appendTargetId) {
    await saveAppendRecording(blob, seconds);
    return;
  }

  const defaultName = `REC Kaydı - ${formatRecordingNameDate(createdAt)}`;
  pendingRecordingSave = {
    blob,
    seconds,
    createdAt,
    defaultName,
    fileName: `miray-recording-${formatDateForFile(createdAt)}.webm`,
    star: false,
    heart: false,
    saved: false,
  };
  openSaveRecordingModal(defaultName);
}

function openSaveRecordingModal(defaultName) {
  recordingNameInput.value = defaultName;
  saveRecordingModal.querySelectorAll("[data-save-mark]").forEach((button) => {
    button.classList.remove("active");
    if (button.dataset.saveMark === "star") button.innerHTML = "☆<span>Yıldız</span>";
    if (button.dataset.saveMark === "heart") button.innerHTML = "♡<span>Kalp</span>";
    if (button.dataset.saveMark === "saved") button.innerHTML = "✓<span>Sakla</span>";
  });
  saveRecordingBackdrop.hidden = false;
  saveRecordingModal.hidden = false;
  recordingNameInput.focus();
}

function closeSaveRecordingModal() {
  saveRecordingBackdrop.hidden = true;
  saveRecordingModal.hidden = true;
}

async function savePendingRecording() {
  if (!pendingRecordingSave) return;
  const data = pendingRecordingSave;
  const name = recordingNameInput.value.trim() || data.defaultName;
  const id = `rec-${crypto.randomUUID()}`;

  try {
    await saveToIndexedDB(RECORDINGS_STORE, {
      id,
      name,
      fileName: data.fileName,
      blob: data.blob,
      duration: formatTimer(data.seconds),
      createdAt: data.createdAt.toISOString(),
      isStarred: data.star,
      isHearted: data.heart,
      isSaved: data.saved,
      deletedAt: null,
      notes: [],
    });
    if (data.star) stars[starKey(id, "recording")] = true;
    if (data.heart) hearts[heartKey(id, "recording")] = true;
    writeJsonStorage(STORAGE_KEYS.stars, stars);
    writeJsonStorage(STORAGE_KEYS.hearts, hearts);
    pendingRecordingSave = null;
    closeSaveRecordingModal();
    await loadFromIndexedDB();
    updateAppendButton();
    setActiveCategory("recordings");
    setActiveScreen("list");
    renderRecordingsList();
    showMessage("Kayıt REC Kayıtlarım bölümüne eklendi.");
  } catch (error) {
    console.error(error);
    showMessage(describeStorageError(error), true);
  }
}

async function saveAppendRecording(blob, seconds) {
  const targetId = appendTargetId;
  appendTargetId = null;
  const target = recordings.find((item) => item.id === targetId);
  if (!target) {
    showMessage("Devam edilecek kayıt bulunamadı. Yeni kayıt kaydedilemedi.", true);
    return;
  }

  try {
    const mergedBlob = new Blob([target.blob, blob], { type: target.blob?.type || blob.type || "audio/webm" });
    target.blob = mergedBlob;
    target.duration = formatTimer(parseTimer(target.duration) + seconds);
    target.updatedAt = new Date().toISOString();
    target.fileName = target.fileName || `miray-recording-${formatDateForFile(new Date(target.createdAt))}.webm`;
    await saveToIndexedDB(RECORDINGS_STORE, target);
    const url = objectUrls.get(`recording:${target.id}`);
    if (url) URL.revokeObjectURL(url);
    objectUrls.delete(`recording:${target.id}`);
    await loadFromIndexedDB();
    updateAppendButton();
    setActiveScreen("list");
    renderRecordingsList();
    showMessage("Yeni kayıt parçası son kaydın üzerine eklendi.");
  } catch (error) {
    console.error(error);
    showMessage(describeStorageError(error), true);
  }
}

function updateAppendButton() {
  appendRecordBtn.disabled = !recordings.length || mediaRecorder?.state === "recording";
  appendRecordBtn.textContent = recordings.length ? `Üzerine devam et: ${recordings[0].name}` : "Son kaydın üzerine devam et";
}

async function removeRecording(recordingId) {
  if (!confirm("Bu REC kaydı Çöp Kutusu'na taşınsın mı?")) return;
  const recording = recordings.find((item) => item.id === recordingId);
  if (!recording) return;
  recording.deletedAt = new Date().toISOString();
  await saveToIndexedDB(RECORDINGS_STORE, recording);
  const url = objectUrls.get(`recording:${recordingId}`);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(`recording:${recordingId}`);
  await loadFromIndexedDB();
  renderCurrentCategory();
  if (activeScreen === "list") renderRecordingsList();
  updateAppendButton();
  showMessage("REC kaydı Çöp Kutusu'na taşındı.");
}

function moveSongToTrash(songId) {
  if (!confirm("Bu şarkı Çöp Kutusu'na taşınsın mı?")) return;
  deletedSongs[songId] = new Date().toISOString();
  delete savedSongs[songId];
  writeJsonStorage(STORAGE_KEYS.deletedSongs, deletedSongs);
  writeJsonStorage(STORAGE_KEYS.savedSongs, savedSongs);
  renderCurrentCategory();
  showMessage("Şarkı Çöp Kutusu'na taşındı.");
}

async function movePhoneMusicToTrash(itemId) {
  if (!confirm("Bu telefon müziği Çöp Kutusu'na taşınsın mı?")) return;
  const item = phoneMusic.find((music) => music.id === itemId);
  if (!item) return;
  item.deletedAt = new Date().toISOString();
  await saveToIndexedDB(PHONE_MUSIC_STORE, item);
  const url = objectUrls.get(`phone:${itemId}`);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(`phone:${itemId}`);
  await loadFromIndexedDB();
  renderCurrentCategory();
  showMessage("Telefon müziği Çöp Kutusu'na taşındı.");
}

async function restoreFromTrash(itemId, itemType) {
  if (itemType === "song") {
    delete deletedSongs[itemId];
    writeJsonStorage(STORAGE_KEYS.deletedSongs, deletedSongs);
  } else if (itemType === "recording") {
    const recording = deletedRecordings.find((item) => item.id === itemId);
    if (!recording) return;
    recording.deletedAt = null;
    await saveToIndexedDB(RECORDINGS_STORE, recording);
    await loadFromIndexedDB();
    updateAppendButton();
  } else if (itemType === "phone") {
    const item = deletedPhoneMusic.find((music) => music.id === itemId);
    if (!item) return;
    item.deletedAt = null;
    await saveToIndexedDB(PHONE_MUSIC_STORE, item);
    await loadFromIndexedDB();
  }
  renderCurrentCategory();
  renderRecordingsList();
  showMessage("Çöp Kutusu'ndan geri alındı.");
}

async function permanentlyDeleteFromTrash(itemId, itemType) {
  if (!confirm("Kalıcı olarak silinsin mi? Bu işlem geri alınamaz.")) return;
  if (itemType === "song") {
    delete deletedSongs[itemId];
    delete stars[starKey(itemId, "song")];
    delete hearts[heartKey(itemId, "song")];
    delete savedSongs[itemId];
  } else if (itemType === "recording") {
    await deleteFromStore(RECORDINGS_STORE, itemId);
    delete stars[starKey(itemId, "recording")];
    delete hearts[heartKey(itemId, "recording")];
    notes = notes.filter((note) => !(note.itemId === itemId && note.itemType === "recording"));
    const url = objectUrls.get(`recording:${itemId}`);
    if (url) URL.revokeObjectURL(url);
    objectUrls.delete(`recording:${itemId}`);
    await loadFromIndexedDB();
  } else if (itemType === "phone") {
    await deleteFromStore(PHONE_MUSIC_STORE, itemId);
    delete stars[starKey(itemId, "phone")];
    delete hearts[heartKey(itemId, "phone")];
    notes = notes.filter((note) => !(note.itemId === itemId && note.itemType === "phone"));
    const url = objectUrls.get(`phone:${itemId}`);
    if (url) URL.revokeObjectURL(url);
    objectUrls.delete(`phone:${itemId}`);
    await loadFromIndexedDB();
  }
  writeJsonStorage(STORAGE_KEYS.deletedSongs, deletedSongs);
  writeJsonStorage(STORAGE_KEYS.stars, stars);
  writeJsonStorage(STORAGE_KEYS.hearts, hearts);
  writeJsonStorage(STORAGE_KEYS.savedSongs, savedSongs);
  writeJsonStorage(STORAGE_KEYS.notes, notes);
  renderCurrentCategory();
  renderRecordingsList();
  showMessage("Kalıcı olarak silindi.");
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

function addToPlaylist(itemId, itemType) {
  showMessage("Çalma listesine ekleme sonraki sürümde genişletilecek. Şimdilik yıldız veya kaydet seçeneklerini kullanabilirsin.");
}

async function shareRecording(recordingId) {
  const recording = recordings.find((item) => item.id === recordingId);
  if (!recording) return;
  const file = new File([recording.blob], recording.fileName, { type: recording.blob.type || "audio/webm" });
  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ title: recording.name, text: "Miray Recorder kaydı", files: [file] });
      showMessage("Paylaşım ekranı açıldı.");
      return;
    } catch (error) {
      if (error?.name !== "AbortError") console.error(error);
    }
  }
  showMessage("Paylaşım desteklenmiyor. İndirme başlatılıyor.");
  await downloadRecording(recording);
}

async function createRecordingsZip(recordingItems) {
  const encoder = new TextEncoder();
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;

  for (const [index, recording] of recordingItems.entries()) {
    const extension = recording.fileName?.split(".").pop() || "webm";
    const safeName = `${String(index + 1).padStart(2, "0")}-${sanitizeFileName(recording.name || recording.fileName)}.${extension}`;
    const fileNameBytes = encoder.encode(safeName);
    const fileBytes = new Uint8Array(await recording.blob.arrayBuffer());
    const checksum = crc32(fileBytes);
    const { time, date } = dosDateTime(recording.updatedAt || recording.createdAt);

    const local = zipHeader(30 + fileNameBytes.length);
    writeUint32(local.view, 0, 0x04034b50);
    writeUint16(local.view, 4, 20);
    writeUint16(local.view, 6, 0x0800);
    writeUint16(local.view, 8, 0);
    writeUint16(local.view, 10, time);
    writeUint16(local.view, 12, date);
    writeUint32(local.view, 14, checksum);
    writeUint32(local.view, 18, fileBytes.length);
    writeUint32(local.view, 22, fileBytes.length);
    writeUint16(local.view, 26, fileNameBytes.length);
    writeUint16(local.view, 28, 0);
    local.bytes.set(fileNameBytes, 30);

    chunks.push(local.bytes, fileBytes);

    const central = zipHeader(46 + fileNameBytes.length);
    writeUint32(central.view, 0, 0x02014b50);
    writeUint16(central.view, 4, 20);
    writeUint16(central.view, 6, 20);
    writeUint16(central.view, 8, 0x0800);
    writeUint16(central.view, 10, 0);
    writeUint16(central.view, 12, time);
    writeUint16(central.view, 14, date);
    writeUint32(central.view, 16, checksum);
    writeUint32(central.view, 20, fileBytes.length);
    writeUint32(central.view, 24, fileBytes.length);
    writeUint16(central.view, 28, fileNameBytes.length);
    writeUint16(central.view, 30, 0);
    writeUint16(central.view, 32, 0);
    writeUint16(central.view, 34, 0);
    writeUint16(central.view, 36, 0);
    writeUint32(central.view, 38, 0);
    writeUint32(central.view, 42, offset);
    central.bytes.set(fileNameBytes, 46);
    centralDirectory.push(central.bytes);

    offset += local.bytes.length + fileBytes.length;
  }

  const centralOffset = offset;
  const centralSize = centralDirectory.reduce((total, item) => total + item.length, 0);
  const end = zipHeader(22);
  writeUint32(end.view, 0, 0x06054b50);
  writeUint16(end.view, 4, 0);
  writeUint16(end.view, 6, 0);
  writeUint16(end.view, 8, recordingItems.length);
  writeUint16(end.view, 10, recordingItems.length);
  writeUint32(end.view, 12, centralSize);
  writeUint32(end.view, 16, centralOffset);
  writeUint16(end.view, 20, 0);

  return new Blob([...chunks, ...centralDirectory, end.bytes], { type: "application/zip" });
}

async function exportAllRecordingsZip() {
  if (!recordings.length) {
    showMessage("ZIP oluşturmak için önce kayıt al.", true);
    return;
  }

  try {
    showMessage("ZIP dosyası hazırlanıyor...");
    const zipName = `miray-recordings-${formatDateForFile(new Date())}.zip`;
    const zipBlob = await createRecordingsZip(recordings);
    const zipFile = new File([zipBlob], zipName, { type: "application/zip" });
    preparedZipArchive = { blob: zipBlob, file: zipFile, name: zipName };
    openZipExportModal(recordings.length, zipBlob.size);
    showMessage("ZIP hazır. Paylaş veya indir.");
  } catch (error) {
    console.error(error);
    showMessage("ZIP oluşturulamadı. Kayıt boyutları çok büyük olabilir.", true);
  }
}

function openZipExportModal(recordingCount, zipSize) {
  zipExportInfo.textContent = `${recordingCount} kayıt tek ZIP dosyası yapıldı (${formatBytes(zipSize)}).`;
  const canShareZip = Boolean(navigator.canShare?.({ files: [preparedZipArchive.file] }) && navigator.share);
  shareZipBtn.disabled = !canShareZip;
  shareZipBtn.textContent = canShareZip ? "Paylaş" : "Paylaşım yok";
  zipExportBackdrop.hidden = false;
  zipExportModal.hidden = false;
}

function closeZipExportModal() {
  zipExportBackdrop.hidden = true;
  zipExportModal.hidden = true;
}

async function sharePreparedZip() {
  if (!preparedZipArchive) return;
  if (!(navigator.canShare?.({ files: [preparedZipArchive.file] }) && navigator.share)) {
    showMessage("Bu tarayıcı ZIP paylaşımını desteklemiyor. İndir seçeneğini kullan.", true);
    return;
  }
  try {
    await navigator.share({
      title: "Miray REC kayıtları",
      text: "Miray Player Recorder ZIP arşivi",
      files: [preparedZipArchive.file],
    });
    showMessage("ZIP paylaşım ekranı açıldı.");
    closeZipExportModal();
  } catch (error) {
    if (error?.name === "AbortError") {
      showMessage("ZIP paylaşımı iptal edildi.");
      return;
    }
    console.error(error);
    showMessage("ZIP paylaşımı açılamadı. Telefona indir seçeneğini kullan.", true);
  }
}

function downloadPreparedZip() {
  if (!preparedZipArchive) return;
  const url = URL.createObjectURL(preparedZipArchive.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = preparedZipArchive.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  closeZipExportModal();
  showMessage("ZIP indirme olarak başlatıldı.");
}

function showRecordingDetails(recordingId) {
  const recording = recordings.find((item) => item.id === recordingId);
  if (!recording) return;
  alert([
    `Ad: ${recording.name}`,
    `Tarih: ${formatDisplayDate(recording.createdAt)}`,
    `Süre: ${recording.duration || "00:00"}`,
    `Format: ${recording.blob?.type || "audio/webm"}`,
    `Boyut: ${formatBytes(recording.blob?.size || 0)}`,
    `ID: ${recording.id}`,
  ].join("\n"));
}

playPauseBtn.addEventListener("click", () => {
  if (audioPlayer.paused) playAudio();
  else pauseAudio();
});

speedDownBtn.addEventListener("click", () => stepPlaybackRate(-1));
speedUpBtn.addEventListener("click", () => stepPlaybackRate(1));

audioPlayer.addEventListener("loadedmetadata", () => {
  durationLabel.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener("timeupdate", () => {
  if (!audioPlayer.duration) return;
  progress.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  currentTimeLabel.textContent = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener("ended", playNextItem);
audioPlayer.addEventListener("ratechange", () => {
  if (Math.abs(audioPlayer.playbackRate - playbackRate) > 0.01) {
    updatePlaybackRate(audioPlayer.playbackRate);
  }
});
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

bottomNav.querySelectorAll("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => setActiveScreen(button.dataset.nav));
});

listBackBtn.addEventListener("click", () => setActiveScreen("player"));

toggleListSearchBtn.addEventListener("click", () => {
  recordingSearchInput.hidden = !recordingSearchInput.hidden;
  if (!recordingSearchInput.hidden) recordingSearchInput.focus();
});

recordingSearchInput.addEventListener("input", (event) => {
  recordingSearchTerm = event.target.value;
  renderRecordingsList();
});

sortMenuBtn.addEventListener("click", () => {
  sortPanel.hidden = !sortPanel.hidden;
});

exportZipBtn.addEventListener("click", exportAllRecordingsZip);

sortPanel.querySelectorAll("[data-sort]").forEach((button) => {
  button.addEventListener("click", () => {
    recordingSort = button.dataset.sort;
    sortPanel.hidden = true;
    renderRecordingsList();
  });
});

selectionModeBtn.addEventListener("click", () => {
  selectionMode = !selectionMode;
  selectedRecordings.clear();
  bulkActions.hidden = !selectionMode;
  selectionModeBtn.classList.toggle("active", selectionMode);
  renderRecordingsList();
});

bulkStarBtn.addEventListener("click", () => {
  selectedRecordings.forEach((id) => {
    stars[starKey(id, "recording")] = true;
  });
  writeJsonStorage(STORAGE_KEYS.stars, stars);
  renderRecordingsList();
  showMessage("Seçili kayıtlar yıldızlandı.");
});

bulkDeleteBtn.addEventListener("click", async () => {
  if (!selectedRecordings.size || !confirm("Seçili kayıtlar Çöp Kutusu'na taşınsın mı?")) return;
  for (const id of selectedRecordings) {
    const recording = recordings.find((item) => item.id === id);
    if (recording) {
      recording.deletedAt = new Date().toISOString();
      await saveToIndexedDB(RECORDINGS_STORE, recording);
    }
  }
  selectedRecordings.clear();
  await loadFromIndexedDB();
  renderRecordingsList();
  renderCurrentCategory();
  updateAppendButton();
  showMessage("Seçili kayıtlar Çöp Kutusu'na taşındı.");
});

bulkDownloadBtn.addEventListener("click", () => {
  exportAllRecordingsZip();
});

sheetBackdrop.addEventListener("click", closeRecordingMenu);

recordingMenu.querySelectorAll("[data-menu-action]").forEach((button) => {
  button.addEventListener("click", async () => {
    const action = button.dataset.menuAction;
    const recording = getActiveMenuRecording();
    if (!recording) return;
    closeRecordingMenu();

    if (action === "listen") {
      await playItem(normalizeRecording(recording), [normalizeRecording(recording)]);
      setActiveScreen("player");
    } else if (action === "rename") {
      const newName = prompt("Kayıt adı:", recording.name || "");
      if (newName !== null) await renameRecording(recording.id, newName.trim());
    } else if (action === "playlist") {
      addToPlaylist(recording.id, "recording");
    } else if (action === "star") {
      toggleStar(recording.id, "recording");
    } else if (action === "heart") {
      toggleHeart(recording.id, "recording");
    } else if (action === "note") {
      addNote(recording.id, "recording");
    } else if (action === "edit") {
      showMessage("İçeriği düzenle / kırpma özelliği sonraki sürümde eklenecek.");
    } else if (action === "download") {
      await downloadRecording(recording);
    } else if (action === "share") {
      await shareRecording(recording.id);
    } else if (action === "delete") {
      await removeRecording(recording.id);
    } else if (action === "details") {
      showRecordingDetails(recording.id);
    }
  });
});

recordBtn.addEventListener("click", () => {
  if (mediaRecorder?.state === "recording") stopRecording();
  else startRecording();
});
stopBtn.addEventListener("click", stopRecording);
appendRecordBtn.addEventListener("click", startAppendRecording);

saveRecordingModal.querySelectorAll("[data-save-mark]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!pendingRecordingSave) return;
    const mark = button.dataset.saveMark;
    pendingRecordingSave[mark] = !pendingRecordingSave[mark];
    button.classList.toggle("active", pendingRecordingSave[mark]);
    if (mark === "star") button.innerHTML = `${pendingRecordingSave.star ? "★" : "☆"}<span>Yıldız</span>`;
    if (mark === "heart") button.innerHTML = `${pendingRecordingSave.heart ? "♥" : "♡"}<span>Kalp</span>`;
    if (mark === "saved") button.innerHTML = `✓<span>Sakla</span>`;
  });
});

confirmSaveRecordingBtn.addEventListener("click", savePendingRecording);

recordingNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") savePendingRecording();
});

saveRecordingBackdrop.addEventListener("click", () => {
  recordingNameInput.focus();
  showMessage("Kaydı korumak için Kaydet'e dokun.", false);
});

shareZipBtn.addEventListener("click", sharePreparedZip);
downloadZipBtn.addEventListener("click", downloadPreparedZip);
closeZipModalBtn.addEventListener("click", closeZipExportModal);
zipExportBackdrop.addEventListener("click", closeZipExportModal);

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
  updatePlaybackRate(1);
  selectedRecordingMimeType = "MediaRecorder" in window ? getSupportedRecordingMimeType() || "audio/webm" : "audio/webm";
  recordFormat.textContent = getFormatLabel(selectedRecordingMimeType);
  stars = readJsonStorage(STORAGE_KEYS.stars, {});
  hearts = readJsonStorage(STORAGE_KEYS.hearts, {});
  savedSongs = readJsonStorage(STORAGE_KEYS.savedSongs, {});
  deletedSongs = readJsonStorage(STORAGE_KEYS.deletedSongs, {});
  notes = readJsonStorage(STORAGE_KEYS.notes, []);
  setQueue(songs.map(normalizeSong), songs[0]?.id);
  updateNowPlaying(currentQueue[0]);
  renderTrackList();
  renderCategories();

  try {
    db = await openDb();
    await loadFromIndexedDB();
    updateAppendButton();
  } catch (error) {
    console.error(error);
    showMessage("IndexedDB açılamadı. REC ve telefon müzikleri kalıcı saklanamayabilir.", true);
  }

  setActiveCategory("all");
  renderRecordingsList();
  renderNotesScreen();
  updateAppendButton();
  setActiveScreen("player");
}

init();
