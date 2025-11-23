# NetworkConfigService Documentation

## Overview

The `NetworkConfigService` manages network configuration and switching for the portfolio application. It handles the differences between live mode (Reactive Mainnet) and simulation mode (Reactive Testnet), providing a unified interface for network operations.

## Features

- **Mode-Aware Configuration**: Automatically provides correct network settings based on app mode
- **Network Switching**: Seamlessly switch between mainnet and testnet via MetaMask
- **Network Verification**: Verify that the current network matches the expected mode
- **Automatic Network Addition**: Add networks to MetaMask if they're not already configured
- **Chain ID Validation**: Check if a given chain ID matches the expected network

## Requirements Addressed

- **1.1**: Connect to Reactive testnet when simulation mode is enabled
- **1.2**: Use testnet chain ID and RPC endpoints in simulation mode
- **1.3**: Prompt MetaMask to switch networks when mode changes
- **1.4**: Offer to add network automatically if not configured
- **10.1**: Automatically request network change when switching to simulation mode
- **10.2**: Automatically request network change when switching to live mode

## Installation

The service is automatically initialized when imported:

```javascript
import { networkConfigService } from '$lib/services/NetworkConfigService.js';
```

## API Reference

### `getNetworkConfig(mode)`

Get network configuration for a specific mode.

**Parameters:**
- `mode` (string, optional): 'live' or 'simulation'. Defaults to current app mode.

**Returns:** Object containing:
- `chainId` (string): Chain ID in hex format
- `chainIdDec` (number): Chain ID in decimal format
- `chainName` (string): Human-readable network name
- `rpcUrl` (string): RPC endpoint URL
- `explorerUrl` (string): Block explorer URL
- `nativeCurrency` (object): Native currency details
- `networkParams` (object): Full network parameters for MetaMask
- `isTestnet` (boolean): Whether this is a testnet

**Example:**
```javascript
const config = networkConfigService.getNetworkConfig('simulation');
console.log(config.chainName); // "Reactive Testnet"
console.log(config.chainId); // "0x512358"
```

### `switchNetwork(mode)`

Switch to the network appropriate for the given mode.

**Parameters:**
- `mode` (string, optional): 'live' or 'simulation'. Defaults to current app mode.

**Returns:** Promise<boolean> - True if switch was successful

**Example:**
```javascript
const success = await networkConfigService.switchNetwork('simulation');
if (success) {
  console.log('Switched to testnet');
}
```

### `addNetworkToWallet(config)`

Add a network to MetaMask wallet.

**Parameters:**
- `config` (object, optional): Network configuration. Defaults to current mode's config.

**Returns:** Promise<boolean> - True if network was added successfully

**Example:**
```javascript
const testnetConfig = networkConfigService.getNetworkConfig('simulation');
const added = await networkConfigService.addNetworkToWallet(testnetConfig);
```

### `verifyNetwork(mode)`

Verify that the current network matches the expected mode.

**Parameters:**
- `mode` (string, optional): 'live' or 'simulation'. Defaults to current app mode.

**Returns:** Promise<boolean> - True if network matches the mode

**Example:**
```javascript
const isCorrect = await networkConfigService.verifyNetwork('simulation');
if (!isCorrect) {
  console.log('Network mismatch!');
}
```

### `isCorrectNetwork(chainId, mode)`

Check if a given chain ID matches the expected network for a mode.

**Parameters:**
- `chainId` (string|number): Chain ID to check (hex or decimal)
- `mode` (string, optional): 'live' or 'simulation'. Defaults to current app mode.

**Returns:** boolean - True if chain ID matches the mode's network

**Example:**
```javascript
const isCorrect = networkConfigService.isCorrectNetwork('0x512358', 'simulation');
console.log(isCorrect); // true
```

### `promptNetworkSwitch(mode)`

Prompt user to switch network with helpful instructions.

**Parameters:**
- `mode` (string, optional): Target mode. Defaults to current app mode.

**Returns:** Promise<boolean> - True if user successfully switched

**Example:**
```javascript
const switched = await networkConfigService.promptNetworkSwitch('simulation');
```

### `getNetworkDisplayInfo(mode)`

Get network display information for UI components.

**Parameters:**
- `mode` (string, optional): 'live' or 'simulation'. Defaults to current app mode.

**Returns:** Object containing display information

**Example:**
```javascript
const info = networkConfigService.getNetworkDisplayInfo('simulation');
console.log(info.name); // "Reactive Testnet"
console.log(info.symbol); // "tREACT"
console.log(info.isTestnet); // true
```

### `getExpectedChainId(mode)`

Get the expected chain ID for a given mode.

**Parameters:**
- `mode` (string, optional): 'live' or 'simulation'. Defaults to current app mode.

**Returns:** string - Chain ID in hex format

