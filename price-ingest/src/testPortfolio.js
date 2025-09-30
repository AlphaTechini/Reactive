import { getTokenPriceUSD, getPortfolioValue, getBatchTokenPrices } from './portfolioUtils.js';

/**
 * Test individual token price conversion
 */
async function testTokenPriceConversion() {
  console.log('🧪 Testing Token Price Conversion...\n');
  
  const testTokens = ['BTC', 'ETH', 'PEPE'];
  
  for (const token of testTokens) {
    try {
      console.log(`Fetching price for ${token}...`);
      const result = await getTokenPriceUSD(token, 1);
      console.log(`✅ ${token}: $${result.priceUSD.toFixed(6)} USD`);
      console.log(`   Amount: ${result.amount}, Value: $${result.valueUSD.toFixed(2)}\n`);
    } catch (error) {
      console.log(`❌ ${token}: ${error.message}\n`);
    }
    
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Test batch price fetching
 */
async function testBatchPrices() {
  console.log('🧪 Testing Batch Price Fetching...\n');
  
  const tokens = ['BTC', 'ETH', 'UNI', 'PEPE'];
  
  try {
    console.log('Fetching batch prices...');
    const results = await getBatchTokenPrices(tokens);
    
    console.log('✅ Batch Results:');
    results.forEach(result => {
      if (result.error) {
        console.log(`❌ ${result.token}: ${result.error}`);
      } else {
        console.log(`✅ ${result.token}: $${result.priceUSD.toFixed(6)} USD`);
      }
    });
    console.log('');
  } catch (error) {
    console.log(`❌ Batch fetch failed: ${error.message}\n`);
  }
}

/**
 * Test portfolio valuation (with mock balances)
 */
async function testPortfolioValue() {
  console.log('🧪 Testing Portfolio Valuation (Mock Data)...\n');
  
  // Using a sample wallet address (this will use mock balances)
  const sampleWallet = '0x742d35Cc6634C0532925a3b8D162Cc5D8d0503C5';
  
  try {
    console.log(`Calculating portfolio for wallet: ${sampleWallet}`);
    const portfolio = await getPortfolioValue(sampleWallet);
    
    console.log('✅ Portfolio Results:');
    console.log(`Total Value: $${portfolio.totalValueUSD.toFixed(2)} USD\n`);
    
    console.log('Holdings:');
    portfolio.tokens.forEach(token => {
      if (token.error) {
        console.log(`❌ ${token.token}: ${token.error}`);
      } else {
        console.log(`✅ ${token.token}: ${token.balance} tokens × $${token.priceUSD.toFixed(6)} = $${token.valueUSD.toFixed(2)}`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Portfolio calculation failed: ${error.message}`);
  }
}

/**
 * Test conversion with different amounts
 */
async function testConversionAmounts() {
  console.log('🧪 Testing Different Conversion Amounts...\n');
  
  const testCases = [
    { token: 'BTC', amount: 0.1 },
    { token: 'ETH', amount: 2.5 },
    { token: 'PEPE', amount: 1000000 }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`Converting ${testCase.amount} ${testCase.token}...`);
      const result = await getTokenPriceUSD(testCase.token, testCase.amount);
      console.log(`✅ ${testCase.amount} ${testCase.token} = $${result.valueUSD.toFixed(2)} USD`);
      console.log(`   Unit price: $${result.priceUSD.toFixed(8)}\n`);
    } catch (error) {
      console.log(`❌ ${testCase.token}: ${error.message}\n`);
    }
    
    // Add delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Portfolio Utils Test Suite');
  console.log('================================\n');
  
  try {
    await testTokenPriceConversion();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testConversionAmounts();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testBatchPrices();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testPortfolioValue();
    
    console.log('\n✅ Test Suite Complete!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, testTokenPriceConversion, testBatchPrices, testPortfolioValue };