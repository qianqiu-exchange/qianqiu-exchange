(function(root){
'use strict';
const T=typeof module!=='undefined'&&module.exports?require('./tavern.js'):root.HXTavern;
const SCALE=1000000;
const clone=x=>JSON.parse(JSON.stringify(x));
const micro=x=>Math.round(x*SCALE);
const coins=x=>x/SCALE;
const fail=(code,message)=>{const err=new Error(message||code);err.code=code;throw err;};
const positiveInteger=n=>Number.isSafeInteger(n)&&n>0;
const contractById=(s,id)=>s.contracts.find(x=>x.id===id);
const characterById=(s,id)=>s.characters.find(x=>x.id===id);
const logSumExp=(a,b)=>{const m=Math.max(a,b);return m+Math.log(Math.exp(a-m)+Math.exp(b-m));};
function cost(qy,qn,b){return b*logSumExp(qy/b,qn/b);}
function price(m,s){const v=(m.qYes-m.qNo)/SCALE/m.b;const p=v>=0?1/(1+Math.exp(-v)):Math.exp(v)/(1+Math.exp(v));return s==='NO'?1-p:p;}
function changeCost(m,side,changeMicro){const old=cost(coins(m.qYes),coins(m.qNo),m.b);const y=m.qYes+(side==='YES'?changeMicro:0);const n=m.qNo+(side==='NO'?changeMicro:0);const next=cost(coins(y),coins(n),m.b);return micro(next-old);}
function validateScenario(s){
 const errors=[];const push=(path,msg)=>errors.push({path,message:msg});
 if(!s||typeof s!=='object')return [{path:'$',message:'剧本必须是 JSON 对象'}];
 if(!/^[a-z0-9-]{3,64}$/.test(s.id||''))push('id','必须为英文小写、数字或连字符');
 if(typeof s.title!=='string'||!s.title.trim())push('title','标题不能为空');
 if(!Array.isArray(s.rounds)||s.rounds.length<2)push('rounds','至少包含两个历史回合');
 if(!Array.isArray(s.contracts)||!s.contracts.length)push('contracts','至少包含一个合约');
 if(!Array.isArray(s.characters)||!s.characters.length)push('characters','至少包含一个人物');
 if(!Number.isFinite(s.startingCash)||s.startingCash<=0||s.startingCash>100000)push('startingCash','初始资金应大于 0 且不超过 100000');
 if(!Number.isFinite(s.liquidity)||s.liquidity<=0||s.liquidity>100000)push('liquidity','流动性参数不合法');
 if(!Number.isFinite(s.feeRate)||s.feeRate<0||s.feeRate>0.2)push('feeRate','手续费应为 0 至 20%');
 if(!positiveInteger(s.maxTradesPerRound)||s.maxTradesPerRound>100)push('maxTradesPerRound','交易次数应为 1 至 100');
 if(!Array.isArray(s.rounds)||!Array.isArray(s.contracts)||!Array.isArray(s.characters))return errors;
 const ys=s.rounds.map(r=>r.year);const ySet=new Set(ys);
 if(ys.some(y=>!Number.isSafeInteger(y))||new Set(ys).size!==ys.length||ys.some((y,i)=>i&&y<=ys[i-1]))push('rounds','年份必须唯一且严格递增');
 s.rounds.forEach((r,i)=>{if(typeof r.news!=='string'||!r.news.trim())push('rounds['+i+'].news','当前年情报不能为空');if(r.signals!=null&&(typeof r.signals!=='object'||Array.isArray(r.signals)))push('rounds['+i+'].signals','必须是事件信号映射');});
 const ids=new Set();s.contracts.forEach((c,i)=>{const p='contracts['+i+']';if(!c.id||ids.has(c.id))push(p+'.id','事件 ID 必须唯一');ids.add(c.id);if(!ySet.has(c.settleYear)||c.settleYear<=ys[0])push(p+'.settleYear','结算年必须存在且晚于起始回合');if(!['YES','NO'].includes(c.outcome))push(p+'.outcome','结果只能为 YES 或 NO');if(!c.question||!c.criterion||!c.source)push(p,'问题、判定标准和出处均不能为空');});
 const names=new Set();s.characters.forEach((c,i)=>{const p='characters['+i+']';if(!c.id||names.has(c.id))push(p+'.id','人物 ID 必须唯一');names.add(c.id);if(!c.name||!c.code)push(p,'人物姓名及代码不可为空');if(!Array.isArray(c.bundle)||!c.bundle.length){push(p+'.bundle','成分不能为空');return;}let sum=0;c.bundle.forEach((leg,j)=>{const lp=p+'.bundle['+j+']';if(!ids.has(leg.eventId))push(lp+'.eventId','引用的合约不存在');if(!['YES','NO'].includes(leg.side))push(lp+'.side','方向只能为 YES 或 NO');if(!positiveInteger(leg.weightBps))push(lp+'.weightBps','权重必须为正整数');sum+=leg.weightBps||0;});if(new Set(c.bundle.map(l=>l.eventId)).size!==c.bundle.length)push(p+'.bundle','同一人物组合内事件不能重复引用');if(sum!==10000)push(p+'.bundle','权重必须合计 10000 基点');});
 s.contracts.forEach((c,i)=>{if(!names.has(c.character))push('contracts['+i+'].character','关联人物不存在');});
 s.rounds.forEach((r,i)=>Object.keys(r.signals||{}).forEach(k=>{if(!ids.has(k))push('rounds['+i+'].signals.'+k,'合约不存在');if(!Number.isFinite(r.signals[k]))push('rounds['+i+'].signals.'+k,'信号必须为数字');}));
 return errors;
}
function initialize(s,seed){const errors=validateScenario(s);if(errors.length)fail('INVALID_SCENARIO',errors.map(e=>e.path+': '+e.message).join('\n'));const sc=clone(s);
 const markets={};sc.contracts.forEach(c=>{markets[c.id]={id:c.id,b:sc.liquidity,qYes:0,qNo:0,status:'OPEN',vault:micro(sc.liquidity*Math.log(2)),history:[{tick:0,year:sc.rounds[0].year,yes:0.5}],settlementId:null};});
 const makeAccount=(id,name,type)=>({id,name,type,cash:micro(sc.startingCash),direct:{},bundles:{},dividends:{},trades:0});
 const accounts={player:makeAccount('player','你','human'),value:makeAccount('value','量化·价值','VALUE'),momentum:makeAccount('momentum','资金·趋势','MOMENTUM'),news:makeAccount('news','史官·情报','NEWS'),noise:makeAccount('noise','游侠·噪声','NOISE')};
 const numericSeed=Number(seed)>>>0;
 return T.prepare({schemaVersion:1,scenario:sc,seed:numericSeed,rngState:numericSeed||1,roundIndex:0,phase:'TRADING',accounts,markets,feePool:0,logs:[],orders:[],tradeCount:0,tick:0,summary:null,equityHistory:[],initialTotal:micro(sc.startingCash)*Object.keys(accounts).length+Object.keys(markets).reduce((a,id)=>a+markets[id].vault,0)});
}
function marketPrice(g,id,side='YES'){const m=g.markets[id];if(!m)fail('UNKNOWN_MARKET');return price(m,side);}
function bundlePrice(g,id){const ch=characterById(g.scenario,id);if(!ch)fail('UNKNOWN_CHARACTER');let v=0,dividend=0;ch.bundle.forEach(l=>{const m=g.markets[l.eventId];if(m.status==='OPEN')v+=l.weightBps/10000*price(m,l.side);else if(m.status==='SETTLED'){const e=contractById(g.scenario,l.eventId);if(e.outcome===l.side)dividend+=l.weightBps/10000;}});return {price:v,settledDividend:dividend,totalReturnReference:v+dividend};}
function legsFor(g,intent){const s=g.scenario;const sign=intent.direction==='buy'?1:-1;const qty=intent.quantity;
 if(intent.assetType==='event'){if(!contractById(s,intent.assetId))fail('UNKNOWN_MARKET','无效事件');if(!['YES','NO'].includes(intent.side))fail('INVALID_SIDE','需要 YES 或 NO');return [{eventId:intent.assetId,side:intent.side,shares:qty*SCALE*sign}];}
 if(intent.assetType==='bundle'){const c=characterById(s,intent.assetId);if(!c)fail('UNKNOWN_CHARACTER','人物不存在');const active=c.bundle.filter(l=>g.markets[l.eventId].status==='OPEN');if(!active.length)fail('ASSET_EXPIRED','所有成分均已结算');return active.map(l=>({eventId:l.eventId,side:l.side,shares:qty*l.weightBps*100*sign}));}
 fail('INVALID_ASSET_TYPE','无效资产类型');
}
function quote(g,intent){if(g.phase!=='TRADING'&&g.phase!=='NPC')fail('CLOSED_SESSION','当前阶段不能交易');if(!positiveInteger(intent.quantity)||intent.quantity>200)fail('INVALID_QUANTITY','份数须为 1 至 200 的整数');if(!['buy','sell'].includes(intent.direction))fail('INVALID_DIRECTION');
 const a=g.accounts[intent.actorId];if(!a)fail('UNKNOWN_ACCOUNT','交易账户不存在');if(intent.actorId==='player'&&g.tradeCount>=g.scenario.maxTradesPerRound)fail('TURN_LIMIT','本回合已达到交易次数上限');
 if(intent.direction==='sell'){
  if(intent.assetType==='bundle'){if((a.bundles[intent.assetId]||0)<intent.quantity)fail('INSUFFICIENT_SHARES','人物股持仓不足');}
  else if(((a.direct[intent.assetId]||{})[intent.side]||0)<intent.quantity*SCALE)fail('INSUFFICIENT_SHARES','事件合约持仓不足');
 }
 const legs=legsFor(g,intent);let amount=0,fees=0;
 const detail=legs.map(l=>{const m=g.markets[l.eventId];if(m.status!=='OPEN')fail('MARKET_CLOSED','合约已结算');const amountMicro=changeCost(m,l.side,l.shares);const fee=Math.ceil(Math.abs(amountMicro)*g.scenario.feeRate-1e-9);amount+=amountMicro;fees+=fee;return {...l,amount:amountMicro,fee,priceBefore:price(m,'YES')};});
 const cashDelta=-amount-fees;if(a.cash+cashDelta<0)fail('INSUFFICIENT_CASH','金币不足');
 if(intent.direction==='buy'&&intent.maxDebit!=null&&amount+fees>intent.maxDebit)fail('SLIPPAGE','买入超出接受成本');
 if(intent.direction==='sell'&&intent.minCredit!=null&&cashDelta<intent.minCredit)fail('SLIPPAGE','卖出低于最低收款');
 return {detail,amount,fees,cashDelta,resultCash:a.cash+cashDelta};
}
function trade(g,intent){if(!intent.orderId||typeof intent.orderId!=='string')fail('INVALID_ORDER_ID','缺少订单编号');if(g.orders.includes(intent.orderId))fail('DUPLICATE_ORDER','该订单已提交');
 const q=quote(g,intent);const next=clone(g);const a=next.accounts[intent.actorId];a.cash+=q.cashDelta;next.feePool+=q.fees;next.orders.push(intent.orderId);next.tick+=1;
 if(intent.assetType==='event'){a.direct[intent.assetId]??={YES:0,NO:0};a.direct[intent.assetId][intent.side]+=intent.quantity*SCALE*(intent.direction==='buy'?1:-1);}
 else a.bundles[intent.assetId]=(a.bundles[intent.assetId]||0)+intent.quantity*(intent.direction==='buy'?1:-1);
 q.detail.forEach(l=>{const m=next.markets[l.eventId];if(l.side==='YES')m.qYes+=l.shares;else m.qNo+=l.shares;m.vault+=l.amount;m.history.push({tick:next.tick,year:next.scenario.rounds[next.roundIndex].year,yes:price(m,'YES')});});
 a.trades++;if(intent.actorId==='player')next.tradeCount++;
 const entry={kind:'TRADE',tick:next.tick,round:next.roundIndex,year:next.scenario.rounds[next.roundIndex].year,actorId:intent.actorId,orderId:intent.orderId,assetType:intent.assetType,assetId:intent.assetId,side:intent.side||null,direction:intent.direction,quantity:intent.quantity,amount:q.amount,fees:q.fees,cashDelta:q.cashDelta};
 next.logs.push(entry);return {state:next,entry,quote:q};
}
function nextRandom(g){let x=g.rngState|0;x^=x<<13;x^=x>>>17;x^=x<<5;g.rngState=x>>>0;return (g.rngState>>>0)/4294967296;}
function npcObservation(g,id){const a=g.accounts[id];const r=g.scenario.rounds[g.roundIndex];const active=g.scenario.contracts.filter(c=>g.markets[c.id].status==='OPEN');return {round:r.year,news:r.news,tags:[...(r.tags||[])],signals:clone(r.signals||{}),cash:a.cash,holdings:clone(a.direct),prices:active.map(c=>({id:c.id,question:c.question,priceYes:marketPrice(g,c.id),history:g.markets[c.id].history.map(p=>p.yes)}))};}
function npcOrder(g,id){const obs=npcObservation(g,id);if(!obs.prices.length)return null;const r=nextRandom(g);const type=g.accounts[id].type;let choice,side='YES',direction='buy',quantity=5;
 if(type==='NOISE'){choice=obs.prices[Math.floor(r*obs.prices.length)];side=nextRandom(g)>.5?'YES':'NO';quantity=2+Math.floor(nextRandom(g)*6);}
 else if(type==='NEWS'){const withSignal=obs.prices.map(p=>({...p,signal:obs.signals[p.id]||0})).sort((a,b)=>Math.abs(b.signal)-Math.abs(a.signal));choice=withSignal[0];if(Math.abs(choice.signal)<0.01)choice=obs.prices[Math.floor(r*obs.prices.length)];side=(choice.signal>=0)?'YES':'NO';quantity=4+Math.floor(r*6);}
 else if(type==='MOMENTUM'){const candidates=obs.prices.map(p=>({...p,change:p.history.length>1?p.priceYes-p.history[Math.max(0,p.history.length-3)]:0})).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));choice=candidates[0];side=(Math.abs(choice.change)>.002?choice.change:r-.5)>=0?'YES':'NO';quantity=3+Math.floor(nextRandom(g)*7);}
 else {const beliefFor=(eventId)=>{let h=(g.seed^2166136261)>>>0;for(const ch of eventId){h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;}return .25+((h%1000)/1000)*.50;};choice=obs.prices.map(p=>({...p,edge:Math.abs(beliefFor(p.id)+(obs.signals[p.id]||0)-p.priceYes),belief:beliefFor(p.id)+(obs.signals[p.id]||0)})).sort((a,b)=>b.edge-a.edge)[0];side=choice.belief>choice.priceYes?'YES':'NO';quantity=5+Math.floor(r*6);}
 return {actorId:id,assetType:'event',assetId:choice.id,side,direction,quantity,orderId:'npc-'+id+'-'+g.roundIndex+'-'+g.tick+'-'+Math.floor(nextRandom(g)*1e9)};
}
function settle(g,eventId){const m=g.markets[eventId],event=contractById(g.scenario,eventId);if(!m||!event)fail('UNKNOWN_MARKET');if(m.status==='SETTLED')fail('ALREADY_SETTLED','重复结算被阻止');if(m.status!=='OPEN')fail('MARKET_CLOSED');
 const winningSide=event.outcome;let allPaid=0;const receipts=[];
 Object.values(g.accounts).forEach(a=>{let shares=((a.direct[eventId]||{})[winningSide]||0);let bundlePaid=0;g.scenario.characters.forEach(c=>{let units=a.bundles[c.id]||0;const leg=c.bundle.find(l=>l.eventId===eventId&&l.side===winningSide);if(leg&&units){const paid=units*leg.weightBps*100;shares+=paid;bundlePaid+=paid;a.dividends[c.id]=(a.dividends[c.id]||0)+paid;}});
  if(shares>0){a.cash+=shares;allPaid+=shares;receipts.push({account:a.id,paid:shares});}
  if(a.direct[eventId]){a.direct[eventId].YES=0;a.direct[eventId].NO=0;}
 });
 m.vault-=allPaid;if(m.vault< -100)fail('INSOLVENT_AMM','做市准备金不足');m.status='SETTLED';m.settlementId=g.scenario.id+'-'+eventId+'-'+event.settleYear;
 g.tick++;const entry={kind:'SETTLEMENT',tick:g.tick,year:event.settleYear,round:g.roundIndex,eventId,winningSide,totalPaid:allPaid,receipts,criterion:event.criterion,source:event.source};g.logs.push(entry);return entry;
}
function equity(g,id){const a=g.accounts[id];const net={};Object.keys(g.markets).forEach(e=>{if(g.markets[e].status==='OPEN')net[e]={YES:0,NO:0};});
 Object.keys(a.direct).forEach(e=>{if(net[e]){net[e].YES+=(a.direct[e].YES||0);net[e].NO+=(a.direct[e].NO||0);}});
 g.scenario.characters.forEach(c=>{const units=a.bundles[c.id]||0;if(!units)return;c.bundle.forEach(l=>{if(net[l.eventId])net[l.eventId][l.side]+=units*l.weightBps*100;});});
 let liquidation=0;Object.entries(net).forEach(([e,x])=>{const m=g.markets[e];const y=m.qYes-x.YES,n=m.qNo-x.NO;const delta=micro(cost(coins(y),coins(n),m.b)-cost(coins(m.qYes),coins(m.qNo),m.b));liquidation+=-delta-Math.ceil(Math.abs(delta)*g.scenario.feeRate-1e-9);});return a.cash+liquidation;
}
function totalFunds(g){return Object.values(g.accounts).reduce((sum,a)=>sum+a.cash,0)+Object.values(g.markets).reduce((sum,m)=>sum+m.vault,0)+g.feePool;}
function advance(g,rivalDecision=null,rivalSource='preset'){if(rivalDecision)rivalDecision=T.validateDecision(g,rivalDecision);if(g.phase!=='TRADING')fail('INVALID_PHASE','必须在交易阶段推进');const next=clone(g);const year=next.scenario.rounds[next.roundIndex].year;next.phase='NPC';const npcTrades=[];let rival=null;const ids=['value','momentum','news','noise'];for(let i=ids.length-1;i>0;i--){const j=Math.floor(nextRandom(next)*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
 // NPC shares the exact transaction function and current market prices.
 for(const id of ids){if(id==='value'){
  const d=rivalDecision||T.fallback(next);rival={source:rivalDecision&&rivalSource==='model'?'model':'preset',speech:d.speech,decision:d,executed:false,status:'本轮观望，没有提交订单。'};
  if(d.action!=='hold'){try{const intent={actorId:'value',assetType:'event',assetId:d.eventId,side:d.side,direction:d.action,quantity:d.quantity,orderId:'rival-'+next.roundIndex+'-'+next.tick};const q=quote(next,intent);if(d.action==='buy'&&q.amount+q.fees>micro(20))fail('RIVAL_BUDGET','超过对手单轮20金币预算');const done=trade(next,intent);Object.assign(next,done.state);npcTrades.push(done.entry);rival.executed=true;rival.status=(d.action==='buy'?'买入':'卖出')+' '+d.eventId+' '+d.side+' × '+d.quantity+' 份，实际'+(done.entry.cashDelta<0?'支出':'收入')+' '+coins(Math.abs(done.entry.cashDelta)).toFixed(2)+' 金币（含手续费）。';}catch(e){rival.status='订单未成交：'+(e.message||e.code);}}
  continue;
 }for(let attempt=0;attempt<2;attempt++){const order=npcOrder(next,id);if(!order)continue;try{const done=trade(next,order);Object.assign(next,done.state);npcTrades.push(done.entry);}catch(e){/* bankruptcy or limited position: NPC passes */}}}
 next.phase='SETTLEMENT';const settled=[];next.scenario.contracts.filter(c=>c.settleYear===year).forEach(c=>settled.push(settle(next,c.id)));
 next.equityHistory.push({year,values:Object.fromEntries(Object.keys(next.accounts).map(id=>[id,equity(next,id)]))});
 T.prepare(next);const tavernRound=next.tavern.rounds[next.roundIndex]??={visits:[],beliefs:{}};tavernRound.rivalDecision=rival;
 next.summary={year,npcTrades,rival,settled,totalAssets:equity(next,'player'),fundsCheck:totalFunds(next)===next.initialTotal};
 next.phase=next.roundIndex===next.scenario.rounds.length-1?'FINISHED':'SUMMARY';return next;
}
function continueRound(g){if(g.phase!=='SUMMARY')fail('INVALID_PHASE');const next=clone(g);next.roundIndex++;next.phase='TRADING';next.tradeCount=0;next.summary=null;return next;}
function audit(g){const errors=[];if(totalFunds(g)!==g.initialTotal)errors.push('资金总量不守恒');Object.values(g.accounts).forEach(a=>{if(a.cash<0)errors.push(a.id+' 现金为负');Object.entries(a.direct).forEach(([id,pos])=>{if(pos.YES<0||pos.NO<0)errors.push(a.id+' 合约负持仓 '+id);});Object.entries(a.bundles).forEach(([id,n])=>{if(n<0)errors.push(a.id+' 人物股负持仓 '+id);});});
 Object.values(g.markets).filter(m=>m.status==='OPEN').forEach(m=>{let y=0,n=0;Object.values(g.accounts).forEach(a=>{y+=(a.direct[m.id]?.YES||0);n+=(a.direct[m.id]?.NO||0);g.scenario.characters.forEach(c=>{const leg=c.bundle.find(l=>l.eventId===m.id);const units=a.bundles[c.id]||0;if(leg&&units){if(leg.side==='YES')y+=units*leg.weightBps*100;else n+=units*leg.weightBps*100;}});});if(y!==m.qYes||n!==m.qNo)errors.push(m.id+' 份额账本不匹配');});return errors;}
function checkSave(payload){if(!payload||payload.kind!=='HX_SAVE'||payload.version!==1)fail('INVALID_SAVE','不是可识别的游戏存档');const g=payload.game;if(!g||validateScenario(g.scenario).length||!Array.isArray(g.logs)||!g.accounts?.player||!g.markets||!g.scenario.rounds[g.roundIndex])fail('INVALID_SAVE','存档结构异常');try{T.validateState(g);}catch(e){fail('INVALID_SAVE',e.message);}const errs=audit(g);if(errs.length)fail('INVALID_SAVE',errs.join('；'));return T.prepare(clone(g));}
const api={SCALE,micro,coins,cost,price,validateScenario,initialize,marketPrice,bundlePrice,quote,trade,advance,continueRound,equity,totalFunds,audit,checkSave,npcObservation};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.HXEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
