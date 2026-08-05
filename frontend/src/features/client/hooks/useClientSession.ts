import { useState } from 'react';

import type { Table } from '../services/menuApi';
import type { ClientSessionState } from '../clientTypes';

export function useClientSession() {
  const [table, setTable] = useState<Table | null>(null);
  const [sessionState, setSessionState] = useState<ClientSessionState>('loading');
  const [guestCount, setGuestCount] = useState(2);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  return {
    table,
    setTable,
    sessionState,
    setSessionState,
    guestCount,
    setGuestCount,
    isCreatingSession,
    setIsCreatingSession,
  };
}
