import { writable, get } from 'svelte/store';
import { ethers } from 'ethers';
import { provider, walletAddress, walletConnected, signer, rpcProvider } from '$lib/stores/wallet.js';
import { PORTFOLIO_MANAGER_ADDRESS, PORTFOLIO_ABI, REACT_TOKEN_ADDRESS, ERC20_MIN_ABI } from '$lib/config/network.js';
import { notify } from '$lib/notify.js';

export const portfolioBalance = writable('0'); // in REACT units (human readable)
export const portfolioLoading = writable(false);
export const portfolioError = writable(null);

let contract = null; let reactToken = null;

function getReadProvider() {
  // prefer interactive provider, otherwise use read-only rpcProvider
  const p = get(provider) || get(rpcProvider);
  return p || null;
}

async function ensureContracts() {
  // allow reading even when wallet not connected (use read-only provider)
  const p = getReadProvider();
  if (!p) return false;
  if (!contract) contract = new ethers.Contract(PORTFOLIO_MANAGER_ADDRESS, PORTFOLIO_ABI, p.getSigner ? await p.getSigner() : p);
  if (!reactToken) reactToken = new ethers.Contract(REACT_TOKEN_ADDRESS, ERC20_MIN_ABI, p.getSigner ? await p.getSigner() : p);
  return true;
}

export async function refreshPortfolioBalance() {
  portfolioLoading.set(true); portfolioError.set(null);
  try {
    const ok = await ensureContracts();
    if (!ok) { portfolioError.set('Wallet not connected'); portfolioLoading.set(false); return; }
    const addr = get(walletAddress);
    const bal = await contract.balanceOf(addr);
    // assume REACT has 18 decimals
    portfolioBalance.set(ethers.formatEther(bal));
  } catch (e) {
    console.error('Failed to load portfolio balance', e);
    portfolioError.set(e.message || 'Failed to load');
  } finally { portfolioLoading.set(false); }
}

export async function depositReact(amountStr) {
  try {
    const ok = await ensureContracts();
    if (!ok) throw new Error('Wallet not connected');
    const s = get(signer);
    if (!s) throw new Error('No signer for transaction');
    const amount = ethers.parseUnits(amountStr, 18);
    // Check allowance
    const owner = get(walletAddress);
    const allowance = await reactToken.allowance(owner, PORTFOLIO_MANAGER_ADDRESS);
    if (allowance < amount) {
      const txA = await reactToken.connect(s).approve(PORTFOLIO_MANAGER_ADDRESS, amount);
      notify.info('Approving REACT spend...'); await txA.wait();
    }
    const tx = await contract.connect(s).deposit(amount);
    notify.info('Deposit submitted...'); await tx.wait();
    notify.success('Deposit confirmed');
    await refreshPortfolioBalance();
    return tx;
  } catch (e) { notify.error(e.message || 'Deposit failed'); throw e; }
}

export async function withdrawReact(amountStr) {
  try {
    const ok = await ensureContracts(); if (!ok) throw new Error('Wallet not connected');
    const s = get(signer); if (!s) throw new Error('No signer for transaction');
    const amount = ethers.parseUnits(amountStr, 18);
    const tx = await contract.connect(s).withdraw(amount);
    notify.info('Withdrawal submitted...'); await tx.wait();
    notify.success('Withdrawal confirmed');
    await refreshPortfolioBalance();
    return tx;
  } catch (e) { notify.error(e.message || 'Withdraw failed'); throw e; }
}

// Auto refresh when wallet connects
walletConnected.subscribe(v => { if (v) refreshPortfolioBalance(); else { portfolioBalance.set('0'); }});
