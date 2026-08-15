import { playlist } from "./songs.js";

const elements = {
  title: document.getElementById("title"),
  artist: document.getElementById("artist"),
  play: document.getElementById("play"),
  previous: document.getElementById("previous"),
  next: document.getElementById("next"),
  repeat: document.getElementById("repeat"),
  playlist: document.getElementById("playlist"),
  playlistCount: document.getElementById("playlist-count"),
  playlistFilters: document.querySelector(".playlist-filters"),
  progress: document.getElementById("progress"),
  currentTime: document.getElementById("current-time"),
  duration: document.getElementById("duration")
};

let player = null;
let currentIndex = 0;
let progressTimer = null;
let isLoading = true;
let isRepeatEnabled = false;
let activeCategory = "all";

const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6V6Z" /></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6h3v12H7V6Zm7 0h3v12h-3V6Z" /></svg>';

function setPlayButton(isPlaying) {
  elements.play.innerHTML = isPlaying ? pauseIcon : playIcon;
  elements.play.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
}

function setLoading(loading) {
  isLoading = loading;
  elements.play.disabled = loading;
}

function updateClock() {
  const now = new Date();

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  document.getElementById("clock").textContent =
    `${hours}:${minutes}:${seconds} ${ampm}`;
}

updateClock();
setInterval(updateClock, 1000);

function createPlayer() {
  if (player || !window.YT || !window.YT.Player) {
    return;
  }

  player = new YT.Player("youtube-player", {
    width: "200",
    height: "200",
    videoId: playlist[currentIndex].videoId,
    playerVars: {
      controls: 0,
      playsinline: 1,
      rel: 0
    },
    events: {
      onReady: handleReady,
      onStateChange: handleStateChange,
      onError: handleError
    }
  });
}

window.onYouTubeIframeAPIReady = createPlayer;

if (window.YT && window.YT.Player) {
  createPlayer();
}

function handleReady() {
  updateTrack();
  updateDuration();
  setLoading(false);
}

function renderPlaylist() {
  const songs = document.createDocumentFragment();

  playlist
    .map((song, index) => ({ song, index }))
    .filter(({ song }) =>
      activeCategory === "all" || song.categories.includes(activeCategory)
    )
    .forEach(({ song, index }) => {
    const item = document.createElement("button");
    const details = document.createElement("span");
    const title = document.createElement("span");
    const artist = document.createElement("span");

    item.type = "button";
    item.className = "playlist-item";
    item.dataset.index = index;
    item.setAttribute("aria-label", `Play ${song.title} by ${song.artist}`);

    details.className = "playlist-song";
    title.className = "playlist-title";
    title.textContent = song.title;
    artist.className = "playlist-artist";
    artist.textContent = song.artist;

    details.append(title, artist);
    item.append(details);
    songs.append(item);
    });

  elements.playlist.replaceChildren(songs);
  const visibleCount = activeCategory === "all"
    ? playlist.length
    : playlist.filter(song => song.categories.includes(activeCategory)).length;

  elements.playlistCount.textContent = `${visibleCount} tracks`;
  updatePlaylistSelection();
}

function updatePlaylistSelection() {
  elements.playlist.querySelectorAll(".playlist-item").forEach(item => {
    const isCurrent = Number(item.dataset.index) === currentIndex;

    item.classList.toggle("is-current", isCurrent);
    item.setAttribute("aria-current", isCurrent ? "true" : "false");
  });
}

function handleStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    setLoading(false);

    setPlayButton(true);

    startProgress();
    updateDuration();
  }

  if (event.data === YT.PlayerState.PAUSED) {
    setLoading(false);

    setPlayButton(false);

    stopProgress();
  }

  if (event.data === YT.PlayerState.BUFFERING) {
    setLoading(true);
  }

  if (event.data === YT.PlayerState.CUED) {
    setLoading(false);

    setPlayButton(false);

    updateDuration();
  }

  if (event.data === YT.PlayerState.ENDED) {
    stopProgress();
    if (isRepeatEnabled) {
      player.seekTo(0, true);
      player.playVideo();
    } else {
      nextSong();
    }
  }
}

function handleError(event) {
  console.error("YouTube error:", event.data);

  setLoading(true);
  stopProgress();
}

