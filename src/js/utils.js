
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
 * Fields only the modal needs — deliberately kept out of SEARCH_QUERY/
 * BROWSE_QUERY so every browse/search request doesn't pay for data most
 * cards never display. Fired once, on demand, when a card is opened.
 * Note description(asHtml: true) here vs asHtml:false above — the modal
 * renders this via innerHTML so bold/italic markup survives; that's also
 * why a cache hit on the lean list objects can't skip this fetch, even
 * though title/score/genres are already available from there.
 */
export const MODAL_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    coverImage {
      large
    }
    bannerImage
    description(asHtml: true)
    averageScore
    episodes
    genres
    format
    status
    season
    seasonYear
    duration
    source
    studios(isMain: true) {
      nodes {
        name
      }
    }
    trailer {
      id
      site
      thumbnail
    }
    externalLinks {
      site
      url
      type
      icon
    }
  }
}
`;

/** Main studio(s), comma-joined. null if AniList has none on record. */
export function formatStudio(studios) {
  const names = studios?.nodes?.map((n) => n.name) || [];
  return names.length ? names.join(", ") : null;
}

/** AniList's season enum is SCREAMING_CASE — "Fall 2023", or null if either half is missing. */
export function formatSeason(season, seasonYear) {
  if (!season || !seasonYear) return null;
  const label = season.charAt(0) + season.slice(1).toLowerCase();
  return `${label} ${seasonYear}`;
}

/** "LIGHT_NOVEL" -> "Light Novel". null if AniList has no source on record. */
export function formatSource(source) {
  if (!source) return null;
  return source
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** duration is minutes-per-episode. null if not on record. */
export function formatDuration(duration) {
  return duration == null ? null : `${duration} min`;
}

/** externalLinks mixes streaming sites and wiki/info links — only STREAMING belongs in "Where to Watch". */
export function getStreamingLinks(externalLinks) {
  if (!externalLinks) return [];
  return externalLinks
    .filter((link) => link.type === "STREAMING")
    .map((link) => ({ url: link.url, name: link.site, icon: link.icon }));
}

/** Only ever embed a trailer we can actually play inline — AniList's "trailer" can point at Dailymotion etc. */
export function getYoutubeEmbedUrl(trailer) {
  return trailer && trailer.site === "youtube"
    ? `https://www.youtube.com/embed/${trailer.id}`
    : null;
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
