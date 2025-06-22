import { createStore, get, set, del, keys } from 'idb-keyval';

const store = createStore('easydaddy', 'profiles');

export interface Profile {
  id: string;
  data: any;
}

export async function listProfiles(): Promise<Profile[]> {
  const allKeys = await keys(store);
  const profiles: Profile[] = [];
  for (const id of allKeys) {
    const data = await get(id as string, store);
    profiles.push({ id: id as string, data });
  }
  return profiles;
}

export async function getProfile(id: string): Promise<any | undefined> {
  return get(id, store);
}

export async function saveProfile(id: string, data: any): Promise<void> {
  await set(id, data, store);
}

export async function deleteProfile(id: string): Promise<void> {
  await del(id, store);
}

export async function getActiveProfileId(): Promise<string | undefined> {
  return (await get('activeProfileId', store)) as string | undefined;
}

export async function setActiveProfileId(id: string): Promise<void> {
  await set('activeProfileId', id, store);
}
