
// Stylesheets
import "../style/font.css";
import "../style/variables.css";
import "../style/style.css";

import {
  getTrendingAnime,
  searchAnime,
  getAnimeDetails,
  getAiringAnime,
  getTopRatedAnime,
  getSeasonalAnime,
} from "./api.js";
import { renderHero, renderGrid, renderModalShell, renderModalDetails, renderModalErrorState } from "./render.js";
import { pickRandom, getCurrentSeason } from "./utils.js";
import { getList, hasItem, toggleItem } from "./storage.js";

const FAVORITES_KEY = "favorites";

console.log("[script]: loaded");

// DOM Elements
const footerYear = document.getElementById("footer-year");
if (footerYear) footerYear.textContent = new Date().getFullYear();

const hero = document.getElementById("hero");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const userMenuTrigger = document.getElementById("user-menu-trigger");
const userMenuDropdown = document.getElementById("user-menu-dropdown");
const themeToggleButton = document.querySelector('[data-action="toggle-theme"]');
const modalOverlay = document.getElementById("modal-overlay");
const pillToggle = document.querySelector(".pill-toggle");
const favCountEl = document.getElementById("fav-count");

// Search/Favorites-tab results
const browseSection = document.getElementById("browse-section");
const browseTitle = document.getElementById("browse-title");
const browseCount = document.getElementById("browse-count");
const emptyState = document.getElementById("empty-state");
const grid = document.getElementById("grid");

// Homepage rows
const favoritesRow = document.getElementById("favorites-row");
const favoritesRowTrack = document.getElementById("favorites-row-track");
const favoritesRowCount = document.getElementById("favorites-row-count");

const trendingRow = document.getElementById("trending-row");
const trendingRowTrack = document.getElementById("trending-row-track");
const trendingRowCount = document.getElementById("trending-row-count");

const airingRow = document.getElementById("airing-row");
const airingRowTrack = document.getElementById("airing-row-track");
const airingRowCount = document.getElementById("airing-row-count");

const topRatedRow = document.getElementById("top-rated-row");
const topRatedRowTrack = document.getElementById("top-rated-row-track");
const topRatedRowCount = document.getElementById("top-rated-row-count");

const seasonalRow = document.getElementById("seasonal-row");
const seasonalRowTrack = document.getElementById("seasonal-row-track");
const seasonalRowCount = document.getElementById("seasonal-row-count");

/**
 * In-memory cache of every media object seen anywhere 
 * Helps to render the modal's identity fields (title/native/meta/score) instantly instead of waiting for details response from Modals's query
 */
const mediaCache = new Map();

// Skeleton loader captured before the first fetch — reused for Loading States
const heroSkeletonMarkup = hero.innerHTML;
const gridSkeletonMarkup = grid.innerHTML;
const modalSkeletonMarkup = modalOverlay.innerHTML;
const trendingRowSkeletonMarkup = trendingRowTrack.innerHTML;

// Search input debounce and functionality
const SEARCH_DEBOUNCE_MS = 550;
let debounceTimer = null;
let searchController = null;
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark" || savedTheme === "light") {
  document.documentElement.dataset.theme = savedTheme;
}

// "browse" (the homepage rows) or "favorites" (the pill-toggle's full
// saved-titles view, rendered into #browse-section like search results).
let currentView = "browse";

function setActivePill(view) {
  document.querySelectorAll(".pill-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === view);
  });
}

/** Convert Lucide icons — re-run after any DOM injection. */
function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

/** Sync every currently-rendered Save button for `id` — hero's and/or the modal's. */
function updateSaveButtons(id, isSaved) {
  if (Number(hero.dataset.id) === id) {
    hero.querySelector('[data-action="save"]')?.classList.toggle("is-saved", isSaved);
    hero.querySelector('[data-action="save"]').innerHTML = `
      <span class="save-icon">
        <i data-lucide="bookmark"></i>
      </span> Save
    `;
    refreshIcons();
  }
  const modalEl = modalOverlay.querySelector(".modal");
  if (Number(modalEl?.dataset.id) === id) {
    modalEl.querySelector('[data-action="save"]')?.classList.toggle("is-saved", isSaved);
    modalEl.querySelector('[data-action="save"]').innerHTML = `
      <span class="save-icon">
        <i data-lucide="bookmark"></i>
      </span> Save
    `;
    refreshIcons();
  }
}

