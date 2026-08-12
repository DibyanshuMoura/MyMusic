import { playlist } from "./songs.js";

const elements = {
  title: document.getElementById("title"),
  artist: document.getElementById("artist"),
  play: document.getElementById("play"),
  previous: document.getElementById("previous"),
  next: document.getElementById("next"),
  progress: document.getElementById("progress"),
  currentTime: document.getElementById("current-time"),
  duration: document.getElementById("duration")
};

let player = null;
let currentIndex = 0;
let progressTimer = null;
let isLoading = true;

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

function handleStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    setLoading(false);

    elements.play.textContent = "Ⅱ";
    elements.play.setAttribute("aria-label", "Pause");

    startProgress();
    updateDuration();
  }

  if (event.data === YT.PlayerState.PAUSED) {
    setLoading(false);

    elements.play.textContent = "▶";
    elements.play.setAttribute("aria-label", "Play");

    stopProgress();
  }

  if (event.data === YT.PlayerState.BUFFERING) {
    setLoading(true);
  }

  if (event.data === YT.PlayerState.CUED) {
    setLoading(false);

    elements.play.textContent = "▶";
    elements.play.setAttribute("aria-label", "Play");

    updateDuration();
  }

  if (event.data === YT.PlayerState.ENDED) {
    stopProgress();
    nextSong();
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

function updateTrack() {
  const song = playlist[currentIndex];

  elements.title.textContent = song.title;
  elements.artist.textContent = song.artist;
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
