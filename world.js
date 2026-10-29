(function(root){
'use strict';
const D=typeof module!=='undefined'&&module.exports?require('./world-scenario.js'):root.HXWorldScenario;
const copy=x=>JSON.parse(JSON.stringify(x));const SCALE=100;
const money=n=>Math.round(n*SCALE),coins=n=>n/SCALE;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));const int=n=>Number.isSafeInteger(n)&&n>=0;
function fail(message){throw Error(message);}
function hash(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;return h>>>0;}
function random(g,label){return hash(g.seed+':'+label)/4294967296;}
function asset(id){const a=D.assets.find(a=>a.id===id);if(!a)fail('未知交易标的');return a;}
function faction(g,id){if(!Object.hasOwn(g.world.factions,id))fail('未知势力');return g.world.factions[id];}
function weather(g,turn=g.turn){const values=[{id:'clear',name:'天晴路稳',supplyCost:0},{id:'rain',name:'连雨泥路',supplyCost:2},{id:'dry',name:'晴热少雨',supplyCost:1}];return copy(values[Math.floor(random(g,'weather:'+turn)*values.length)]);}
function newGame(seed=207){
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295)fail('种子须为0—4294967295整数');
 const factions={};for(const f of D.factions)factions[f.id]={...copy(f),coffers:money(300)};
 const markets={};for(const a of D.assets)markets[a.id]={available:D.supply,retired:0,bank:money(D.bank),anchor:money(a.price),history:[]};
 const make=(id,name)=>({id,name,cash:money(D.startingCash),positions:{},realized:0,supportBook:0,supportIncome:0});
 const accounts={player:make('player','你的势力'),shen:make('shen','沈砚'),guild:make('guild','行商合伙'),quarter:make('quarter','军需承包商')};
 const g={kind:'HX_WORLD_SAVE',version:1,scenarioId:D.id,seed,revision:0,turn:0,phase:'OPEN',world:{factions,weather:null,lastBattle:null},markets,accounts,feePool:0,tradeCount:0,orderIds:[],allocations:[],camps:[],logs:[],roundReports:[],visits:[],summary:null,chatSeq:0};
 g.world.weather=weather(g);g.initialCash=totalCash(g);
 for(const a of D.assets)g.markets[a.id].history.push({turn:0,stage:'开局',price:mid(g,a.id)});
 g.rumors=makeRumors(g);return g;
}
function totalCash(g){return Object.values(g.accounts).reduce((n,a)=>n+a.cash,0)+Object.values(g.markets).reduce((n,m)=>n+m.bank,0)+Object.values(g.world.factions).reduce((n,f)=>n+f.coffers,0)+g.feePool;}
function mid(g,id){asset(id);const m=g.markets[id];return m.anchor*Math.exp((D.supply-m.available)/D.depth);}
function getPosition(g,id,actor='player'){return g.accounts[actor].positions[id]||{qty:0,cost:0};}
function rawQuote(g,id,direction,qty){
 const a=asset(id),m=g.markets[id];if(!Number.isSafeInteger(qty)||qty<1||qty>200)fail('数量须为1—200整数');if(!['buy','sell'].includes(direction))fail('未知买卖方向');
 if(direction==='buy'&&qty>m.available)fail('市场库存不足');
 const base=mid(g,id)*D.depth*(direction==='buy'?Math.expm1(qty/D.depth):-Math.expm1(-qty/D.depth));
 const amount=direction==='buy'?Math.ceil(base-1e-8):Math.floor(base+1e-8);const fee=Math.ceil(amount*D.feeRate-1e-8);
 return {id:a.id,direction,qty,amount,fee,cashDelta:direction==='buy'?-amount-fee:amount-fee,priceBefore:mid(g,id),priceAfter:mid(g,id)*Math.exp((direction==='buy'?qty:-qty)/D.depth)};
}
function quote(g,{assetId,direction='buy',quantity=1,actorId='player'}={}){
 if(!['OPEN','RESPONSE','NPC'].includes(g.phase))fail('当前阶段不能交易');
 if(!Object.hasOwn(g.accounts,actorId))fail('未知账户');const a=g.accounts[actorId];
 if(actorId==='player'&&g.phase==='NPC')fail('对手行动期间不能交易');
 if(actorId==='player'&&(g.tradeCount>=5||g.phase==='OPEN'&&g.tradeCount>=3))fail(g.phase==='OPEN'?'开盘最多3笔，观察对手后保留至少2笔':'本轮5笔交易已用完');
 const q=rawQuote(g,assetId,direction,quantity),p=getPosition(g,assetId,actorId);
 if(direction==='sell'&&p.qty<quantity)fail('可卖持仓不足，锁定与待交付份额不能出售');
 if(a.cash+q.cashDelta<0)fail('金币不足');if(direction==='sell'&&g.markets[assetId].bank<q.amount)fail('该市场准备金不足，暂不能完整回收');
 const soldCost=direction==='sell'?(quantity===p.qty?p.cost:Math.floor(p.cost*quantity/p.qty)):0;
 return {...q,soldCost,realized:direction==='sell'?q.cashDelta-soldCost:null,resultCash:a.cash+q.cashDelta,revision:g.revision};
}
function append(g,entry){g.logs.push({turn:g.turn,...entry});}
function trade(g,order){
 const actorId=order.actorId||'player';if(order.revision!=null&&order.revision!==g.revision)fail('局势或报价已变化，请重新确认');
 if(!order.orderId||typeof order.orderId!=='string'||order.orderId.length>120)fail('缺少有效订单编号');if(g.orderIds.includes(order.orderId))fail('订单已成交，不能重复提交');
 const q=quote(g,order),n=copy(g),a=n.accounts[actorId],m=n.markets[order.assetId];const p=a.positions[order.assetId]??={qty:0,cost:0};
 a.cash+=q.cashDelta;n.feePool+=q.fee;m.bank+=q.direction==='sell'?-q.amount:q.amount;
 if(q.direction==='sell'){p.qty-=q.qty;p.cost-=q.soldCost;m.available+=q.qty;a.realized+=q.realized;}else{p.qty+=q.qty;p.cost+=-q.cashDelta;m.available-=q.qty;}
 n.orderIds.push(order.orderId);if(actorId==='player')n.tradeCount++;n.revision++;
 m.history.push({turn:n.turn,stage:actorId==='player'?'玩家成交':'对手成交',price:mid(n,order.assetId)});
 append(n,{kind:'TRADE',actorId,assetId:order.assetId,direction:q.direction,quantity:q.qty,amount:q.amount,fee:q.fee,cashDelta:q.cashDelta,soldCost:q.soldCost,realized:q.realized,orderId:order.orderId});return n;
}
function allocationQuote(g,{assetId,factionId,quantity=1,actorId='player'}){
 if(!['OPEN','RESPONSE','NPC'].includes(g.phase))fail('当前阶段不能分配物资');if(actorId==='player'&&g.phase==='NPC')fail('请等对手行动完成');
 const a=asset(assetId),f=faction(g,factionId);if(a.type==='person')fail('人物股不是可交付物资');
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>50)fail('每笔支援须为1—50份');
 if(getPosition(g,assetId,actorId).qty<quantity)fail('物资可用库存不足，请先买入或取消其他分配');
 if(g.allocations.filter(x=>x.actorId===actorId).length>=8)fail('每回合最多8笔待交付分配，可取消后调整');
 const p=getPosition(g,assetId,actorId),bookCost=quantity===p.qty?p.cost:Math.floor(p.cost*quantity/p.qty);
 const rate=a.type==='camp'?0:(assetId==='grain'?.3:.2);
 return {assetId,factionId,quantity,actorId,bookCost,type:a.type,estimatedCompensation:Math.min(f.coffers,Math.floor(mid(g,assetId)*quantity*rate)),releaseTurn:a.type==='camp'?g.turn+2:null};
}
function allocate(g,input){
 const q=allocationQuote(g,input),n=copy(g),p=n.accounts[q.actorId].positions[q.assetId];p.qty-=q.quantity;p.cost-=q.bookCost;
 n.allocations.push({...q,id:'allocation-'+g.turn+'-'+g.revision,quotedCompensation:q.estimatedCompensation});n.revision++;
 append(n,{kind:'ALLOCATE',actorId:q.actorId,assetId:q.assetId,factionId:q.factionId,quantity:q.quantity,id:n.allocations.at(-1).id});return n;
}
function cancelAllocation(g,id){if(!['OPEN','RESPONSE'].includes(g.phase))fail('当前阶段不能取消分配');const i=g.allocations.findIndex(x=>x.id===id&&x.actorId==='player');if(i<0)fail('没有可取消的玩家分配');const n=copy(g),[x]=n.allocations.splice(i,1);const p=n.accounts.player.positions[x.assetId]??={qty:0,cost:0};p.qty+=x.quantity;p.cost+=x.bookCost;n.revision++;append(n,{kind:'CANCEL_ALLOCATION',id});return n;}
function liquidation(g,actorId='player'){
 const a=g.accounts[actorId];let net=a.cash,cost=0,available=true;const totals={};
 for(const [id,p] of Object.entries(a.positions)){if(p.qty){totals[id]=(totals[id]||0)+p.qty;cost+=p.cost;}}
 for(const x of [...g.allocations,...g.camps].filter(x=>x.actorId===actorId)){totals[x.assetId]=(totals[x.assetId]||0)+x.quantity;cost+=x.bookCost;}
 for(const [id,qty] of Object.entries(totals)){const q=rawQuoteLarge(g,id,qty);net+=q.net;if(g.markets[id].bank<q.amount)available=false;}
 return {net,cost,available,locked:g.camps.filter(x=>x.actorId===actorId).reduce((n,x)=>n+x.quantity,0)};
}
function rawQuoteLarge(g,id,qty){const amount=Math.floor(mid(g,id)*D.depth*(-Math.expm1(-qty/D.depth))+1e-8);const fee=Math.ceil(amount*D.feeRate-1e-8);return {amount,fee,net:amount-fee};}
function positionView(g,id){const p=getPosition(g,id);if(!p.qty)return {...p,average:0,net:0,pnl:0};const q=rawQuoteLarge(g,id,p.qty);return {...p,average:p.cost/p.qty,net:q.net,pnl:q.net-p.cost};}
function makeRumors(g){
 const ids=D.factions.map(f=>f.id),out={};
 for(const [role,definition] of Object.entries(D.roles)){
  const id=ids[Math.floor(random(g,'rumor-faction:'+role+':'+g.turn)*ids.length)],f=faction(g,id),isOld=random(g,'rumor-age:'+role+':'+g.turn)>.55;
  const distorted=random(g,'rumor-distortion:'+role+':'+g.turn)>.68;
  const shortage=(f.stats.supply<36)!==distorted;
  const nick=f.short;
  let opening,follow;
  if(role==='merchant'){opening=shortage?`“${nick}来的客人找粮找得勤，价没谈拢就急着走。生意是多了，可我倒不敢把仓底都卖空。”`:`“${nick}那边的客人说，最近找粮没前阵子难。我这铺子倒清静了，你说我该高兴还是发愁？”`;follow=`“${isOld?'那是前些天':'就是这两日'}来买货的人说的。我只见了几张面孔，粮最后送到了哪儿，我可没跟着车跑。”`;}
  else if(role==='rider'){opening=shortage?`“去${nick}那段路，有人半道掉头找粮。也可能只是这一队没备够，别把一条路上的事当成整个天下。”`:`“去${nick}的车队走得还算齐整。我一路只顾找落脚处，军帐里的盘算可没听明白。”`;follow=`“${isOld?'我绕路住了几日，日子记得未必准':'这一趟我自己走过'}。路上有晴有雨，一段好走不等于处处都好走。”`;}
  else if(role==='keeper'){opening=shortage?`“${nick}来的住客问得最多的是饭能不能多添一碗。床还有，后厨却不敢敞开说管够。”`:`“${nick}来的客人住下就补马具，饭倒没催。你要问打不打得赢，我只管床板响不响。”`;follow=`“我见的只是住店的这拨人。${isOld?'他们进门时说的旧事，未必就是今天的事。':'有些话是酒桌上听来的，醒了还认不认，谁知道。'}”`;}
  else {opening=`“我今天先翻翻自己的账。${nick}的风声听着热闹，买贵了照样难受。你是来喝茶，还是也在盘算手里的东西？”`;follow='“我会自己看价格。你私下听到的话，不告诉我，我可不会隔着墙知道。别把我下单当成准信。”';}
  out[role]={role,name:definition.name,factionId:id,opening,follow,distorted,isOld};
 }
 return out;
}
function talkObservation(g,role,question,sessionId){
 if(!Object.hasOwn(D.roles,role))fail('未知人物');const r=g.rumors[role];
 return {setting:`以207年局势开局的架空世界，当前第${g.turn+1}季。后续已可能偏离史实。`,role:D.roles[role],weather:g.world.weather.name,heard:{opening:r.opening,follow:r.follow},question,conversation:g.visits.filter(x=>x.id===sessionId).flatMap(x=>x.messages).slice(-6)};
}
function chat(g,{role,question,sessionId=null,answer=null,source='preset'}){
 if(g.phase!=='OPEN')fail('回应阶段只查看聊天记录，下回合再串门');if(!Object.hasOwn(D.roles,role))fail('未知人物');
 if(typeof question!=='string'||!question.trim()||question.length>300)fail('聊的话须为1—300字');if(!['preset','model'].includes(source))fail('未知回复来源');
 const existing=sessionId?g.visits.find(v=>v.id===sessionId&&v.role===role):null;
 if(sessionId&&!existing)fail('这段聊天已经结束或不存在');if(existing&&existing.messages.length>=3)fail('这次串门先聊到这儿；每段最多三轮');if(!existing&&g.visits.length>=2)fail('这一季已串门两次，下季再来坐坐');
 if(answer!=null&&(typeof answer!=='string'||!answer.trim()||answer.length>1000))fail('人物回复格式无效');
 const n=copy(g),r=n.rumors[role];let text;
 if(answer!=null)text=answer;
 else if(!existing)text=r.opening;
 else if(/买|卖|股|赢|结局|未来|是否已经|称帝/.test(question))text=role==='shen'?r.follow:'“你倒会挑时候问准话。我只知道自己碰见的这些，后头的事谁说得准。茶还热着，你慢慢想。”';
 else if(/谁|时候|几天|多久|来源|听|亲眼|后来|路|粮|为什么/.test(question))text=r.follow;
 else text=role==='merchant'?'“前回我信酒桌上的热闹囤了货，家里那位说，再卖不掉就让我跟米袋一起睡铺子。你说我这回还敢不多问两句？”':role==='rider'?'“一路上谁都说自己那边安稳，走到半道才知道鞋底靠不靠谱。你若出门，别只带一双鞋。”':role==='keeper'?'“客人进门都说只住一宿，账倒常常拖到第三天。你若认识哪个爱记账的，替我催一句。”':'“有人买了就盯着涨，有人没买就盼着跌。还是先看看自己能担多少，比猜别人心思实在。”';
 let session=existing?n.visits.find(v=>v.id===sessionId):null;
 if(!session){session={id:'visit-'+g.turn+'-'+g.chatSeq,role,messages:[]};n.visits.push(session);n.chatSeq++;}
 session.messages.push({question:question.trim(),answer:text,source});n.revision++;return n;
}
function rivalObservation(g){const a=g.accounts.shen;return {turn:g.turn+1,weather:g.world.weather.name,publicWorld:D.factions.map(f=>({name:f.name,territory:g.world.factions[f.id].stats.territory,morale:g.world.factions[f.id].stats.morale})),cash:a.cash,unit:'所有cash与报价金额均为分，100分=1金币',assets:D.assets.map(x=>({id:x.id,name:x.name,price:Math.round(mid(g,x.id)),held:getPosition(g,x.id,'shen').qty})),ownConversation:g.visits.filter(v=>v.role==='shen').flatMap(v=>v.messages),limits:{quantity:8,maxDebit:money(80)}};}
function validateRival(g,d){
 if(!d||typeof d.speech!=='string'||!d.speech.trim()||d.speech.length>800||!['buy','sell','hold'].includes(d.action))fail('对手返回无效判断');
 if(d.action==='hold')return {action:'hold',speech:d.speech};asset(d.assetId);
 if(!Number.isSafeInteger(d.quantity)||d.quantity<1||d.quantity>8)fail('对手每次最多8份');
 const q=quote({...g,phase:'NPC'},{actorId:'shen',assetId:d.assetId,direction:d.action,quantity:d.quantity});if(d.action==='buy'&&-q.cashDelta>money(80))fail('对手单轮买入预算最多80金币');
 return {action:d.action,assetId:d.assetId,quantity:d.quantity,speech:d.speech};
}
function fallbackRival(g){
 const candidates=D.assets.map(a=>({a,p:mid(g,a.id),edge:g.markets[a.id].anchor/mid(g,a.id)-1}));
 candidates.sort((a,b)=>Math.abs(b.edge)-Math.abs(a.edge));const chosen=candidates[0];
 if(Math.abs(chosen.edge)<.015){const index=Math.floor(random(g,'rival-pick:'+g.turn)*D.assets.length),a=D.assets[index];return {action:random(g,'rival-hold:'+g.turn)>.72?'hold':'buy',assetId:a.id,quantity:Math.min(3,Math.floor(g.accounts.shen.cash/mid(g,a.id)/1.05)),speech:'先看公开局势和价格。我只做一小笔，也可能继续等。'};}
 const p=getPosition(g,chosen.a.id,'shen');return {action:chosen.edge<0&&p.qty?'sell':chosen.edge>.015?'buy':'hold',assetId:chosen.a.id,quantity:Math.max(1,Math.min(3,p.qty||3)),speech:'我对照了公开局势与报价，调整一点仓位。这不是对下一场战局的保证。'};
}
function observe(g,decision=null,source='preset'){
 if(g.phase!=='OPEN')fail('本轮对手阶段已经完成或当前不能观察');
 if(decision)decision=validateRival(g,decision);let n=copy(g);n.phase='NPC';const before={};for(const a of D.assets)before[a.id]=mid(n,a.id);
 const d=decision||fallbackRival(n);let report={source:decision&&source==='model'?'model':'preset',speech:d.speech,action:d.action,status:'主动观望，没有成交。',executed:false};
 if(d.action!=='hold'){
  try{const valid=validateRival(n,d);n=trade(n,{actorId:'shen',assetId:valid.assetId,direction:valid.action,quantity:valid.quantity,orderId:'shen-'+g.turn,revision:n.revision});report={...report,executed:true,assetId:valid.assetId,quantity:valid.quantity,status:(valid.action==='buy'?'买入':'卖出')+' '+asset(valid.assetId).name+' × '+valid.quantity};}catch(e){report.status='订单未成交：'+e.message;}
 }
 for(const [id,index] of [['guild',1],['quarter',2]]){
  const res=['grain','iron','horse','camp'][Math.floor(random(n,'npc-asset:'+id+':'+g.turn)*4)];const held=getPosition(n,res,id).qty;
  const direction=held>3&&random(n,'npc-sell:'+id+':'+g.turn)>.55?'sell':'buy';
  try{n=trade(n,{actorId:id,assetId:res,direction,quantity:2+index,orderId:id+'-'+g.turn});}catch(e){append(n,{kind:'NPC_PASS',actorId:id,reason:e.message});}
  const qty=Math.min(getPosition(n,res,id).qty,res==='camp'?1:2);
  if(qty&&random(n,'npc-support:'+id+':'+g.turn)>.2){try{n=allocate(n,{actorId:id,assetId:res,quantity:qty,factionId:D.factions[(g.turn+index)%3].id});}catch(e){append(n,{kind:'NPC_PASS',actorId:id,reason:e.message});}}
 }
 n.phase='RESPONSE';n.revision++;n.rivalReport=report;n.opponentPrices=before;
 append(n,{kind:'OPPONENT_PHASE',rival:copy(report)});return n;
}
function score(f,id){const s=f.stats;return id==='zhuge'?.15*s.army+.25*s.supply+.3*s.morale+.3*s.influence:.25*s.army+.2*s.supply+.15*s.morale+.3*s.territory+.1*s.influence;}
function setStat(f,key,value){f.stats[key]=Math.round(clamp(value,0,100)*100)/100;}
function pay(g,f,owner,amount,kind,assetId,quantity){const paid=Math.max(0,Math.min(f.coffers,Math.floor(amount)));f.coffers-=paid;g.accounts[owner].cash+=paid;g.accounts[owner].supportIncome+=paid;append(g,{kind,actorId:owner,factionId:f.id,assetId,quantity,paid});return paid;}
function supportEffect(f,id,qty){if(id==='grain'){setStat(f,'supply',f.stats.supply+3*qty);setStat(f,'morale',f.stats.morale+.6*qty);}if(id==='iron')setStat(f,'army',f.stats.army+2*qty);if(id==='horse'){setStat(f,'mobility',f.stats.mobility+2*qty);setStat(f,'army',f.stats.army+.7*qty);}if(id==='camp'){setStat(f,'supply',f.stats.supply+2*qty);setStat(f,'morale',f.stats.morale+.7*qty);}}
function closeRound(g){
 if(g.phase!=='RESPONSE')fail('先观察对手，再决定收盘；不能重复推进');
 const n=copy(g),before=copy(g.world.factions),receipts=[];
 for(const x of n.allocations){
  const f=faction(n,x.factionId);
  if(x.assetId==='camp')n.camps.push({...x,releaseTurn:n.turn+2});
  else{supportEffect(f,x.assetId,x.quantity);n.markets[x.assetId].retired+=x.quantity;n.accounts[x.actorId].supportBook+=x.bookCost;const paid=pay(n,f,x.actorId,x.quotedCompensation,'SUPPORT_RECEIPT',x.assetId,x.quantity);receipts.push({...x,paid});}
 }
 n.allocations=[];
 for(const x of n.camps){const f=faction(n,x.factionId);supportEffect(f,'camp',x.quantity);const paid=pay(n,f,x.actorId,money(.45)*x.quantity,'CAMP_FEE',x.assetId,x.quantity);receipts.push({...x,paid});}
 for(const f of Object.values(n.world.factions)){
  setStat(f,'supply',f.stats.supply-6-f.stats.army*.04-n.world.weather.supplyCost);
  if(f.stats.supply<18){setStat(f,'army',f.stats.army-3);setStat(f,'morale',f.stats.morale-4);}
  else setStat(f,'morale',f.stats.morale+.4);
 }
 const pairs=[['liu','cao'],['sun','cao'],['liu','sun']],[aId,bId]=pairs[n.turn%pairs.length];const a=faction(n,aId),b=faction(n,bId);
 const strength=f=>.35*f.stats.army+.3*f.stats.supply+.2*f.stats.morale+.15*f.stats.mobility;
 const probability=clamp(.5+(strength(a)-strength(b))/140,.12,.88),roll=random(n,'battle:'+n.turn),winner=roll<probability?a:b,loser=winner===a?b:a;
 setStat(winner,'territory',winner.stats.territory+4);setStat(winner,'morale',winner.stats.morale+3);setStat(winner,'influence',winner.stats.influence+2);
 setStat(loser,'territory',loser.stats.territory-3);setStat(loser,'morale',loser.stats.morale-3);setStat(loser,'army',loser.stats.army-1);
 const battle={a:aId,b:bId,winner:winner.id,loser:loser.id,probability,roll,text:`${winner.name}在本季争夺中取得进展，${loser.name}暂时收缩。`};
 n.world.lastBattle=battle;
 const changes=[];
 const initialSupply=D.factions.reduce((t,f)=>t+f.stats.supply,0)/3,currentSupply=Object.values(n.world.factions).reduce((t,f)=>t+f.stats.supply,0)/3;
 for(const a of D.assets){
  let factor;
  if(a.type==='person'){const f=faction(n,a.faction),initial=D.factions.find(x=>x.id===a.faction);factor=score(f,a.id)/score(initial,a.id);}
  else if(a.id==='grain')factor=1+(initialSupply-currentSupply)/75+(n.world.weather.id==='rain'?.08:0);
  else if(a.id==='iron')factor=1+(.5-(faction(n,'cao').stats.army+faction(n,'liu').stats.army+faction(n,'sun').stats.army)/300)*.28+n.turn*.025;
  else if(a.id==='horse')factor=1+(n.world.weather.id==='rain'?.12:0)+n.turn*.025;
  else factor=1+n.camps.reduce((v,x)=>v+x.quantity,0)*.012+(initialSupply-currentSupply)/160;
  const old=mid(n,a.id);n.markets[a.id].anchor=money(a.price*clamp(factor,.35,3));const price=mid(n,a.id);n.markets[a.id].history.push({turn:n.turn,stage:'局势重估',price});changes.push({id:a.id,before:old,after:price});
 }
 const final=n.turn===D.turns-1,released=[];
 n.camps=n.camps.filter(x=>{if(x.releaseTurn<=n.turn+1||final){const p=n.accounts[x.actorId].positions[x.assetId]??={qty:0,cost:0};p.qty+=x.quantity;p.cost+=x.bookCost;released.push(x);append(n,{kind:'CAMP_RELEASE',actorId:x.actorId,assetId:x.assetId,quantity:x.quantity,factionId:x.factionId});return false;}return true;});
 n.summary={turn:n.turn,before,after:copy(n.world.factions),battle,changes,receipts,released,opponents:n.rivalReport,playerEquity:liquidation(n).net};
 n.roundReports.push(copy(n.summary));n.phase=final?'FINISHED':'SUMMARY';n.revision++;
 append(n,{kind:'WORLD_TURN',battle:copy(battle),phase:n.phase});
 const errors=audit(n);if(errors.length)fail('世界账本异常：'+errors.join('；'));return n;
}
function continueRound(g){if(g.phase!=='SUMMARY')fail('当前不能进入下一季');const n=copy(g);n.turn++;n.phase='OPEN';n.tradeCount=0;n.visits=[];n.chatSeq=0;n.summary=null;n.rivalReport=null;n.opponentPrices=null;n.world.weather=weather(n);n.rumors=makeRumors(n);n.revision++;return n;}
function audit(g){
 const errors=[];
 if(!int(g.initialCash)||totalCash(g)!==g.initialCash)errors.push('金币总量不守恒');
 for(const a of Object.values(g.accounts)){if(!int(a.cash))errors.push('账户金币无效');for(const [id,p] of Object.entries(a.positions)){if(!D.assets.some(a=>a.id===id)||!int(p.qty)||!int(p.cost)||!p.qty&&p.cost!==0)errors.push('持仓或成本无效');}}
 for(const a of D.assets){const m=g.markets[a.id];if(!m){errors.push('缺少市场');continue;}const held=Object.values(g.accounts).reduce((n,x)=>n+(x.positions[a.id]?.qty||0),0),locked=[...g.allocations,...g.camps].filter(x=>x.assetId===a.id).reduce((n,x)=>n+x.quantity,0);if(!int(m.available)||!int(m.retired)||m.available+m.retired+held+locked!==D.supply)errors.push(a.name+'份额不守恒');if(!int(m.bank)||!int(m.anchor)||m.anchor<1||!Number.isFinite(mid(g,a.id)))errors.push('市场金额无效');}
 for(const f of Object.values(g.world.factions)){if(!int(f.coffers))errors.push('阵营金库无效');for(const k of ['army','supply','morale','territory','influence','mobility'])if(!Number.isFinite(f.stats[k])||f.stats[k]<0||f.stats[k]>100)errors.push('势力属性无效');}
 return errors;
}
function checkSave(raw){
 if(!raw||raw.kind!=='HX_WORLD_SAVE'||raw.version!==1||raw.scenarioId!==D.id)fail('这不是架空世界存档；旧版存档请从史实回放入口恢复');
 const g=copy(raw);if(!int(g.seed)||g.seed>4294967295||!int(g.revision)||!int(g.turn)||g.turn>=D.turns||!['OPEN','RESPONSE','SUMMARY','FINISHED'].includes(g.phase)||!int(g.tradeCount)||g.tradeCount>5||g.phase==='OPEN'&&g.tradeCount>3)fail('世界阶段或交易次数无效');
 if(!g.world?.factions||!g.markets||!g.accounts||!g.accounts.player||!g.accounts.shen||!g.accounts.guild||!g.accounts.quarter||!int(g.feePool)||!Array.isArray(g.logs)||g.logs.length>20000||!Array.isArray(g.allocations)||!Array.isArray(g.camps)||!Array.isArray(g.visits)||!Array.isArray(g.roundReports)||!Array.isArray(g.orderIds)||new Set(g.orderIds).size!==g.orderIds.length||g.visits.length>2)fail('存档结构无效');
 const accountIds=['player','shen','guild','quarter'];
 if(Object.keys(g.accounts).length!==4||Object.keys(g.markets).length!==D.assets.length||Object.keys(g.world.factions).length!==D.factions.length)fail('账户、市场或势力数量无效');
 for(const id of accountIds){const a=g.accounts[id];if(!a.positions||!Number.isSafeInteger(a.realized)||!int(a.supportBook)||!int(a.supportIncome))fail('账户成本数据无效');}
 for(const f of D.factions){if(!g.world.factions[f.id]?.stats)fail('缺少势力');g.world.factions[f.id].id=f.id;g.world.factions[f.id].name=f.name;g.world.factions[f.id].short=f.short;g.world.factions[f.id].color=f.color;}
 for(const a of D.assets){const m=g.markets[a.id];if(!m||!Array.isArray(m.history)||m.history.length>5000||m.history.some(h=>!int(h.turn)||h.turn>g.turn||!Number.isFinite(h.price)||h.price<=0||h.price>1e9))fail('市场价格轨迹无效');}
 for(const l of g.logs){if(!l||typeof l.kind!=='string'||!int(l.turn)||l.turn>g.turn||l.assetId&&!D.assets.some(a=>a.id===l.assetId)||l.actorId&&!accountIds.includes(l.actorId))fail('账本记录无效');}
 if(!int(g.chatSeq)||g.chatSeq>2||!['OPEN','RESPONSE'].includes(g.phase)&&g.allocations.length)fail('本季串门或交付状态无效');
 for(const x of [...g.allocations,...g.camps])if(!accountIds.includes(x.actorId)||!D.assets.some(a=>a.id===x.assetId&&a.type!=='person')||!Object.hasOwn(g.world.factions,x.factionId)||!Number.isSafeInteger(x.quantity)||x.quantity<1||x.quantity>50||!int(x.bookCost)||!int(x.releaseTurn??0)||!int(x.quotedCompensation)||typeof x.id!=='string')fail('支援或营地数据无效');
 if(g.camps.some(x=>x.assetId!=='camp'||x.releaseTurn<=g.turn)||g.phase==='FINISHED'&&g.camps.length)fail('营地锁定期限无效');
 for(const v of g.visits){if(!Object.hasOwn(D.roles,v.role)||typeof v.id!=='string'||!Array.isArray(v.messages)||v.messages.length>3)fail('聊天记录无效');for(const m of v.messages)if(typeof m.question!=='string'||m.question.length>300||typeof m.answer!=='string'||m.answer.length>1000||!['preset','model'].includes(m.source))fail('聊天内容无效');}
 for(const role of Object.keys(D.roles))if(typeof g.rumors?.[role]?.opening!=='string'||g.rumors[role].opening.length>1200||typeof g.rumors[role].follow!=='string'||g.rumors[role].follow.length>1200)fail('角色风声无效');
 if(!g.world.weather||!['clear','rain','dry'].includes(g.world.weather.id)||!Number.isFinite(g.world.weather.supplyCost)||g.world.weather.supplyCost<0||g.world.weather.supplyCost>2)fail('天气数据无效');
 if(['SUMMARY','FINISHED'].includes(g.phase)&&(!g.summary||g.summary.turn!==g.turn||!Array.isArray(g.summary.changes)||!g.summary.battle))fail('季报缺失');
 const reports=[...g.roundReports,...(g.summary?[g.summary]:[])];
 if(g.roundReports.length!==(g.phase==='OPEN'||g.phase==='RESPONSE'?g.turn:g.turn+1))fail('季报数量与阶段不一致');
 for(const r of reports){
  if(!int(r.turn)||r.turn>g.turn||!r.before||!r.after||!r.battle||!Object.hasOwn(g.world.factions,r.battle.a)||!Object.hasOwn(g.world.factions,r.battle.b)||!Object.hasOwn(g.world.factions,r.battle.winner)||typeof r.battle.text!=='string'||r.battle.text.length>600||!Array.isArray(r.changes)||r.changes.length!==D.assets.length||!Array.isArray(r.receipts)||!Array.isArray(r.released))fail('季报内容无效');
  for(const f of D.factions)for(const which of ['before','after'])if(!r[which][f.id]?.stats||['army','supply','morale','territory'].some(k=>!Number.isFinite(r[which][f.id].stats[k])))fail('季报势力数据无效');
  for(const c of r.changes)if(!D.assets.some(a=>a.id===c.id)||!Number.isFinite(c.before)||!Number.isFinite(c.after)||c.before<=0||c.after<=0)fail('季报价格无效');
  for(const x of [...r.receipts,...r.released])if(!accountIds.includes(x.actorId)||!D.assets.some(a=>a.id===x.assetId)||!Object.hasOwn(g.world.factions,x.factionId)||!int(x.quantity)||x.paid!=null&&!int(x.paid))fail('季报交付数据无效');
 }
 if(g.rivalReport&&(typeof g.rivalReport.speech!=='string'||g.rivalReport.speech.length>800||typeof g.rivalReport.status!=='string'||g.rivalReport.status.length>1200))fail('对手报告无效');
 if(g.phase==='FINISHED'&&g.turn!==D.turns-1)fail('终局轮数无效');
 const errors=audit(g);if(errors.length)fail(errors.join('；'));return g;
}
const api={SCALE,money,coins,newGame,asset,mid,getPosition,quote,trade,allocationQuote,allocate,cancelAllocation,liquidation,positionView,talkObservation,chat,rivalObservation,validateRival,observe,closeRound,continueRound,checkSave,audit,totalCash,random};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.HXWorld=api;
})(typeof globalThis!=='undefined'?globalThis:this);
