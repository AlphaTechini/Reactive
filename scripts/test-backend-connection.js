#!/usr/bin/env node

/**
 * Test Backend Connection Script
 * Tests connectivity to the price service backend
 */

const BACKEND_URL = process.env.VITE_PRICE_API_URL || 'https://reactive-agzd.onrender.com';

async function testConnection() {
  console.log('🔍 Testing backend connection...');
  console.log(`Backend URL: ${BACKEND_URL}`);
  
  // Test ping endpoint
  try {
    console.log('\n📡 Testing ping endpoint...');
    const pingResponse = await fetch(`${BACKEND_URL}/api/ping`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ReactivePortfolio-Test/1.0'
      }
    });
    
    if (pingResponse.ok) {
      const pingData = await pingResponse.json();
      console.log('✅ Ping successful:', pingData);
    } else {
      console.log('❌ Ping failed:', pingResponse.status, pingResponse.statusText);
    }
  } catch (error) {
    console.log('❌ Ping error:', error.message);
  }
  
  // Test health endpoint
  try {
    console.log('\n🏥 Testing health endpoint...');
    const healthResponse = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ReactivePortfolio-Test/1.0'
      }
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check successful:', healthData);
    } else {
      console.log('❌ Health check failed:', healthResponse.status, healthResponse.statusText);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }
  
  // Test prices endpoint
  try {
    console.log('\n💰 Testing prices endpoint...');
    const pricesResponse = await fetch(`${BACKEND_URL}/api/prices`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ReactivePortfolio-Test/1.0'
      }
    });
    
    if (pricesResponse.ok) {
      const pricesData = await pricesResponse.json();
      const tokenCount = Object.keys(pricesData).length;
      console.log(`✅ Prices endpoint successful: ${tokenCount} tokens`);
      
      // Show sample data
      const sampleTokens = Object.entries(pricesData).slice(0, 3);
      console.log('📊 Sample prices:');
      sampleTokens.forEach(([symbol, data]) => {
        console.log(`   ${symbol}: $${data.priceUSD} (${data.priceChangePercent > 0 ? '+' : ''}${data.priceChangePercent}%)`);
      });
    } else {
      console.log('❌ Prices endpoint failed:', pricesResponse.status, pricesResponse.statusText);
    }
  } catch (error) {
    console.log('❌ Prices endpoint error:', error.message);
  }
  
  console.log('\n🏁 Connection test complete');
}

// Run the test
testConnection().catch(console.error);