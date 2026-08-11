import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as kitchenHistoryService from '../../services/kitchenHistoryService';
import { useKitchenHistory } from '../useKitchenHistory';

vi.mock('../../services/kitchenHistoryService');

const emptyFilterOptions = { items: [], stations: [] };
const emptySummary = { counts: {}, busiest_station: null, peak_hour: null };

function mockDefaults() {
  vi.mocked(kitchenHistoryService.getHistory).mockResolvedValue({ items: [], total_count: 0 });
  vi.mocked(kitchenHistoryService.getHistorySummary).mockResolvedValue(emptySummary);
  vi.mocked(kitchenHistoryService.getHistoryFilterOptions).mockResolvedValue(emptyFilterOptions);
}

describe('useKitchenHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDefaults();
  });

  afterEach(() => {
    cleanup();
  });

  it('fetches filter options, summary, and page 1 of history on mount, defaulting to today', async () => {
    const { result } = renderHook(() => useKitchenHistory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(kitchenHistoryService.getHistoryFilterOptions).toHaveBeenCalledTimes(1);
    expect(kitchenHistoryService.getHistorySummary).toHaveBeenCalledTimes(1);
    expect(kitchenHistoryService.getHistory).toHaveBeenCalledTimes(1);
    expect(kitchenHistoryService.getHistory).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: expect.any(String) }),
      result.current.pageSize,
      0,
    );
  });

  it('changing a filter resets to page 1 and refetches both the list and the summary', async () => {
    const { result } = renderHook(() => useKitchenHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setPage(2);
    });
    await waitFor(() => expect(result.current.page).toBe(2));

    vi.mocked(kitchenHistoryService.getHistory).mockClear();
    vi.mocked(kitchenHistoryService.getHistorySummary).mockClear();

    act(() => {
      result.current.setFilters((current) => ({ ...current, status: 'Served' }));
    });

    await waitFor(() => expect(kitchenHistoryService.getHistory).toHaveBeenCalledTimes(1));
    expect(result.current.page).toBe(1);
    expect(kitchenHistoryService.getHistorySummary).toHaveBeenCalledTimes(1);
    expect(kitchenHistoryService.getHistory).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Served' }),
      result.current.pageSize,
      0,
    );
  });

  it('changing only the page refetches the list but not the summary', async () => {
    const { result } = renderHook(() => useKitchenHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.mocked(kitchenHistoryService.getHistory).mockClear();
    vi.mocked(kitchenHistoryService.getHistorySummary).mockClear();

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => expect(kitchenHistoryService.getHistory).toHaveBeenCalledTimes(1));
    expect(kitchenHistoryService.getHistorySummary).not.toHaveBeenCalled();
    expect(kitchenHistoryService.getHistory).toHaveBeenCalledWith(
      expect.anything(),
      result.current.pageSize,
      result.current.pageSize, // offset for page 2 = 1 * pageSize
    );
  });
});
