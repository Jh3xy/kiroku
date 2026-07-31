
// Kiroku Utility functions & variables

/** Prefer English title, fall back to romaji (native is detail-page only). */
export function getTitle(title) {
  return title.english || title.romaji;
}

/** averageScore is 0–100 on AniList — convert to a 0–10 display score. null → "N/A". */
export function formatScore(averageScore) {
  return averageScore == null ? "N/A" : (averageScore / 10).toFixed(1);
}

/** episodes is null for shows that haven't finished airing/being counted. */
export function formatEpisodes(episodes) {
  if (episodes == null) return "Ongoing";
  return `${episodes} episode${episodes === 1 ? "" : "s"}`;
}

/** description(asHtml:false) is plain text but can carry stray whitespace/newlines. */
export function cleanDescription(description) {
  return description ? description.replace(/\s+/g, " ").trim() : "";
}

/** Pick one random item from a list — used so the hero isn't always the same title on reload. */
export function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Only request fields we actually plan to use. AniList query cost scales with fields requested, not just result
 * count — so requesting only what we need is important for performance.
 */
export const SEARCH_QUERY = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        color
      }
      description(asHtml: false)
      averageScore
      episodes
      genres
      format
      status
      trailer {
        id
        site
        thumbnail
      }
    }
  }
}
`;


// Same field selection as SEARCH_QUERY, but sorted by trending instead of filtered by a search term. This is what powers the landing/browse grid so the page has content before the user ever types anything.
export const BROWSE_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(type: ANIME, sort: TRENDING_DESC) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
        color
      }
      description(asHtml: false)
      averageScore
      episodes
      genres
      format
      status
      trailer {
        id
        site
        thumbnail
      }
    }
  }
}
`;

