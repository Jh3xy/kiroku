
/**
 * KIROKU — DOM RENDER MODULE 
 * Turns raw AniList media objects into DOM nodes via the <template>s in index.html. No fetch logic here
 */


import {
  getTitle,
  formatScore,
  formatEpisodes,
  cleanDescription,
  formatStudio,
  formatSeason,
  formatSource,
  formatDuration,
  getStreamingLinks,
  getYoutubeEmbedUrl,
} from "./utils.js";

const cardTemplate = document.getElementById("card-template");
const heroTemplate = document.getElementById("hero-template");
const modalTemplate = document.getElementById("modal-template");
const watchLinkTemplate = document.getElementById("modal-watch-link-template");

/**
 * Build a single card node from a media object. Does not attach it —
 * caller decides where it goes.
 */
export function buildCard(media) {
  // Clone the template and fiil in with media data
  const node = cardTemplate.content.cloneNode(true);

  const card = node.querySelector(".card");
  const art = node.querySelector(".card-art");
  const scoreWrap = node.querySelector(".card-score");
  const scoreEl = node.querySelector('[data-field="score"]');
  const genreEl = node.querySelector('[data-field="genre"]');
  const titleEl = node.querySelector('[data-field="title"]');

  card.dataset.id = media.id;
  art.style.backgroundImage = `url(${media.coverImage.large})`;
  titleEl.textContent = getTitle(media.title);
  genreEl.textContent = media.genres[0] || media.format;
  scoreEl.textContent = formatScore(media.averageScore);
  scoreWrap.hidden = media.averageScore == null;

  return node;
}

/** Replace the grid's contents with one card per item in mediaList. */
export function renderGrid(container, mediaList) {
  container.innerHTML = "";
  const fragment = document.createDocumentFragment();
  mediaList.forEach((media) => fragment.appendChild(buildCard(media)));
  container.appendChild(fragment);
}

/** Replace the hero section's contents with a single featured media item. */
export function renderHero(container, media) {
  const node = heroTemplate.content.cloneNode(true);

  const art = node.querySelector(".hero-art");
  art.style.backgroundImage = `url(${media.coverImage.large})`;
  node.querySelector('[data-field="title"]').textContent = getTitle(media.title);
  node.querySelector('[data-field="native"]').textContent = media.title.native || "";
  node.querySelector('[data-field="meta"]').textContent =
    `${media.format} · ${formatEpisodes(media.episodes)} · ${media.genres.join(", ")}`;
  node.querySelector('[data-field="description"]').textContent = cleanDescription(media.description);
  node.querySelector('[data-field="score"]').textContent = formatScore(media.averageScore);

  container.innerHTML = "";
  container.appendChild(node);
}

/**
 * Paint the identity fields — title, native, meta, score. Works whether
 * `media` came from the in-memory list cache (fast path) or the modal's
 * own detail fetch (cache-miss path), since both share this shape.
 * Marks the fields only the detail fetch can supply (banner, description)
 * as loading — those never come from the cache, even on a hit, because
 * the cached description is plain text and the modal needs the HTML
 * variant for bold/italic markup to survive via innerHTML.
 */
export function renderModalShell(container, media) {
  const node = modalTemplate.content.cloneNode(true);

  const modalEl = node.querySelector(".modal");
  modalEl.dataset.id = media.id;

  node.querySelector('[data-field="title"]').textContent = getTitle(media.title);
  node.querySelector('[data-field="native"]').textContent = media.title.native || "";
  node.querySelector('[data-field="meta"]').textContent =
    `${media.format} · ${formatEpisodes(media.episodes)} · ${media.genres.join(", ")}`;

  const scoreEl = node.querySelector('[data-field="score"]');
  scoreEl.textContent = formatScore(media.averageScore);
  node.querySelector('[data-section="score"]').hidden = media.averageScore == null;

  node.querySelector(".modal-banner-art").classList.add("skel");
  node.querySelector(".modal-description").classList.add("skel", "skel-line");

  container.innerHTML = "";
  container.appendChild(node);
}

/**
 * Fill in everything only the detail fetch has. Assumes renderModalShell
 * already ran on this same container — queries the real DOM, doesn't
 * re-clone the template.
 */
export function renderModalDetails(container, media) {
  const banner = container.querySelector(".modal-banner-art");
  banner.classList.remove("skel");
  banner.style.backgroundImage = `url(${media.bannerImage || media.coverImage.large})`;

  const descEl = container.querySelector(".modal-description");
  descEl.classList.remove("skel", "skel-line");
  descEl.innerHTML = cleanDescription(media.description);

  setFact(container, "studio", formatStudio(media.studios));
  setFact(container, "season", formatSeason(media.season, media.seasonYear));
  setFact(container, "source", formatSource(media.source));
  setFact(container, "duration", formatDuration(media.duration));

  const trailerSection = container.querySelector('[data-section="trailer"]');
  const trailerUrl = getYoutubeEmbedUrl(media.trailer);
  if (trailerUrl) {
    container.querySelector('[data-field="trailer"]').innerHTML =
      `<iframe src="${trailerUrl}" title="Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
    trailerSection.hidden = false;
  } else {
    trailerSection.hidden = true;
  }

  const watchSection = container.querySelector('[data-section="watch"]');
  const watchList = container.querySelector('[data-field="watch-links"]');
  const links = getStreamingLinks(media.externalLinks);
  watchList.innerHTML = "";
  if (links.length) {
    const fragment = document.createDocumentFragment();
    links.forEach((link) => fragment.appendChild(buildWatchPill(link)));
    watchList.appendChild(fragment);
    watchSection.hidden = false;
  } else {
    watchSection.hidden = true;
  }
}

/** One fact row — hidden entirely if this title doesn't have that field on record. */
function setFact(container, key, value) {
  const row = container.querySelector(`[data-fact="${key}"]`);
  if (value == null) {
    row.hidden = true;
    return;
  }
  row.querySelector("[data-field]").textContent = value;
  row.hidden = false;
}

function buildWatchPill(link) {
  const node = watchLinkTemplate.content.cloneNode(true);
  node.querySelector(".watch-pill").href = link.url;
  const icon = node.querySelector('[data-field="watch-icon"]');
  if (link.icon) {
    icon.src = link.icon;
  } else {
    icon.remove();
  }
  node.querySelector('[data-field="watch-name"]').textContent = link.name;
  return node;
}

/** Shown if the detail fetch fails outright — modal stays openable/closable, just empty. */
export function renderModalErrorState(container) {
  container.innerHTML = `
    <div class="modal">
      <button type="button" class="modal-close" data-action="close-modal" aria-label="Close">
        <i data-lucide="x"></i>
      </button>
      <div class="modal-body">
        <p class="modal-error">Couldn't load details for this title. Try again in a moment.</p>
      </div>
    </div>
  `;
}
