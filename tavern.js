(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const roles={merchant:{name:'行商 · 许掌柜',title:'商路与补给',bias:-0.025},scout:{name:'军中来客 · 阿衡',title:'军情与士气',bias:0.025},diplomat:{name:'游说之士 · 季生',title:'联盟与立场',bias:0.06},rival:{name:'沈砚 · 交易对手',title:'谨慎下注，证据优先',bias:0}};
function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;}
function prepare(g){if(!g.tavern)g.tavern={version:1,rounds:{}};g.accounts.value.name='沈砚 · 对手';return g;}
function round(g){return g.tavern?.rounds?.[g.roundIndex]||{visits:[],beliefs:{}};}
function active(g){return g.scenario.contracts.filter(c=>g.markets[c.id].status==='OPEN');}
function probability(g,id){const m=g.markets[id];return 1/(1+Math.exp(-(m.qYes-m.qNo)/1000000/m.b));}
function card(g,role,eventId){
 if(!roles[role]||role==='rival'||!active(g).some(c=>c.id===eventId))throw Error('请选择消息人与活跃合约');
 const r=g.scenario.rounds[g.roundIndex],signal=Number(r.signals?.[eventId]||0);
 const n=hash([g.seed,g.roundIndex,role,eventId].join(':'));
 const distortion=(n%3-1)*0.055+roles[role].bias;
 const tilt=clamp(signal+distortion,-.2,.2);
 const focus={merchant:'商路上的补给与往来只能反映局部，不能据此断定大局。',scout:'军中见闻来自一支队伍，士气与真实战力未必相同。',diplomat:'各方都有游说立场，口头承诺未必兑现。'}[role];
 return {id:[g.roundIndex,role,eventId].join(':'),eventId,role,tilt,distorted:Math.abs(distortion)>.05,
  claim:tilt>.015?'这条线索略偏向 YES。':tilt<-.015?'这条线索略偏向 NO。':'尚不足以判断方向。',
  evidence:r.news,detail:focus,provenance:'游戏生成的角色判断，非新增史料'};
}
function observation(g,role,eventId,question,stance,evidenceId){
 const r=g.scenario.rounds[g.roundIndex];const state=round(g);
 const shared=state.visits.find(v=>v.card?.id===evidenceId)?.card;
 return {year:r.year,news:r.news,role:roles[role]?.name,question,
  focus:active(g).filter(c=>c.id===eventId).map(c=>({id:c.id,question:c.question,priceYes:probability(g,c.id)})),
  clue:role==='rival'?null:card(g,role,eventId),stance:role==='rival'?stance:null,
  sharedEvidence:shared?.eventId===eventId?shared:null,
  conversation:state.visits.filter(v=>v.role===role).map(v=>({question:v.question,answer:v.answer})),
  instruction:'仅使用当前回合信息。历史人物虽真实，角色情报是游戏推演，不承诺结果。'};
}
function visit(g,{role,eventId,question,stance='YES',evidenceId='',answer,source='preset'}){
 if(g.phase!=='TRADING')throw Error('只有交易阶段可以探访');
 if(!roles[role]||!active(g).some(c=>c.id===eventId))throw Error('无效消息人或合约');
 if(typeof question!=='string'||!question.trim()||question.length>300)throw Error('问题需为 1—300 字');
 if(!['YES','NO'].includes(stance))throw Error('无效立场');
 if(round(g).visits.length>=2)throw Error('本回合两次探访机会已经用完');
 if(answer!=null&&(typeof answer!=='string'||!answer.trim()||answer.length>1200))throw Error('对话内容格式无效');
 const next=prepare(copy(g));const state=next.tavern.rounds[g.roundIndex]??={visits:[],beliefs:{}};
 const clue=role==='rival'?null:card(g,role,eventId);
 let shift=0,shared=null;
 if(role==='rival'){
  shared=state.visits.find(v=>v.card?.id===evidenceId)?.card;
  if(evidenceId&&(!shared||shared.eventId!==eventId))throw Error('只能分享本轮已获得的同合约线索');
  shift=shared?clamp(shared.tilt,-.06,.06):(stance==='YES'?.02:-.02);
  state.beliefs[eventId]=clamp((state.beliefs[eventId]||0)+shift,-.12,.12);
 }
 const followup=/来源|哪里|可靠|核对|证据/.test(question)?'这是从本年公开消息中作出的局部解读，我没有独立核验结局；可以换一位消息人核对。':/相反|风险|万一|不利/.test(question)?'最要防的是把眼前信号当成最终结果。局部变化、立场偏差和当前价格都可能让一笔看似正确的下注亏损。':'我只能谈当前见闻，不敢替未来打包票。';
 const fallback=role==='rival'?`你的${shared?'线索':'看法'}我记下了。${shift>0?'我会略微提高对 YES 的判断。':shift<0?'我会略微提高对 NO 的判断。':'这还不足以改变我的判断。'}我仍会比较价格与风险，未必跟单。`:
  `${roles[role].name}：${clue.evidence} ${clue.detail} ${clue.claim} ${followup}`;
 state.visits.push({role,eventId,question:question.trim(),answer:answer||fallback,source,card:clue,shift,sharedEvidence:shared?.id||null});
 return next;
}
function rivalObservation(g){
 const r=g.scenario.rounds[g.roundIndex],a=g.accounts.value,state=round(g);
 return {year:r.year,news:r.news,personality:'沈砚，谨慎且重视证据。可以不交易，不能预知未来。',
  cash:a.cash/1000000,maxQuantity:12,maxSpend:20,
  markets:active(g).map(c=>({id:c.id,question:c.question,priceYes:probability(g,c.id),signal:r.signals?.[c.id]||0,beliefShift:state.beliefs[c.id]||0,holdings:{YES:(a.direct[c.id]?.YES||0)/1000000,NO:(a.direct[c.id]?.NO||0)/1000000}})),
  conversations:state.visits.filter(v=>v.role==='rival').map(v=>({question:v.question,answer:v.answer,eventId:v.eventId,shift:v.shift,sharedEvidence:state.visits.find(x=>x.card?.id===v.sharedEvidence)?.card||null})),
  memory:Object.entries(g.tavern?.rounds||{}).filter(([index])=>Number(index)<g.roundIndex).slice(-3).map(([index,s])=>({year:g.scenario.rounds[index].year,conversations:s.visits.filter(v=>v.role==='rival').map(v=>({question:v.question,answer:v.answer})),previousDecision:typeof s.rivalDecision?.speech==='string'?s.rivalDecision.speech.slice(0,800):null}))};
}
function validateDecision(g,d){
 if(!d||typeof d!=='object'||typeof d.speech!=='string'||!d.speech.trim()||d.speech.length>800)throw Error('对手判断缺少有效说明');
 if(!['buy','sell','hold'].includes(d.action))throw Error('对手动作无效');
 if(d.action==='hold')return {action:'hold',speech:d.speech};
 if(!active(g).some(c=>c.id===d.eventId)||!['YES','NO'].includes(d.side)||!Number.isInteger(d.quantity)||d.quantity<1||d.quantity>12)throw Error('对手订单超出允许范围');
 if(d.action==='sell'&&(g.accounts.value.direct[d.eventId]?.[d.side]||0)<d.quantity*1000000)throw Error('对手可卖份额不足');
 return {action:d.action,eventId:d.eventId,side:d.side,quantity:d.quantity,speech:d.speech};
}
function fallback(g){
 const obs=rivalObservation(g);
 const choices=obs.markets.map(m=>{const belief=clamp(.5+m.signal+m.beliefShift+((hash(g.seed+':'+m.id)%101)-50)/1000,.08,.92);return {...m,edge:belief-m.priceYes};}).sort((a,b)=>Math.abs(b.edge)-Math.abs(a.edge));
 const c=choices[0];if(!c||Math.abs(c.edge)<.012)return {action:'hold',speech:'眼下的价格没有留下足够余地，我选择观望。'};
 const side=c.edge>0?'YES':'NO',opposite=side==='YES'?'NO':'YES';
 const sell=Math.floor(c.holdings[opposite]);
 return {action:sell?'sell':'buy',eventId:c.id,side:sell?opposite:side,quantity:sell?Math.min(12,sell):Math.min(12,4+Math.floor(Math.abs(c.edge)*40)),speech:`我把公开消息${c.beliefShift?'和你提供的看法':''}与报价作了比较，决定${sell?'先减持反向仓位':'小额试探'}。判断可能有误。`};
}
function review(g){return Object.entries(g.tavern?.rounds||{}).flatMap(([index,s])=>s.visits.filter(v=>v.card).map(v=>{const c=g.scenario.contracts.find(c=>c.id===v.eventId);const settled=g.markets[v.eventId]?.status==='SETTLED';const predicted=v.card.tilt>.015?'YES':v.card.tilt<-.015?'NO':null;return {year:g.scenario.rounds[index]?.year,...v,settled,outcome:settled?c.outcome:null,result:!settled?'尚待结算':!predicted?'线索未给出方向':predicted===c.outcome?'方向吻合':'方向相反',explanation:settled?(v.card.distorted?'角色视角偏差较大；单条线索不能代替完整判断。':'当时的局部信号也不保证最终结果。'):'可等待合约到期后再检验。'};}));}
function validateState(g){
 if(!g.tavern)return;
 const t=g.tavern;if(t.version!==1||!t.rounds||typeof t.rounds!=='object'||Array.isArray(t.rounds))throw Error('酒馆存档格式无效');
 for(const [index,s] of Object.entries(t.rounds)){
  if(!/^\d+$/.test(index)||Number(index)>g.roundIndex||!Array.isArray(s.visits)||s.visits.length>2||!s.beliefs||typeof s.beliefs!=='object')throw Error('酒馆回合数据无效');
  for(const v of s.visits){if(!roles[v.role]||!g.markets[v.eventId]||typeof v.question!=='string'||v.question.length>300||typeof v.answer!=='string'||v.answer.length>1200||!['preset','model'].includes(v.source))throw Error('酒馆对话存档无效');if(v.card&&(v.role==='rival'||v.card.eventId!==v.eventId||v.card.role!==v.role||typeof v.card.tilt!=='number'||!Number.isFinite(v.card.tilt)||Math.abs(v.card.tilt)>.2))throw Error('线索存档无效');}
  for(const [id,n] of Object.entries(s.beliefs))if(!g.markets[id]||!Number.isFinite(n)||Math.abs(n)>.12)throw Error('对手信念数据无效');
 }
}
const api={roles,prepare,round,card,observation,visit,rivalObservation,validateDecision,fallback,review,validateState};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.HXTavern=api;
})(typeof globalThis!=='undefined'?globalThis:this);
