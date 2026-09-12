import { DEFAULT_PROFILE } from "../data/brand";

const KEY = "dznow.profile.v1";

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE };
  } catch (e) {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile) {
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (e) {}
  return profile;
}