function updateFavCount(count = getList(FAVORITES_KEY).length) {
  favCountEl.textContent = count;
}

/** Refill the "Favorites" row, or hide it entirely if there's nothing saved. */
function renderFavoritesCarousel(list = getList(FAVORITES_KEY)) {
  if (!list.length) {
    favoritesRow.hidden = true;
    favoritesRowTrack.innerHTML = "";
    return;
  }
  renderGrid(favoritesRowTrack, list);
  favoritesRowCount.textContent = `${list.length} title${list.length === 1 ? "" : "s"}`;
  
  if (browseSection.hidden) {
    favoritesRow.hidden = false;
  }
  refreshIcons();
}

/** Hide every homepage row — used when switching to search or the Favorites tab. */
function hideHomepageSections() {
  hero.hidden = true;
  favoritesRow.hidden = true;
  trendingRow.hidden = true;
  airingRow.hidden = true;
  topRatedRow.hidden = true;
  seasonalRow.hidden = true;
}

/**
 * Homepage: fetches trending anime, picks one random item for the hero,
 * and renders the rest into the "Trending Now" row (a 2-row sliding grid).
 * Reshuffles on every call — random page each time, same reasoning as
 * before: otherwise every visit shows the identical top-30 trending set.
 */
async function loadHomepage() {
  searchController?.abort();
  hero.hidden = false;
  hero.innerHTML = heroSkeletonMarkup;
  trendingRowTrack.innerHTML = trendingRowSkeletonMarkup;
  trendingRow.hidden = false;
  renderFavoritesCarousel();

  // Capped at 12 (≈360th trending entry at perPage 30) so results stay
  // recognizably "trending" rather than drifting into obscure long-tail titles.
  const randomPage = Math.floor(Math.random() * 12) + 1;

  try {
    const { media } = await getTrendingAnime(randomPage, 30);
    media.forEach((item) => mediaCache.set(item.id, item));

    // The view can change while this is in flight — 
    // so don't pull Trending back into view over whatever replaced it.
    if (!browseSection.hidden) return;

    if (!media.length) {
      hero.hidden = true;
      trendingRow.hidden = true;
      return;
    }

    const featured = pickRandom(media);
    renderHero(hero, featured);
    if (hero.querySelector('[data-action="save"]')) {
      hero.querySelector('[data-action="save"]').classList.toggle(
        "is-saved",
        hasItem(FAVORITES_KEY, featured.id),
      );
      hero.querySelector('[data-action="save"]').innerHTML = `
        <span class="save-icon">
          <i data-lucide="bookmark"></i>
        </span> Save
      `;
      refreshIcons();
    }

    const rest = media.filter((item) => item.id !== featured.id);
    const trendingList = rest.length ? rest : media;
    renderGrid(trendingRowTrack, trendingList);
    trendingRowCount.textContent = `${trendingList.length} title${trendingList.length === 1 ? "" : "s"}`;
    trendingRow.hidden = false;
    refreshIcons();
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("[kiroku] failed to load trending:", err);
    hero.hidden = true;
    trendingRow.hidden = true;
  }
}

/**
 * Generic loader for the three curated rows (Airing/Top Rated/Seasonal) —
 * fetch, cache, render into `track`, show/hide `row`. Unlike Trending,
 * these don't need to reshuffle on every visit, so they're loaded once at
 * startup and just shown/hidden as the user navigates.
 */
async function loadHomeRow({ row, track, countEl, fetcher }) {
  try {
    const { media } = await fetcher();
    if (!media.length) {
      row.hidden = true;
      track.innerHTML = "";
      return;
    }
    media.forEach((item) => mediaCache.set(item.id, item));
    renderGrid(track, media);
    countEl.textContent = `${media.length} title${media.length === 1 ? "" : "s"}`;
    row.hidden = false;
    refreshIcons();
  } catch (err) {
    console.error("[kiroku] failed to load a homepage row:", err);
    row.hidden = true;
  }
}

