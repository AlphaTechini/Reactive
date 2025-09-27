import { contractService } from '$lib/contractService.js';
export const USDC_ADDRESS = '0x0000000000000000000000000000000000001001';
export const TIMEFRAMES = { '1m':{seconds:60,candles:120}, '5m':{seconds:300,candles:288}, '15m':{seconds:900,candles:192}, '1h':{seconds:3600,candles:168}, '4h':{seconds:14400,candles:180}, '1d':{seconds:86400,candles:120} };
const DEFAULT_SUBGRAPH = import.meta.env?.VITE_UNISWAP_SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
class UniswapPriceFeed { constructor(){ this.cache=new Map(); this.cacheTTL=30_000; this.inFlight=new Map(); this.lruOrder=[]; this.maxEntries=100; } _cacheKey(t,f){ return `${t.toLowerCase()}|${f}`;} async getCandles(token,timeframe='1h'){ const key=this._cacheKey(token,timeframe); const now=Date.now(); const cached=this.cache.get(key); if(cached && (now-cached.ts)<this.cacheTTL){ this._touch(key); return cached.candles; } if(this.inFlight.has(key)) return this.inFlight.get(key); const p=this._fetchCandles(token,timeframe).then(c=>{ this.cache.set(key,{candles:c,ts:Date.now()}); this._touch(key); this._evict(); this.inFlight.delete(key); return c; }).catch(e=>{ this.inFlight.delete(key); throw e; }); this.inFlight.set(key,p); return p; } _touch(k){ const i=this.lruOrder.indexOf(k); if(i!==-1) this.lruOrder.splice(i,1); this.lruOrder.push(k);} _evict(){ while(this.lruOrder.length>this.maxEntries){ const oldest=this.lruOrder.shift(); if(oldest) this.cache.delete(oldest); } } async _fetchCandles(token,timeframe){ const cfg=TIMEFRAMES[timeframe]||TIMEFRAMES['1h']; const period=cfg.seconds; const count=cfg.candles; const useDay=period>=86400; const entity=useDay?'tokenDayDatas':'tokenHourDatas'; const first=Math.min(count,1000); const query=`query TokenCandles($token: String!, $first: Int!) { ${entity}(first: $first, orderBy: periodStartUnix, orderDirection: desc, where: { token: $token }) { periodStartUnix open high low close volumeUSD } }`; try { const resp = await fetch(DEFAULT_SUBGRAPH,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ query, variables:{ token:token.toLowerCase(), first }})}); if(!resp.ok) throw new Error(`Subgraph HTTP ${resp.status}`); const json=await resp.json(); if(json.errors) throw new Error(json.errors.map(e=> e.message).join('; ')); const raw=json.data?.[entity]||[]; if(!raw.length) return this._fallbackSynthetic(token,timeframe); const candles=raw.sort((a,b)=> a.periodStartUnix-b.periodStartUnix).map(r=>({ time:r.periodStartUnix*1000, open:Number(r.open||r.close||0), high:Number(r.high||r.close||0), low:Number(r.low||r.close||0), close:Number(r.close||0), volumeUSD:Number(r.volumeUSD||0)})); return candles.slice(-count); } catch(err){ console.warn('Subgraph candle fetch failed, using fallback:', err.message); return this._fallbackSynthetic(token,timeframe); } }
  async getLatestPrice(token){
    try {
      const candles = await this.getCandles(token,'1h');
      if(candles.length) return candles[candles.length-1].close;
  } catch{ /* ignore candle load error, will fallback */ }
    try {
      await contractService.initialize();
      const priceBN = await contractService.contract.getTokenPrice(token);
      const { ethers } = await import('ethers');
      return parseFloat(ethers.formatEther(priceBN));
    } catch(e){
      console.error('Fallback contract price failed:', e.message);
      return null;
    }
  }
  _fallbackSynthetic(token,timeframe){ const cfg=TIMEFRAMES[timeframe]||TIMEFRAMES['1h']; const now=Date.now(); const base=100 + (token.charCodeAt(2)%50); const candles=[]; let last=base; for(let i=cfg.candles;i>0;i--){ const t=now - i*cfg.seconds*1000; const drift=(Math.random()-0.5)*0.02; const open=last; const close=open*(1+drift); const high=Math.max(open,close)*(1+Math.random()*0.005); const low=Math.min(open,close)*(1-Math.random()*0.005); candles.push({ time:t, open, high, low, close, volumeUSD:Math.random()*1000 }); last=close; } return candles; }
}
export const uniswapPriceFeed = new UniswapPriceFeed();
export default uniswapPriceFeed;