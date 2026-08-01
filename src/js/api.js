
// ====================  KIROKU — API DATA MODULE (Graph QL)  ====================
// AniList GraphQL API client. No UI logic here — just fetch + shape.
// Docs: https://docs.anilist.co/guide/introduction

import { SEARCH_QUERY, BROWSE_QUERY, MODAL_QUERY, AIRING_QUERY, TOP_RATED_QUERY, SEASONAL_QUERY } from "./utils.js";

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';


/**
 * Shared request helper — both queries hit the same endpoint with the
 * same error handling, no reason to duplicate that logic.
 */
async function anilistRequest(query, variables, signal, dataKey = "Page") {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
    signal,
  });

  // Check both for GraphQL-level errors, and HTTP status codes for transport-level failures
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `AniList request failed: ${res.status} ${res.statusText} — ${body}`,
    );
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(
      `AniList GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }

  console.log("AniList request successful:", json.data[dataKey]);
  return json.data[dataKey];

}


/**
 * Search AniList for anime by title.
 * @param {string} search - title/keywords to search
 * @param {number} page - 1-indexed page number
 * @param {number} perPage - results per page (AniList caps this at 50)
 * @returns {Promise<object>} raw AniList response.data.Page
 */
export async function searchAnime(search, page = 1, perPage = 10, signal) {
  return anilistRequest(SEARCH_QUERY, { search, page, perPage }, signal);
}

/**
 * Get currently trending anime — use this for the landing/browse grid
 * so it's populated on page load, before any search happens.
 * @param {number} page - 1-indexed page number
 * @param {number} perPage - results per page (AniList caps this at 50)
 * @returns {Promise<object>} raw AniList response.data.Page
 */
export async function getTrendingAnime(page = 1, perPage = 10) {
  return anilistRequest(BROWSE_QUERY, { page, perPage });
}

/**
 * Fetch full detail for a single anime — fired when a card/modal is opened,
 * never as part of the browse/search grid render. Cancellable via signal
 * the same way search already is, since a fast second click should abort
 * the first in-flight request rather than race it.
 * @param {number} id - AniList media id
 * @returns {Promise<object>} raw AniList response.data.Media
 */
export async function getAnimeDetails(id, signal) {
  return anilistRequest(MODAL_QUERY, { id }, signal, "Media");
}



/**
 * Currently-airing titles ranked by popularity — powers the "Currently
 * Airing" homepage row.
 */
export async function getAiringAnime(page = 1, perPage = 15) {
  return anilistRequest(AIRING_QUERY, { page, perPage });
}

/**
 * All-time top rated by average score — powers the "Top Rated" row.
 */
export async function getTopRatedAnime(page = 1, perPage = 15) {
  return anilistRequest(TOP_RATED_QUERY, { page, perPage });
}

/**
 * Popular titles for a given season/year — powers "Popular This Season".
 * Caller supplies season/seasonYear (see getCurrentSeason() in utils.js)
 * rather than this function assuming "now", so it stays reusable if a
 * season browser ever gets built later.
 */
export async function getSeasonalAnime(season, seasonYear, page = 1, perPage = 15) {
  return anilistRequest(SEASONAL_QUERY, { season, seasonYear, page, perPage });
}

/**
 * Expose to window so you can call these directly for testings
 * window.searchAnime('frieren').then(console.log)
 * window.getTrendingAnime().then(console.log)
 */
window.searchAnime = searchAnime;
window.getTrendingAnime = getTrendingAnime;
window.getAnimeDetails = getAnimeDetails;
window.getAiringAnime = getAiringAnime;
window.getTopRatedAnime = getTopRatedAnime;
window.getSeasonalAnime = getSeasonalAnime;
