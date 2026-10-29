(function(root){
'use strict';
const scenario={
 id:'three-kingdoms-sandbox-207',version:1,title:'千秋交易所 · 风起未定',startYear:207,turns:8,
 description:'参考207年的历史局势开局。属性、商人传闻、后续战局与市场均为架空推演，不预写历史结局。',
 startingCash:1000,feeRate:.01,supply:500,depth:220,bank:30000,
 factions:[
  {id:'cao',name:'曹操势力',short:'北方',color:'#c99a91',stats:{army:70,supply:42,morale:58,territory:55,influence:62,mobility:38}},
  {id:'liu',name:'刘备势力',short:'荆州客军',color:'#96c7a1',stats:{army:38,supply:24,morale:66,territory:24,influence:37,mobility:42}},
  {id:'sun',name:'孙权势力',short:'江东',color:'#92bed6',stats:{army:53,supply:40,morale:60,territory:40,influence:48,mobility:65}}
 ],
 assets:[
  {id:'caocao',name:'曹操人物股',symbol:'CAO',type:'person',faction:'cao',price:24,description:'对应北方势力的军力、地盘、补给与声望预期。买入不等于自动资助。'},
  {id:'liubei',name:'刘备人物股',symbol:'LIU',type:'person',faction:'liu',price:16,description:'对应刘备势力的前景。后勤与军事变化会改变价值，结局由对局演化。'},
  {id:'sunquan',name:'孙权人物股',symbol:'SUN',type:'person',faction:'sun',price:20,description:'对应江东势力的发展预期，不按真实历史固定兑付。'},
  {id:'zhuge',name:'诸葛亮人物股',symbol:'ZGL',type:'person',faction:'liu',price:12,description:'偏重刘备势力的组织、补给与士气，和刘备人物股权重不同。'},
  {id:'grain',name:'粮草仓单',symbol:'GRAIN',type:'resource',price:6,unit:'批',description:'1份代表1批库存。可转卖；交付支援消耗库存，改善目标补给与士气。'},
  {id:'iron',name:'军械仓单',symbol:'IRON',type:'resource',price:10,unit:'批',description:'可独立买卖；交付后消耗，用于增强目标军力。'},
  {id:'horse',name:'战马仓单',symbol:'HORSE',type:'resource',price:14,unit:'批',description:'可独立买卖；交付后消耗，增强机动与军力。'},
  {id:'camp',name:'营地经营份额',symbol:'CAMP',type:'camp',price:24,unit:'份',description:'可买卖。投入支援后锁定两轮，改善后勤，按阵营金库实际支付经营费，到期归还份额。'}
 ],
 roles:{
  merchant:{name:'许掌柜',job:'做粮货生意，常把局部买卖看成大事',opener:'掌柜，今天怎么这么早收摊？'},
  rider:{name:'阿衡',job:'跑过几段路的行脚人，记得见闻，未必记得清日子',opener:'一路过来，还算太平吗？'},
  keeper:{name:'营地伙计',job:'关心住客、修缮与饭钱，对外头的事多半听人说',opener:'最近住客多不多，忙得过来吗？'},
  shen:{name:'沈砚',job:'也在市场里讨生活，愿意聊天，不保证押对',opener:'今天怎么没见你急着下单？'}
 }
};
if(typeof module!=='undefined'&&module.exports)module.exports=scenario;root.HXWorldScenario=scenario;
})(typeof globalThis!=='undefined'?globalThis:this);
