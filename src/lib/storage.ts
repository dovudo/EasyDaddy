import { get, set, keys, del, createStore } from 'idb-keyval';

// Per documentation, we should only create ONE store per database.
// All data will be stored in this single key-value store.
const store = createStore('EasyDaddy-DB', 'keyval-store');

// We use prefixes to simulate separate stores.
const PROFILE_PREFIX = 'profile-';
const META_PREFIX = 'meta-';
const ACTIVE_PROFILE_ID_KEY = `${META_PREFIX}active-profile-id`;


/**
 * Ensures the database and store are ready.
 * A benign 'get' operation forces initialization if needed.
 */
export async function initStorage(): Promise<void> {
  try {
    await get('__init', store);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// --- Profile Management ---

export async function listProfiles(): Promise<{ id: string }[]> {
  const allKeys = await keys(store);
  return allKeys
    .filter((k) => typeof k === 'string' && k.startsWith(PROFILE_PREFIX))
    .map((k) => ({ id: (k as string).substring(PROFILE_PREFIX.length) }));
}

export async function getProfile(id: string): Promise<Record<string, any> | null> {
  if (!id) return null;
  return get(`${PROFILE_PREFIX}${id}`, store);
}

export async function saveProfile(id: string, data: Record<string, any>): Promise<void> {
  return set(`${PROFILE_PREFIX}${id}`, data, store);
}

export async function deleteProfile(id: string): Promise<void> {
  return del(`${PROFILE_PREFIX}${id}`, store);
}

// --- Metadata Management ---

export async function getActiveProfileId(): Promise<string | null> {
  const activeId = await get(ACTIVE_PROFILE_ID_KEY, store);
  return typeof activeId === 'string' ? activeId : null;
}

export async function setActiveProfileId(id: string): Promise<void> {
  return set(ACTIVE_PROFILE_ID_KEY, id, store);
}
