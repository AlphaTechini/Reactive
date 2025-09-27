// Centralized notification helper wrapping svelte-hot-french-toast
// Provides consistent styling, durations, and simple dedupe logic.
import toast from 'svelte-hot-french-toast';

// Basic global config overrides (optional)
// You can adjust default duration or styling classes here if needed.
const DEFAULT_SUCCESS_DURATION = 3500;
const DEFAULT_ERROR_DURATION = 6000;
const DEFAULT_INFO_DURATION = 4000;

// Track last message to avoid noisy duplicates in rapid succession
let lastMsg = '';
let lastTime = 0;
const DEDUPE_WINDOW_MS = 1200; // ignore identical messages within this window

function shouldShow(message) {
  const now = Date.now();
  if (message === lastMsg && now - lastTime < DEDUPE_WINDOW_MS) return false;
  lastMsg = message;
  lastTime = now;
  return true;
}

export const notify = {
  success(message, opts = {}) {
    if (!shouldShow(message)) return;
    return toast.success(message, { duration: DEFAULT_SUCCESS_DURATION, ...opts });
  },
  error(message, opts = {}) {
    if (!shouldShow(message)) return;
    return toast.error(message, { duration: DEFAULT_ERROR_DURATION, style: 'background:#7f1d1d;color:#fff', ...opts });
  },
  info(message, opts = {}) {
    if (!shouldShow(message)) return;
    return toast(message, { duration: DEFAULT_INFO_DURATION, icon: 'ℹ️', ...opts });
  },
  // Promise helper: notify.promise(promise, { loading, success, error })
  promise(promise, messages, opts = {}) {
    return toast.promise(promise, {
      loading: messages.loading || 'Processing...',
      success: () => messages.success || 'Completed',
      error: (err) => messages.error || (err?.message ? err.message.slice(0, 160) : 'Failed'),
    }, opts);
  }
};

export default notify;
