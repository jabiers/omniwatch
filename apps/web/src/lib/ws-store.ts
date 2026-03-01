import { useSyncExternalStore } from 'react';

type WsStatus = 'connected' | 'reconnecting' | 'disconnected';

let status: WsStatus = 'disconnected';
const listeners = new Set<() => void>();

function getSnapshot(): WsStatus {
  return status;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Update the global WebSocket status and notify all subscribers */
export function setWsStatus(next: WsStatus) {
  if (status !== next) {
    status = next;
    listeners.forEach((cb) => cb());
  }
}

/** React hook to read the current WebSocket connection status */
export function useWsStatus(): WsStatus {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'disconnected' as WsStatus);
}
