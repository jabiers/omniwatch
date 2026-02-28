/** Queue RPC handlers */
import {
  getQueueStats, getDeadLetters, retryDeadLetter,
  cleanupOldMessages, resetStaleProcessing,
} from '../message-queue.js';

export const handleQueueRPC: Record<string, (params: Record<string, unknown>) => unknown> = {
  stats: () => getQueueStats(),

  deadLetters: (params) => {
    const limit = (params.limit as number) || 50;
    return getDeadLetters(limit);
  },

  retryDeadLetter: (params) => {
    const id = params.id as number;
    if (!id) throw new Error('id is required');
    return { success: retryDeadLetter(id) };
  },

  cleanup: (params) => {
    const days = (params.days as number) || 7;
    return { deleted: cleanupOldMessages(days) };
  },

  resetStale: () => {
    return { reset: resetStaleProcessing() };
  },
};
