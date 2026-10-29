(function(root){
  'use strict';
  const scenario={
    schemaVersion:1,id:'three-kingdoms-207',version:'0.1.0-demo',title:'三国 · 群雄逐鹿',subtitle:'建安十二年开始的历史投资实验',license:'CC BY-SA 4.0 (原创剧本说明文字)',
    seed:207,startingCash:1000,liquidity:100,feeRate:0.01,maxTradesPerRound:5,
    rounds:[
      {year:207,title:'群雄布局',news:'天下尚未归一。北方曹操实力雄厚；刘备辗转荆州；江东由孙权治理。诸葛亮初入政治视野。',signals:{E01:0.04,E03:0.02,E05:0.02},tags:['荆州','格局未定']},
      {year:208,title:'赤壁风云',news:'南方联盟与北方强权发生重大军事对抗；地缘格局存在重新划分的可能。',signals:{E01:0.08,E03:0.04,E05:0.03},tags:['战争','联盟']},
      {year:214,title:'益州之争',news:'益州局势成为争夺焦点。本年度结束时，将核验刘备是否控制成都。',signals:{E01:0.14,E03:0.06},tags:['益州','军事']},
      {year:220,title:'政权交替',news:'汉末政治秩序进入重要转折期。本年度将核验曹操是否仍在世。',signals:{E02:-0.11,E03:0.05},tags:['政权','继承']},
      {year:221,title:'建立新秩序',news:'不同政治力量正在确认其统治合法性。本年度核验刘备称帝、诸葛亮任职等结果。',signals:{E03:0.13,E05:0.13},tags:['官职','政权']},
      {year:223,title:'政治重组',news:'各方政权面临新一轮权力配置。本年度核验刘备存世与孙权称帝时点。',signals:{E04:-0.09,E06:-0.05},tags:['继承','政治']},
      {year:229,title:'江东政局',news:'东吴政权走向新阶段。本年度核验孙权是否已称帝。',signals:{E07:0.15},tags:['东吴','称帝']},
      {year:234,title:'北伐尾声',news:'长期战争和统治负担正在改变蜀汉政局。本年度核验诸葛亮是否仍在世。',signals:{E08:-0.12},tags:['北伐','终局']}
    ],
    contracts:[
      {id:'E01',character:'liubei',question:'214 年末，刘备是否已经控制成都？',settleYear:214,outcome:'YES',criterion:'以刘备取得成都控制权为 YES，按 214 年末判定。',source:'《三国志·先主传》（待核对段落）'},
      {id:'E02',character:'caocao',question:'220 年末，曹操是否仍然在世？',settleYear:220,outcome:'NO',criterion:'220 年末曹操仍存世则 YES，否则 NO。',source:'《三国志·武帝纪》（待核对段落）'},
      {id:'E03',character:'liubei',question:'221 年末，刘备是否已经称帝？',settleYear:221,outcome:'YES',criterion:'已以皇帝身份即位则 YES。',source:'《三国志·先主传》（待核对段落）'},
      {id:'E04',character:'liubei',question:'223 年末，刘备是否仍然在世？',settleYear:223,outcome:'NO',criterion:'223 年末刘备仍存世则 YES，否则 NO。',source:'《三国志·先主传》（待核对段落）'},
      {id:'E05',character:'zhuge',question:'221 年末，诸葛亮是否已出任丞相？',settleYear:221,outcome:'YES',criterion:'截至 221 年末已出任蜀汉丞相则 YES。',source:'《三国志·诸葛亮传》（待核对段落）'},
      {id:'E06',character:'sunquan',question:'223 年末，孙权是否已经称帝？',settleYear:223,outcome:'NO',criterion:'截至 223 年末已以皇帝身份即位则 YES。',source:'《三国志·吴主传》（待核对段落）'},
      {id:'E07',character:'sunquan',question:'229 年末，孙权是否已经称帝？',settleYear:229,outcome:'YES',criterion:'截至 229 年末已以皇帝身份即位则 YES。',source:'《三国志·吴主传》（待核对段落）'},
      {id:'E08',character:'zhuge',question:'234 年末，诸葛亮是否仍然在世？',settleYear:234,outcome:'NO',criterion:'234 年末诸葛亮仍存世则 YES，否则 NO。',source:'《三国志·诸葛亮传》（待核对段落）'}
    ],
    characters:[
      {id:'caocao',name:'曹操',code:'CAO',faction:'魏',tag:'权力与转折',description:'北方势力的主要领导者，政治与军事能力突出。',bundle:[{eventId:'E02',side:'YES',weightBps:10000}]},
      {id:'liubei',name:'刘备',code:'LIU',faction:'蜀',tag:'创业与继承',description:'辗转多方，持续争取政治根据地的汉室宗亲。',bundle:[{eventId:'E01',side:'YES',weightBps:3000},{eventId:'E03',side:'YES',weightBps:4000},{eventId:'E04',side:'YES',weightBps:3000}]},
      {id:'sunquan',name:'孙权',code:'SUN',faction:'吴',tag:'经营江东',description:'继承并巩固江东基业，面临复杂外部联盟与竞争。',bundle:[{eventId:'E06',side:'YES',weightBps:5000},{eventId:'E07',side:'YES',weightBps:5000}]},
      {id:'zhuge',name:'诸葛亮',code:'ZGL',faction:'蜀',tag:'谋略与命运',description:'以谋略著称的年轻政治人物，未来尚不明朗。',bundle:[{eventId:'E05',side:'YES',weightBps:6000},{eventId:'E08',side:'YES',weightBps:4000}]}
    ]
  };
  if(typeof module!=='undefined'&&module.exports)module.exports=scenario;
  root.HXDefaultScenario=scenario;
})(typeof globalThis!=='undefined'?globalThis:this);
