import { writable, get } from 'svelte/store';
import { walletAddress } from './wallet.js';

export const portfolios = writable([]);
export const currentPortfolio = writable(null);
export const portfoliosLoading = writable(false);
export const portfoliosError = writable(null);

const API_BASE = `${import.meta.env.VITE_PRICE_API_URL || 'http://localhost:3001'}/api`;

export async function fetchPortfolios() {
  const address = get(walletAddress);
  if (!address) {
    portfolios.set([]);
    return;
  }
  
  portfoliosLoading.set(true);
  portfoliosError.set(null);
  
  try {
    const response = await fetch(`${API_BASE}/portfolios/${address}`);
    if (response.ok) {
      const data = await response.json();
      portfolios.set(data.portfolios || []);
    } else {
      throw new Error('Failed to fetch portfolios');
    }
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    portfoliosError.set(error.message);
    portfolios.set([]);
  } finally {
    portfoliosLoading.set(false);
  }
}

export async function createPortfolio(portfolioData) {
  const address = get(walletAddress);
  if (!address) {
    throw new Error('Wallet not connected');
  }
  
  portfoliosLoading.set(true);
  portfoliosError.set(null);
  
  try {
    // Add wallet address and blockchain metadata to portfolio data
    const enrichedData = {
      ...portfolioData,
      walletAddress: address,
      onChain: false,
      transactionHash: null,
      blockNumber: null,
      createdAt: new Date().toISOString()
    };
    
    const response = await fetch(`${API_BASE}/portfolios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: address,
        portfolio: enrichedData
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to create portfolio');
    }
    
    const data = await response.json();
    
    // Refresh portfolios list
    await fetchPortfolios();
    
    return data.portfolio;
  } catch (error) {
    console.error('Error creating portfolio:', error);
    portfoliosError.set(error.message);
    throw error;
  } finally {
    portfoliosLoading.set(false);
  }
}

export async function getPortfolio(portfolioId) {
  const address = get(walletAddress);
  if (!address) {
    throw new Error('Wallet not connected');
  }
  
  portfoliosLoading.set(true);
  portfoliosError.set(null);
  
  try {
    const response = await fetch(`${API_BASE}/portfolios/${address}/${portfolioId}`);
    if (!response.ok) {
      throw new Error('Portfolio not found');
    }
    
    const data = await response.json();
    currentPortfolio.set(data.portfolio);
    return data.portfolio;
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    portfoliosError.set(error.message);
    throw error;
  } finally {
    portfoliosLoading.set(false);
  }
}

export async function updatePortfolio(portfolioId, updates) {
  const address = get(walletAddress);
  if (!address) {
    throw new Error('Wallet not connected');
  }
  
  portfoliosLoading.set(true);
  portfoliosError.set(null);
  
  try {
    const response = await fetch(`${API_BASE}/portfolios/${address}/${portfolioId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update portfolio');
    }
    
    const data = await response.json();
    
    // Update current portfolio if it's the one being updated
    const current = get(currentPortfolio);
    if (current && current.id === portfolioId) {
      currentPortfolio.set(data.portfolio);
    }
    
    // Refresh portfolios list
    await fetchPortfolios();
    
    return data.portfolio;
  } catch (error) {
    console.error('Error updating portfolio:', error);
    portfoliosError.set(error.message);
    throw error;
  } finally {
    portfoliosLoading.set(false);
  }
}