**Example:**
```javascript
const chainId = networkConfigService.getExpectedChainId('simulation');
console.log(chainId); // "0x512358"
```

### `getExpectedChainIdDec(mode)`

Get the expected chain ID in decimal format.

**Parameters:**
- `mode` (string, optional): 'live' or 'simulation'. Defaults to current app mode.

**Returns:** number - Chain ID in decimal format

**Example:**
```javascript
const chainIdDec = networkConfigService.getExpectedChainIdDec('simulation');
console.log(chainIdDec); // 5318008
```

## Usage Patterns

### Pattern 1: Mode Switch with Network Verification

```javascript
import { networkConfigService } from '$lib/services/NetworkConfigService.js';
import { appMode } from '$lib/stores/appMode.js';

async function switchToSimulationMode() {
  // Update app mode
  appMode.set('simulation');
  
  // Verify network
  const isCorrect = await networkConfigService.verifyNetwork('simulation');
  
  if (!isCorrect) {
    // Prompt user to switch
    const switched = await networkConfigService.switchNetwork('simulation');
    
    if (!switched) {
      console.error('Failed to switch network');
      return false;
    }
  }
  
  return true;
}
```

### Pattern 2: Pre-Transaction Network Check

```javascript
async function executeTransaction() {
  // Verify network before transaction
  const isCorrect = await networkConfigService.verifyNetwork();
  
  if (!isCorrect) {
    // Block transaction and prompt switch
    await networkConfigService.promptNetworkSwitch();
    return;
  }
  
  // Proceed with transaction
  // ...
}
```

### Pattern 3: Display Network Information

```javascript
import { networkConfigService } from '$lib/services/NetworkConfigService.js';
import { appMode } from '$lib/stores/appMode.js';

function NetworkBadge() {
  const mode = $appMode;
  const info = networkConfigService.getNetworkDisplayInfo(mode);
  
  return (
    <div class="network-badge" class:testnet={info.isTestnet}>
      {info.name} ({info.symbol})
    </div>
  );
}
```

### Pattern 4: Automatic Network Addition

```javascript
async function ensureNetworkConfigured(mode) {
  const isCorrect = await networkConfigService.verifyNetwork(mode);
  
  if (!isCorrect) {
    // Try to switch first
    const switched = await networkConfigService.switchNetwork(mode);
    
    if (!switched) {
      // Network might not be added, try adding it
      const config = networkConfigService.getNetworkConfig(mode);
      await networkConfigService.addNetworkToWallet(config);
    }
  }
}
```

## Network Configurations

### Reactive Mainnet (Live Mode)
- **Chain ID**: 1597 (0x63d)
- **Chain Name**: Reactive Mainnet
- **Native Currency**: REACT
- **RPC URL**: https://mainnet-rpc.rnk.dev/
- **Explorer**: https://reactscan.net/

### Reactive Testnet (Simulation Mode)
- **Chain ID**: 5318008 (0x512358)
- **Chain Name**: Reactive Testnet
- **Native Currency**: tREACT (Test Reactive)
- **RPC URL**: https://testnet-rpc.rnk.dev/
- **Explorer**: https://testnet.reactscan.net/

## Error Handling

The service handles several error scenarios:

1. **MetaMask Not Available**: Returns false and shows error notification
2. **User Rejection (4001)**: Returns false and notifies user
3. **Network Not Found (4902)**: Automatically attempts to add the network
4. **Other Errors**: Returns false and shows error message

## Integration with App Mode

The service automatically subscribes to the `appMode` store and updates its internal state when the mode changes. This ensures that all network operations use the correct configuration.

```javascript
// The service automatically tracks mode changes
appMode.subscribe(mode => {
  networkConfigService.currentMode = mode;
});
```

## Testing

The service includes comprehensive unit tests covering:
- Network configuration retrieval
- Chain ID validation
- Network verification logic
- Display information generation

Run tests with:
```bash
pnpm test NetworkConfigService.test.js --run
```

## Examples

See `NetworkConfigServiceExample.js` for complete usage examples including:
- Getting network configurations
- Switching networks
- Verifying networks
- Adding networks to MetaMask
- Complete mode switch workflows
- Pre-transaction checks

## Best Practices

1. **Always verify network before transactions**: Use `verifyNetwork()` before executing any blockchain transaction
2. **Handle user rejection gracefully**: Network switch requests can be rejected by users
3. **Provide clear feedback**: Use the built-in notifications or add your own UI feedback
4. **Cache network info**: The service is lightweight, but you can cache display info if needed
5. **Test both modes**: Ensure your application works correctly in both live and simulation modes

## Future Enhancements

Potential improvements for future versions:
- Support for additional networks
- Network switch retry logic
- Automatic network detection on page load
- Network switch history tracking
- Custom RPC endpoint configuration
