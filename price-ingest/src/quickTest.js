import { getTokenPriceUSD, getPortfolioValue, getBatchTokenPrices } from './portfolioUtils.js';

console.log('🚀 Testing Portfolio Utils');
console.log('==========================');

// Test 1: Single token price
console.log('\n1. Testing BTC price...');
try {
  const btcPrice = await getTokenPriceUSD('BTC', 1);
  console.log(`✅ BTC: $${btcPrice.priceUSD.toFixed(2)} USD`);
  console.log(`   Value: $${btcPrice.valueUSD.toFixed(2)}`);
} catch (error) {
  console.log(`❌ BTC: ${error.message}`);
}

// Test 2: PEPE price with large amount
console.log('\n2. Testing PEPE price...');
try {
  const pepePrice = await getTokenPriceUSD('PEPE', 1000000);
  console.log(`✅ 1M PEPE: $${pepePrice.valueUSD.toFixed(6)} USD`);
  console.log(`   Unit price: $${pepePrice.priceUSD.toFixed(8)}`);
} catch (error) {
  console.log(`❌ PEPE: ${error.message}`);
}

// Test 3: USDT (should be $1)
// Test 3: USDC (should be ~$1)
console.log('\n3. Testing USDC price...');
try {
  const usdcPrice = await getTokenPriceUSD('USDC', 100);
  console.log(`✅ 100 USDC: $${usdcPrice.valueUSD.toFixed(2)} USD`);
  console.log(`   Unit price: $${usdcPrice.priceUSD.toFixed(2)}`);
} catch (error) {
  console.log(`❌ USDC: ${error.message}`);
}

console.log('\n✅ Test complete!');