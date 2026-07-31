
/**
 * KIROKU — DOM RENDER MODULE 
 * Turns raw AniList media objects into DOM nodes via the <template>s in index.html. No fetch logic here
 */


import { getTitle, formatScore, formatEpisodes, cleanDescription } from "./utils.js";

const cardTemplate = document.getElementById("card-template");
const heroTemplate = document.getElementById("hero-template");

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
  node.querySelector('[data-field="meta"]').textContent =
    `${media.format} · ${formatEpisodes(media.episodes)} · ${media.genres.join(", ")}`;
  node.querySelector('[data-field="description"]').textContent = cleanDescription(media.description);
  node.querySelector('[data-field="score"]').textContent = formatScore(media.averageScore);

  container.innerHTML = "";
  container.appendChild(node);
}
