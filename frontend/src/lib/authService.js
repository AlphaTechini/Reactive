import { get, writable } from 'svelte/store';
import { signer, walletAddress } from './stores/wallet.js';
import { ethers } from 'ethers';

export const authSession = writable({ address: null, signature: null, timestamp: null });

const MESSAGE_PREFIX = 'Reactive Portfolio Auth:';
const EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

function buildMessage(address, timestamp) {
  return `${MESSAGE_PREFIX}\nAddress:${address}\nTimestamp:${timestamp}`;
}

export async function authenticate(force = false) {
  const s = get(authSession);
  const addr = get(walletAddress);
  const sign = get(signer);
  if (!sign || !addr) throw new Error('Wallet not connected');

  const now = Date.now();
  if (!force && s.address === addr && s.timestamp && (now - s.timestamp) < EXPIRY_MS) {
    return s;
  }

  const msg = buildMessage(addr, now);
  const signature = await sign.signMessage(msg);
  const recovered = ethers.verifyMessage(msg, signature);
  if (recovered.toLowerCase() !== addr.toLowerCase()) throw new Error('Signature verification failed');
  const session = { address: addr, signature, timestamp: now };
  authSession.set(session);
  if (typeof window !== 'undefined') localStorage.setItem('reactiveAuthSession', JSON.stringify(session));
  return session;
}

export function loadSession() {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem('reactiveAuthSession');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    authSession.set(parsed);
  } catch {}
}

export function clearSession() {
  authSession.set({ address: null, signature: null, timestamp: null });
  if (typeof window !== 'undefined') localStorage.removeItem('reactiveAuthSession');
}

loadSession();