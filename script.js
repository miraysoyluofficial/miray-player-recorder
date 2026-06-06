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
//   title: "Şarkı Adı",
//   artist: "Sanatçı Adı",
//   src: "music/sarki-dosyasi.mp3",
//   cover: "covers/kapak-gorseli.jpg",
// }
// ============================================================
const songs = [
  {
    title: "Demo Song",
    artist: "Miray Soylu",
    src: "music/demo.mp3",
    cover: "covers/demo.svg",
  },
  {
    title: "Miray Night",
    artist: "Miray Soylu",
    src: "music/miray-night.mp3",
    cover: "covers/miray-night.svg",
  },
];

const DB_NAME = "miray-player-recorder";
const DB_VERSION = 1;
const STORE_NAME = "recordings";

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
const recordingsList = document.querySelector("#recordingsList");
const recordingCount = document.querySelector("#recordingCount");
const installStatus = document.querySelector("#installStatus");

let currentSongIndex = 0;
let db;
let mediaRecorder;
let mediaStream;
let recordingChunks = [];
let recordingStartedAt = 0;
let timerInterval;
let activePlayback;
let activePlaybackUrl;
let hasTriedToPlay = false;

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function formatDateForFile(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `-${pad(date.getHours())}-${pad(date.getMinutes())}`;
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
  if (isError) console.error(text);
}

function describeRecordingError(error) {
  if (!window.isSecureContext) {
    return "Mikrofon için HTTPS veya localhost üzerinden açman gerekir.";
  }

  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    return "Mikrofon izni reddedildi. Tarayıcı izinlerinden mikrofonu açıp tekrar dene.";
  }

  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
    return "Mikrofon bulunamadı. Telefonda veya tarayıcıda mikrofon erişimini kontrol et.";
  }

  if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
    return "Mikrofon şu anda başka bir uygulama tarafından kullanılıyor olabilir.";
  }

  return "Mikrofon izni alınamadı veya kayıt başlatılamadı.";
}

function describePlaybackError(error) {
  if (error?.name === "NotAllowedError") {
    return "Tarayıcı sesi otomatik başlatmayı engelledi. Play tuşuna tekrar dokun.";
  }

  if (error?.name === "NotSupportedError") {
    return "Bu MP3 dosyası tarayıcı tarafından desteklenmiyor.";
  }

  if (error?.name === "AbortError") {
    return "Şarkı başlatılırken işlem kesildi. Tekrar dene.";
  }

  return "Şarkı çalınamadı. MP3 dosyasının /music klasöründe olduğundan emin ol.";
}

function loadSong(index) {
  const song = songs[index];
  currentSongIndex = index;
  pauseAudio();
  audioPlayer.src = song.src;
  coverArt.src = song.cover;
  trackTitle.textContent = song.title;
  trackArtist.textContent = song.artist;
  progress.value = 0;
  currentTimeLabel.textContent = "0:00";
  durationLabel.textContent = "0:00";
  renderTrackList();
}

