
/**
 * GraphQl Query templates for the manga Page and sections across the app.
 * Things to Note:
 * - Queries file — search/browse/ongoing/top-rated share one lean field set, modal query is separate and pulls staff, startDate/endDate, chapters/volumes, source
 * - Nothing episode/trailer/studio-related carried over. Left "Popular This Season" out entirely since manga has no clean seasonal equivalent — that's still open until you see what real sort/filter options make sense.
 */


const MANGA_LIST_FIELDS = `
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
  bannerImage
  description(asHtml: false)
  averageScore
  chapters
  volumes
  genres
  format
  status
`;

/** Search AniList for manga by title. */
export const MANGA_SEARCH_QUERY = `
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
      ${MANGA_LIST_FIELDS}
    }
  }
}
`;

/** Trending manga — powers the manga landing/browse grid before any search. */
export const MANGA_BROWSE_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(type: MANGA, sort: TRENDING_DESC) {
      ${MANGA_LIST_FIELDS}
    }
  }
}
`;

/**
 * Currently publishing, ranked by popularity — manga's equivalent of
 * AIRING_QUERY. status: RELEASING is the real signal here (manga's status
 * enum also has HIATUS/CANCELLED/NOT_YET_RELEASED — worth deciding later
 * whether any of those get their own row or just a status pill on cards).
 */
export const MANGA_ONGOING_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(type: MANGA, status: RELEASING, sort: POPULARITY_DESC) {
      ${MANGA_LIST_FIELDS}
    }
  }
}
`;

/** All-time top rated manga by AniList's average score. */
export const MANGA_TOP_RATED_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(type: MANGA, sort: SCORE_DESC) {
      ${MANGA_LIST_FIELDS}
    }
  }
}
`;

/**
 * Full detail for the modal — fired on card open, same as MODAL_QUERY on
 * the anime side. Notable differences from the anime version:
 *  - staff replaces studios (name + role, so "Story & Art" style credit
 *    can be built once we see how messy/clean the real role strings are)
 *  - chapters/volumes replace episodes
 *  - no trailer, no externalLinks — manga has neither on AniList
 *  - startDate/endDate included in case it's useful for a status/fact row
 *    once source data is checked (season/seasonYear don't map to manga)
 */
export const MANGA_MODAL_QUERY = `
query ($id: Int) {
  Media(id: $id, type: MANGA) {
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
    chapters
    volumes
    genres
    format
    status
    source
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
    staff(sort: RELEVANCE) {
      edges {
        role
        node {
          id
          name {
            full
          }
        }
      }
    }
  }
}
`;
 

