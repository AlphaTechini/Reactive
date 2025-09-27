// automationService.js
// Handles interaction with AutomationController (strategy CRUD)
import { ethers } from 'ethers';
import { secureContractService } from './secureContractService.js';

// Minimal ABI for AutomationController
const AUTOMATION_ABI = [
  'function setStrategy(address token,uint256 stopLossBps,uint256 takeProfitBps,uint256 coolDown,uint256 sellPortionBps,uint256 slippageBps,bool enabled) external',
  'function getStrategy(address user,address token) view returns (bool enabled,address token,uint256 stopLossBps,uint256 takeProfitBps,uint256 entryPrice,uint256 lastExecution,uint256 coolDown,uint256 sellPortionBps,uint256 slippageBps)'
];

class AutomationService {
  constructor(){
    this.initialized = false;
  }

  async initialize(automationAddress){
    if(this.initialized) return;
    if(!automationAddress) throw new Error('AutomationController address required');
    await secureContractService.initialize();
    const provider = secureContractService.provider;
    const signer = await provider.getSigner();
    this.contract = new ethers.Contract(automationAddress, AUTOMATION_ABI, signer);
    this.address = automationAddress;
    this.initialized = true;
  }

  async setStrategy({token, stopLossBps=0, takeProfitBps=0, coolDown=300, sellPortionBps=10000, slippageBps=200, enabled=true}){
    if(!this.initialized) throw new Error('automation not initialized');
    const tx = await this.contract.setStrategy(token, stopLossBps, takeProfitBps, coolDown, sellPortionBps, slippageBps, enabled);
    return await tx.wait();
  }

  async getStrategy(user, token){
    if(!this.initialized) throw new Error('automation not initialized');
    const res = await this.contract.getStrategy(user, token);
    return {
      enabled: res[0],
      token: res[1],
      stopLossBps: Number(res[2]),
      takeProfitBps: Number(res[3]),
      entryPrice: res[4],
      lastExecution: Number(res[5]),
      coolDown: Number(res[6]),
      sellPortionBps: Number(res[7]),
      slippageBps: Number(res[8])
    };
  }
}

export const automationService = new AutomationService();
export default automationService;