function renderTrackList() {
  trackList.innerHTML = "";
  songs.forEach((song, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `track-item${index === currentSongIndex ? " active" : ""}`;
    item.innerHTML = `
      <img class="mini-cover" src="${song.cover}" alt="" />
      <span>
        <span class="track-name">${song.title}</span>
        <span class="track-artist">${song.artist}</span>
      </span>
    `;
    item.addEventListener("click", () => {
      loadSong(index);
      playAudio();
    });
    trackList.appendChild(item);
  });
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

function playNextSong() {
  const wasPlaying = !audioPlayer.paused;
  loadSong((currentSongIndex + 1) % songs.length);
  if (wasPlaying) playAudio();
}

function playPreviousSong() {
  const wasPlaying = !audioPlayer.paused;
  loadSong((currentSongIndex - 1 + songs.length) % songs.length);
  if (wasPlaying) playAudio();
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction(storeMode = "readonly") {
  return db.transaction(STORE_NAME, storeMode).objectStore(STORE_NAME);
}

function getAllRecordings() {
  return new Promise((resolve, reject) => {
    const request = transaction().getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
  });
}

function saveRecording(recording) {
  return new Promise((resolve, reject) => {
    const request = transaction("readwrite").put(recording);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function deleteRecording(id) {
  return new Promise((resolve, reject) => {
    const request = transaction("readwrite").delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function renderRecordings() {
  const recordings = await getAllRecordings();
  recordingCount.textContent = recordings.length;
  recordingsList.innerHTML = "";

  if (!recordings.length) {
    recordingsList.innerHTML = '<p class="empty-state">Henüz kayıt yok.</p>';
    return;
  }

  recordings.forEach((recording) => {
    const item = document.createElement("article");
    item.className = "recording-item";
    const date = new Date(recording.createdAt).toLocaleString("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    item.innerHTML = `
      <div>
        <p class="recording-name">${recording.fileName}</p>
        <p class="recording-date">${date}</p>
      </div>
      <div class="recording-actions">
        <button type="button" class="listen">Dinle</button>
        <button type="button" class="download">Telefona indir</button>
        <button type="button" class="delete" aria-label="Kaydı sil">Sil</button>
      </div>
    `;

    item.querySelector(".listen").addEventListener("click", () => playRecording(recording));
    item.querySelector(".download").addEventListener("click", () => downloadRecording(recording));
    item.querySelector(".delete").addEventListener("click", async () => {
      await deleteRecording(recording.id);
      if (activePlayback) activePlayback.pause();
      if (activePlaybackUrl) URL.revokeObjectURL(activePlaybackUrl);
      activePlaybackUrl = null;
      await renderRecordings();
      showMessage("Kayıt silindi.");
    });

    recordingsList.appendChild(item);
  });
}

function playRecording(recording) {
  if (activePlayback) activePlayback.pause();
  if (activePlaybackUrl) URL.revokeObjectURL(activePlaybackUrl);
  const url = URL.createObjectURL(recording.blob);
  activePlaybackUrl = url;
  activePlayback = new Audio(url);
  activePlayback.onended = () => {
    URL.revokeObjectURL(url);
    activePlaybackUrl = null;
  };
  activePlayback.play().catch((error) => {
    console.error(error);
    showMessage("Kayıt çalınamadı.", true);
  });
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

function updateRecordTimer() {
  const elapsed = Math.floor((Date.now() - recordingStartedAt) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const seconds = Math.floor(elapsed % 60).toString().padStart(2, "0");
  recordTimer.textContent = `${minutes}:${seconds}`;
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
    const createdAt = Date.now();
    const fileName = `miray-recording-${formatDateForFile(new Date(createdAt))}.webm`;
    const blob = new Blob(recordingChunks, { type: "audio/webm" });
    await saveRecording({
      id: crypto.randomUUID(),
      fileName,
      createdAt,
      blob,
    });
    await renderRecordings();
    showMessage("Kayıt arşive eklendi.");
  } catch (error) {
    console.error(error);
    showMessage("Kayıt IndexedDB içine kaydedilemedi.", true);
  }
}

playPauseBtn.addEventListener("click", () => {
  if (audioPlayer.paused) playAudio();
  else pauseAudio();
});

prevBtn.addEventListener("click", playPreviousSong);
nextBtn.addEventListener("click", playNextSong);

audioPlayer.addEventListener("loadedmetadata", () => {
  durationLabel.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener("timeupdate", () => {
  if (!audioPlayer.duration) return;
  progress.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
  currentTimeLabel.textContent = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener("ended", playNextSong);
audioPlayer.addEventListener("error", () => {
  if (hasTriedToPlay) {
    showMessage("MP3 dosyası bulunamadı veya açılamadı. README içindeki ekleme adımlarını kontrol et.", true);
  }
});

progress.addEventListener("input", () => {
  if (!audioPlayer.duration) return;
  audioPlayer.currentTime = (progress.value / 100) * audioPlayer.duration;
});

volume.addEventListener("input", () => {
  audioPlayer.volume = volume.value;
});

recordBtn.addEventListener("click", startRecording);
stopBtn.addEventListener("click", stopRecording);

window.addEventListener("beforeunload", () => {
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
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
  loadSong(0);
  try {
    db = await openDb();
    await renderRecordings();
  } catch (error) {
    console.error(error);
    showMessage("IndexedDB açılamadı. Kayıt arşivi çalışmayabilir.", true);
  }
}

init();
