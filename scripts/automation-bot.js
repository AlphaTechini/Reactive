#!/usr/bin/env node
import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';

/**
 * Simple polling automation bot:
 *  - Reads deployments.json for addresses
 *  - Iterates user strategies list (placeholder file strategies.json) and calls evaluate
 */

const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const PRIVATE_KEY = process.env.AUTOMATION_OPERATOR_KEY;
if (!PRIVATE_KEY) {
  console.error('Missing AUTOMATION_OPERATOR_KEY env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const automationAbi = [
  'function batchEvaluate(address[] users,address[] tokens) external',
  'function getStrategy(address user,address token) view returns (bool enabled,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256)'
];

async function loadAddresses() {
  const deployments = JSON.parse(fs.readFileSync('deployments.json'));
  const net = Object.keys(deployments)[0];
  return {
    automation: deployments[net].automationController.contractAddress
  };
}

function loadStrategyTargets() {
  if (fs.existsSync('strategies.json')) {
    return JSON.parse(fs.readFileSync('strategies.json'));
  }
  return { users: [], tokens: [] };
}

async function runOnce() {
  const { automation } = await loadAddresses();
  const contract = new ethers.Contract(automation, automationAbi, wallet);
  const targets = loadStrategyTargets();
  if (!targets.users.length) {
    console.log('No strategy targets defined (strategies.json)');
    return;
  }
  try {
    const tx = await contract.batchEvaluate(targets.users, targets.tokens);
    console.log('Batch evaluate sent:', tx.hash);
    await tx.wait();
    console.log('Batch evaluate mined');
  } catch (e) {
    console.error('Batch evaluate error', e.message);
  }
}

if (process.argv.includes('--loop')) {
  const interval = parseInt(process.env.BOT_INTERVAL || '60000', 10);
  console.log('Starting automation loop, interval', interval, 'ms');
  runOnce();
  setInterval(runOnce, interval);
} else {
  runOnce();
}
