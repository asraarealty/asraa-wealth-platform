"use client";

const REAL_ESTATE_DATA_UPDATED_EVENT = "asraa:real-estate-data-updated";
const REAL_ESTATE_DATA_UPDATED_STORAGE_KEY = "asraa:real-estate-data-updated-at";

export function emitRealEstateDataUpdated() {
  if (typeof window === "undefined") return;
  const updateTimestamp = String(Date.now());
  window.dispatchEvent(new Event(REAL_ESTATE_DATA_UPDATED_EVENT));
  try {
    window.localStorage.setItem(REAL_ESTATE_DATA_UPDATED_STORAGE_KEY, updateTimestamp);
  } catch {
    // localStorage may be unavailable; the window event still notifies same-tab listeners.
  }
}

export function subscribeRealEstateDataUpdated(handler: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onEvent = () => handler();
  const onStorage = (event: StorageEvent) => {
    if (event.key === REAL_ESTATE_DATA_UPDATED_STORAGE_KEY) {
      handler();
    }
  };

  window.addEventListener(REAL_ESTATE_DATA_UPDATED_EVENT, onEvent);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(REAL_ESTATE_DATA_UPDATED_EVENT, onEvent);
    window.removeEventListener("storage", onStorage);
  };
}