function loadHomeSections() {
  loadHomeRow({
    row: airingRow,
    track: airingRowTrack,
    countEl: airingRowCount,
    fetcher: () => getAiringAnime(1, 15),
  });
  loadHomeRow({
    row: topRatedRow,
    track: topRatedRowTrack,
    countEl: topRatedRowCount,
    fetcher: () => getTopRatedAnime(1, 15),
  });
  const { season, seasonYear } = getCurrentSeason();
  loadHomeRow({
    row: seasonalRow,
    track: seasonalRowTrack,
    countEl: seasonalRowCount,
    fetcher: () => getSeasonalAnime(season, seasonYear, 1, 15),
  });
}

/** Back to the homepage — Trending/hero reshuffle, the other rows just reappear. */
function loadBrowse() {
  searchController?.abort();
  browseSection.hidden = true;
  loadHomepage();
  if (airingRowTrack.children.length) airingRow.hidden = false;
  if (topRatedRowTrack.children.length) topRatedRow.hidden = false;
  if (seasonalRowTrack.children.length) seasonalRow.hidden = false;
}

/** Search results — flat grid, no hero, no rows. */
async function loadSearchResults(query, signal) {
  emptyState.hidden = true;
  emptyState.textContent = "No titles found. Try another search or refresh the page.";
  browseCount.textContent = "";

  try {
    const { media } = await searchAnime(query, 1, 30, signal);
    media.forEach((item) => mediaCache.set(item.id, item));

    if (!media.length) {
      grid.innerHTML = "";
      browseCount.textContent = "0 titles";
      emptyState.hidden = false;
      return;
    }

    renderGrid(grid, media);
    browseCount.textContent = `${media.length} title${media.length === 1 ? "" : "s"}`;
    refreshIcons();
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("[kiroku] failed to load results:", err);
    grid.innerHTML = "";
    browseCount.textContent = "";
    emptyState.textContent = "Something went wrong loading titles. Try again in a moment.";
    emptyState.hidden = false;
  }
}

/** Full Favorites tab — flat grid, sourced from storage instead of a fetch. */
function showFavoritesView() {
  browseSection.hidden = false;
  hideHomepageSections();
  emptyState.hidden = true;
  browseTitle.textContent = "Favorites";

  const list = getList(FAVORITES_KEY);
  if (!list.length) {
    grid.innerHTML = "";
    browseCount.textContent = "0 titles";
    emptyState.textContent = "No favorites yet — tap Save on a title to add it here.";
    emptyState.hidden = false;
    return;
  }

  renderGrid(grid, list);
  browseCount.textContent = `${list.length} title${list.length === 1 ? "" : "s"}`;
  refreshIcons();
}

function switchView(view) {
  if (view === currentView) return;
  currentView = view;
  setActivePill(view);
  searchController?.abort();
  searchInput.value = "";
  if (view === "favorites") {
    showFavoritesView();
  } else {
    loadBrowse();
  }
}

/** Toggle `media`'s saved state everywhere it might currently be visible. */
function toggleFavorite(media) {
  const list = toggleItem(FAVORITES_KEY, media);
  const isSaved = list.some((item) => item.id === media.id);
  updateSaveButtons(media.id, isSaved);
  updateFavCount(list.length);
  if (currentView === "favorites") {
    showFavoritesView();
  } else {
    renderFavoritesCarousel(list);
  }
}

// Initial load
updateFavCount();
loadBrowse();
loadHomeSections();

// Search Functionality
searchForm.addEventListener("submit", (event) => event.preventDefault());

/**
 * Live search, debounced — fires on keystroke. Skeleton feedback is
 * immediate; only the actual network call is delayed.
 */
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  clearTimeout(debounceTimer);

  // Typing implies wanting search results — bail out of the Favorites tab
  // without the full switchView() flow (that would clear the input we're
  // mid-typing into).
  if (currentView !== "browse") {
    currentView = "browse";
    setActivePill("browse");
  }

  if (!query) {
    loadBrowse();
    return;
  }

  browseSection.hidden = false;
  hideHomepageSections();
  grid.innerHTML = gridSkeletonMarkup;
  emptyState.hidden = true;
  browseTitle.textContent = `Results for "${query}"`;
  browseCount.textContent = "";

  debounceTimer = setTimeout(() => {
    searchController?.abort();
    searchController = new AbortController();
    loadSearchResults(query, searchController.signal);
  }, SEARCH_DEBOUNCE_MS);
});

