import { beforeEach, describe, expect, it } from 'vitest';
import { loadInteractionMode, saveInteractionMode } from '../interactionModePreferences';

describe('interactionModePreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to buttons when nothing is stored', () => {
    expect(loadInteractionMode()).toBe('buttons');
  });

  it('round-trips a saved value', () => {
    saveInteractionMode('drag');
    expect(loadInteractionMode()).toBe('drag');
  });

  it('falls back to buttons when the stored value is corrupted', () => {
    localStorage.setItem('kitchen.interactionMode', '{not valid json');
    expect(loadInteractionMode()).toBe('buttons');
  });

  it('falls back to buttons when the stored value is not a known mode', () => {
    localStorage.setItem('kitchen.interactionMode', JSON.stringify('sideways'));
    expect(loadInteractionMode()).toBe('buttons');
  });
});
