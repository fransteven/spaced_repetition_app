'use client';

import { useSyncExternalStore } from 'react';

import { getSyncState, subscribe, type SyncState } from '@/lib/offline/sync';

const SERVER_STATE: SyncState = { pending: 0, syncing: false, lastResult: null };

function getServerState(): SyncState {
  return SERVER_STATE;
}

/** Outbox size, whether a flush is running, and the last flush result (src/lib/offline/sync.ts). */
export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribe, getSyncState, getServerState);
}
