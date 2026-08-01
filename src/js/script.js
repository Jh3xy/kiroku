
// Stylesheets
import "../style/font.css";
import "../style/variables.css";
import "../style/style.css";

import { getTrendingAnime, searchAnime, getAnimeDetails } from "./api.js";
import {
  renderHero,
  renderGrid,
  renderModalShell,
  renderModalDetails,
  renderModalErrorState,
} from "./render.js";
import { pickRandom } from "./utils.js";

console.log("[script]: loaded");

const hero = document.getElementById("hero");
const grid = document.getElementById("grid");
const browseTitle = document.getElementById("browse-title");
const browseCount = document.getElementById("browse-count");
const emptyState = document.getElementById("empty-state");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const userMenuTrigger = document.getElementById("user-menu-trigger");
const userMenuDropdown = document.getElementById("user-menu-dropdown");
const themeToggleButton = document.querySelector('[data-action="toggle-theme"]');
const modalOverlay = document.getElementById("modal-overlay");


// Skeleton loader captured before the first fetch — reused for Loading States
const heroSkeletonMarkup = hero.innerHTML;
const gridSkeletonMarkup = grid.innerHTML;
const modalSkeletonMarkup = modalOverlay.innerHTML;

// Search input debounce
const SEARCH_DEBOUNCE_MS = 400;
let debounceTimer = null;
let searchController = null;
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark" || savedTheme === "light") {
  document.documentElement.dataset.theme = savedTheme;
}

/** Convert Lucide icons — re-run after any DOM injection. */
function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

/** Reset hero/grid back to skeleton placeholders — 
 * UX feedback while a fetch is in flight. 
 * */
function showLoadingState({ showHero, label }) {
  emptyState.hidden = true;
  browseTitle.textContent = label;
  browseCount.textContent = "";
  // Inject Card skeleton loaders
  grid.innerHTML = gridSkeletonMarkup;
 
  if (showHero) {
    hero.hidden = false;
    hero.innerHTML = heroSkeletonMarkup;
  } else {
    hero.hidden = true;
  }
}

/**
 * Fetch via `fetcher`, then render results. On browse, one random item
 * becomes the hero and the rest fill the grid — the random pick keeps the
 * hero from looking like static hardcoded data on every reload. On search,
 * the hero is hidden entirely and the grid shows all results, since a
 * "featured" pick doesn't make sense for something the user just searched.
 */
async function loadResults(fetcher, { label, showHero }) {
  emptyState.hidden = true;
  emptyState.textContent = "No titles found. Try another search.";

  try {
    const { media } = await fetcher();

    media.forEach((item) => mediaCache.set(item.id, item));

    if (!media.length) {
      hero.hidden = true;
      grid.innerHTML = "";
      browseCount.textContent = "0 titles";
      emptyState.hidden = false;
      return;
    }

    if (showHero) {
      const featured = pickRandom(media);
      renderHero(hero, featured);
      hero.hidden = false;
      const rest = media.filter((item) => item.id !== featured.id);
      renderGrid(grid, rest.length ? rest : media);
    } else {
      hero.hidden = true;
      renderGrid(grid, media);
    }

    browseTitle.textContent = label;
    browseCount.textContent = `${media.length} title${media.length === 1 ? "" : "s"}`;
    refreshIcons();
  } catch (err) {
    // A newer keystroke superseded this request via AbortController (Search debounce errors)
    if (err.name === "AbortError") return;

    console.error("[kiroku] failed to load results:", err);
    hero.hidden = true;
    grid.innerHTML = "";
    browseCount.textContent = "";
    emptyState.textContent =
      "Something went wrong loading titles. Try again in a moment.";
    emptyState.hidden = false;
  }
}

function loadBrowse() {
  searchController?.abort();
  showLoadingState({ showHero: true, label: "Browse" });
  loadResults(() => getTrendingAnime(1, 30), {
    label: "Browse",
    showHero: true,
  });
}

// Initial load — populate the skeletons with trending anime.
loadBrowse();

// Search Functionality
searchForm.addEventListener("submit", (event) => event.preventDefault());

/**
 * Live search, debounced — fires on keystroke
 * Skeleton feedback is immediate; only the actual network call is delayed.
 */
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  // clear any older timers
  clearTimeout(debounceTimer);
 
  if (!query) {
    loadBrowse();
    return;
  }
 
  showLoadingState({ showHero: false, label: `Results for "${query}"` });
 
  debounceTimer = setTimeout(() => {
    searchController?.abort();
    searchController = new AbortController();
 
    loadResults(
      () => searchAnime(query, 1, 20, searchController.signal),
      { label: `Results for "${query}"`, showHero: false },
    );
  }, SEARCH_DEBOUNCE_MS);
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


// In-memory cache of every media object seen in browse/search — lets a
// click paint the modal instantly instead of waiting on a network call.
const mediaCache = new Map();

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

  try {
    const details = await getAnimeDetails(id, signal);
    if (!cached) renderModalShell(modalOverlay, details);
    renderModalDetails(modalOverlay, details);
    refreshIcons();
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("[kiroku] failed to load anime details:", err);
    renderModalErrorState(modalOverlay);
  }
}

grid.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (!card?.dataset.id) return;
  openModal(Number(card.dataset.id));
});

grid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".card");
  if (!card?.dataset.id) return;
  event.preventDefault();
  openModal(Number(card.dataset.id));
});

modalOverlay.addEventListener("click", (event) => {
  if (event.target.closest('[data-action="close-modal"]') || event.target === modalOverlay) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalOverlay.hidden) closeModal();
});