// Browse / Favorites pill toggle
pillToggle.addEventListener("click", (event) => {
  const btn = event.target.closest(".pill-btn");
  if (!btn) return;
  switchView(btn.dataset.view);
});

// User menu dropdown
userMenuTrigger.addEventListener("click", () => {
  const isOpen = userMenuTrigger.getAttribute("aria-expanded") === "true";
  userMenuTrigger.setAttribute("aria-expanded", String(!isOpen));
  userMenuDropdown.hidden = isOpen;
});

themeToggleButton.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme;
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("theme", nextTheme);
});

document.addEventListener("click", (event) => {
  if (!document.getElementById("user-menu").contains(event.target)) {
    userMenuTrigger.setAttribute("aria-expanded", "false");
    userMenuDropdown.hidden = true;
  }
});

// ===== MODAL =====
let modalController = null;
let lastFocusedEl = null;

function closeModal() {
  modalController?.abort();
  modalOverlay.hidden = true;
  modalOverlay.innerHTML = modalSkeletonMarkup;
  document.body.style.overflow = "";
  lastFocusedEl?.focus();
}

async function openModal(id) {
  modalController?.abort();
  modalController = new AbortController();
  const { signal } = modalController;

  lastFocusedEl = document.activeElement;
  document.body.style.overflow = "hidden";
  modalOverlay.hidden = false;

  const cached = mediaCache.get(id);
  if (cached) {
    renderModalShell(modalOverlay, cached);
  } else {
    modalOverlay.innerHTML = modalSkeletonMarkup;
  }
  refreshIcons();
  modalOverlay.querySelector(".modal")?.focus();
  modalOverlay.querySelector('[data-action="save"]')?.classList.toggle(
    "is-saved",
    hasItem(FAVORITES_KEY, id),
  );
  

  try {
    const details = await getAnimeDetails(id, signal);
    if (!cached) {
      renderModalShell(modalOverlay, details);
      // Give favoriting something to store — cache misses only happen for
      // titles no row/search/favorites list ever rendered (e.g. a future deep link).
      mediaCache.set(id, details);
      modalOverlay.querySelector('[data-action="save"]')?.classList.toggle(
        "is-saved",
        hasItem(FAVORITES_KEY, id),
      );
    }
    renderModalDetails(modalOverlay, details);
    refreshIcons();
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("[kiroku] failed to load anime details:", err);
    renderModalErrorState(modalOverlay);
  }
}

// Cards — the whole card opens the modal, including the Play button inside
// it (a click on Play bubbles up to this same handler). Shared across the
// search/favorites grid and every homepage row — same card markup, same behavior.
function bindCardActivation(container) {
  container.addEventListener("click", (event) => {
    const card = event.target.closest(".card");
    if (!card?.dataset.id) return;
    openModal(Number(card.dataset.id));
  });

  container.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".card");
    if (!card?.dataset.id) return;
    event.preventDefault();
    openModal(Number(card.dataset.id));
  });
}

bindCardActivation(grid);
bindCardActivation(favoritesRowTrack);
bindCardActivation(trendingRowTrack);
bindCardActivation(airingRowTrack);
bindCardActivation(topRatedRowTrack);
bindCardActivation(seasonalRowTrack);

// Hero — whole hero opens the modal too (Play button included, since it's
// a real <button> its own Enter/Space already fires a click that bubbles
// here). Save toggles a favorite instead of opening the modal.
hero.addEventListener("click", (event) => {
  const saveBtn = event.target.closest('[data-action="save"]');
  if (saveBtn) {
    const media = mediaCache.get(Number(hero.dataset.id));
    if (media) toggleFavorite(media);
    return;
  }
  if (!hero.dataset.id) return;
  openModal(Number(hero.dataset.id));
});

modalOverlay.addEventListener("click", (event) => {
  if (event.target.closest('[data-action="close-modal"]') || event.target === modalOverlay) {
    closeModal();
    return;
  }
  const saveBtn = event.target.closest('[data-action="save"]');
  if (saveBtn) {
    const modalId = Number(modalOverlay.querySelector(".modal")?.dataset.id);
    const media = mediaCache.get(modalId);
    if (media) toggleFavorite(media);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalOverlay.hidden) closeModal();
});