function togglePlay() {
  if (!player || isLoading) {
    return;
  }

  const state = player.getPlayerState();

  if (state === YT.PlayerState.PLAYING) {
    player.pauseVideo();
  } else {
    setLoading(true);
    player.playVideo();
  }
}

function nextSong() {
  if (!player || isLoading) {
    return;
  }

  setLoading(true);
  stopProgress();

  currentIndex =
    (currentIndex + 1) % playlist.length;

  loadSong(true);
}

function previousSong() {
  if (!player || isLoading) {
    return;
  }

  if (player.getCurrentTime() > 3) {
    player.seekTo(0, true);
    return;
  }

  setLoading(true);
  stopProgress();

  currentIndex =
    (currentIndex - 1 + playlist.length) %
    playlist.length;

  loadSong(true);
}

function toggleRepeat() {
  isRepeatEnabled = !isRepeatEnabled;

  elements.repeat.classList.toggle("is-active", isRepeatEnabled);
  elements.repeat.setAttribute("aria-pressed", String(isRepeatEnabled));
  elements.repeat.setAttribute(
    "aria-label",
    isRepeatEnabled ? "Repeat current track on" : "Repeat current track off"
  );
  elements.repeat.title = isRepeatEnabled
    ? "Repeat current track on"
    : "Repeat current track off";
}

function loadSong(autoplay) {
  updateTrack();

  elements.progress.value = 0;
  elements.currentTime.textContent = "0:00";
  elements.duration.textContent = "0:00";

  if (autoplay) {
    player.loadVideoById(
      playlist[currentIndex].videoId
    );
  } else {
    player.cueVideoById(
      playlist[currentIndex].videoId
    );
  }
}

function selectSong(index) {
  if (index < 0 || index >= playlist.length) {
    return;
  }

  currentIndex = index;
  updateTrack();
  updatePlaylistSelection();

  if (!player) {
    return;
  }

  setLoading(true);
  stopProgress();
  loadSong(true);
}

function updateTrack() {
  const song = playlist[currentIndex];

  elements.title.textContent = song.title;
  elements.artist.textContent = song.artist;
  updatePlaylistSelection();
}

function updateDuration() {
  if (!player) {
    return;
  }

  const duration = player.getDuration();

  if (duration) {
    elements.duration.textContent =
      formatTime(duration);
  }
}

function startProgress() {
  stopProgress();

  progressTimer = setInterval(
    updateProgress,
    250
  );
}

function stopProgress() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function updateProgress() {
  if (!player) {
    return;
  }

  const current =
    player.getCurrentTime();

  const duration =
    player.getDuration();

  if (!duration) {
    return;
  }

  elements.progress.value =
    (current / duration) * 100;

  elements.currentTime.textContent =
    formatTime(current);

  elements.duration.textContent =
    formatTime(duration);
}

function seek() {
  if (!player || isLoading) {
    return;
  }

  const duration =
    player.getDuration();

  if (!duration) {
    return;
  }

  const newTime =
    (Number(elements.progress.value) / 100) *
    duration;

  player.seekTo(
    newTime,
    true
  );
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    Math.floor(seconds % 60);

  return `${minutes}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

elements.play.addEventListener(
  "click",
  togglePlay
);

elements.previous.addEventListener(
  "click",
  previousSong
);

elements.next.addEventListener(
  "click",
  nextSong
);

elements.repeat.addEventListener(
  "click",
  toggleRepeat
);

elements.playlistFilters.addEventListener("click", event => {
  const filter = event.target.closest(".playlist-filter");

  if (!filter) {
    return;
  }

  activeCategory = filter.dataset.category;
  elements.playlistFilters.querySelectorAll(".playlist-filter").forEach(item => {
    const isActive = item === filter;

    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", String(isActive));
  });
  renderPlaylist();
});

elements.playlist.addEventListener("click", event => {
  const item = event.target.closest(".playlist-item");

  if (item) {
    selectSong(Number(item.dataset.index));
  }
});

elements.progress.addEventListener(
  "input",
  seek
);

document.addEventListener(
  "keydown",
  event => {
    if (event.code === "Space") {
      event.preventDefault();
      togglePlay();
    }

    if (event.code === "ArrowLeft") {
      previousSong();
    }

    if (event.code === "ArrowRight") {
      nextSong();
    }

  }
);

renderPlaylist();
