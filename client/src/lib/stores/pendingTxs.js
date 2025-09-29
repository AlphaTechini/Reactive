import { writable, derived } from 'svelte/store';

// Simple pending transactions tracker
const _pending = writable([]);

export const pendingTxs = {
  subscribe: _pending.subscribe,
  add(tx) { _pending.update(a => [...a, tx]); },
  remove(hash) { _pending.update(a => a.filter(t => t.hash !== hash)); },
  clear() { _pending.set([]); }
};

export const pendingCount = derived(_pending, $p => $p.length);
