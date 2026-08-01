

/**
 * KIROKU — LOCAL PERSISTENCE MODULE
 * Generic keyed-list storage over localStorage. Not favorites-specific —
 * built this way so "recents" (carryover doc, deferred until this existed)
 * can reuse it later with a different key and a `max` cap, instead of a
 * second bespoke localStorage layer.
 */

const PREFIX = "kiroku:";

function read(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    // Corrupt JSON or localStorage unavailable (e.g. private browsing) —
    // fail soft to an empty list rather than throwing.
    return [];
  }
}

function write(key, list) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(list));
  } catch {
    // Storage full or blocked — nothing we can do client-side, silently no-op.
  }
}

/** All stored items for `key`, most-recently-added first. */
export function getList(key) {
  return read(key);
}

export function hasItem(key, id) {
  return read(key).some((item) => item.id === id);
}

/**
 * Add `item` (moves it to the front if it already exists), optionally
 * capped at `max` entries — recents will use the cap, favorites won't.
 */
export function addItem(key, item, { max } = {}) {
  const list = read(key).filter((existing) => existing.id !== item.id);
  list.unshift(item);
  if (max) list.length = Math.min(list.length, max);
  write(key, list);
  return list;
}

export function removeItem(key, id) {
  const list = read(key).filter((item) => item.id !== id);
  write(key, list);
  return list;
}

/** Add if absent, remove if present — what a Save button wants. */
export function toggleItem(key, item, options) {
  return hasItem(key, item.id) ? removeItem(key, item.id) : addItem(key, item, options);
}

