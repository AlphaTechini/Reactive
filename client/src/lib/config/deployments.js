// Loader for deployment addresses. The dev/build environment cannot reliably
// import a JSON file from the repo root; instead prefer Vite env variables.
// If you want the frontend to automatically pick up deploy output, copy
// `deployments/reactive-mainnet.json` into `client/static/deployments/` or
// serve it from the same origin and use a runtime fetch.

const DEPLOYMENTS = {
  reactToken: import.meta.env.VITE_REACT_TOKEN_ADDRESS || null,
  portfolioManager: import.meta.env.VITE_PORTFOLIO_MANAGER_ADDRESS || null,
  chainId: Number(import.meta.env.VITE_REACTIVE_CHAIN_ID || 1597),
  network: import.meta.env.VITE_REACTIVE_NETWORK || 'reactive'
};

export default DEPLOYMENTS;
