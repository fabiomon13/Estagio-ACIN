import type { KitchenInteractionMode } from '../types/interactionMode.types';

const STORAGE_KEY = 'kitchen.interactionMode';
const DEFAULT_MODE: KitchenInteractionMode = 'buttons';

// Type guard
function isKitchenInteractionMode(value: unknown): value is KitchenInteractionMode {
  return value === 'buttons' || value === 'drag';
}

export function loadInteractionMode(): KitchenInteractionMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MODE;

    const parsed: unknown = JSON.parse(raw);

    return isKitchenInteractionMode(parsed) ? parsed : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

export function saveInteractionMode(mode: KitchenInteractionMode): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
}
