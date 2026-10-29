const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=process.env.HX_TEST_OUTPUT||path.join(require('node:os').tmpdir(),'qianqiu-paper-qa');
fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[],remote=[];
function ok(text){checks.push(text);console.log('PASS '+text)}
const types={'.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.json':'application/json','.html':'text/html'};
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://local');if(!u.pathname.startsWith('/game/'))throw Error();const file=path.resolve(root,decodeURIComponent(u.pathname.slice(6))||'index.html');if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({...(process.env.HX_BROWSER_EXECUTABLE?{executablePath:process.env.HX_BROWSER_EXECUTABLE}:{}),headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https:/.test(r.url()))remote.push(r.url())});
 await page.goto(`http://127.0.0.1:${server.address().port}/game/index.html`);
 await page.evaluate(()=>document.fonts.ready);
 assert.ok(await page.evaluate(()=>document.fonts.check('30px "Qianqiu Brush"')&&document.fonts.check('18px "Qianqiu Notes"')));
 assert.equal(remote.length,0);ok('子目录部署能加载本地毛笔和文楷字体，启动不请求外部字体或模型');
 for(const width of [360,390,430,1440]){
  await page.setViewportSize({width,height:900});
  for(const tab of ['market','street','support','portfolio','report','connections']){
   await page.locator(`.tabs [data-id="${tab}"]`).click();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}/${tab}: overflow`);
   const active=page.locator('.tabs .active');
   assert.ok(await active.evaluate(el=>{const r=el.getBoundingClientRect(),n=el.parentElement.getBoundingClientRect();return r.left>=n.left-1&&r.right<=n.right+1}),`${width}/${tab}: selected navigation hidden`);
  }
 }
 ok('360/390/430/1440像素下六个页面无横向溢出，当前导航始终可见');
 await page.setViewportSize({width:390,height:844});await page.locator('.tabs [data-id="market"]').click();
 assert.ok(await page.locator('h1').evaluate(e=>e.getBoundingClientRect().height<100));
 await page.screenshot({path:path.join(out,'paper-market-mobile.png')});
 await page.evaluate(()=>window.scrollTo(0,document.querySelector('.market-heading').offsetTop-75));
 await page.screenshot({path:path.join(out,'paper-assets-mobile.png')});
 await page.locator('[data-action="select-asset"][data-id="grain"]').click();
 await page.locator('#trade-quantity').fill('2');await page.locator('[data-action="confirm-trade"]').click();
 assert.match(await page.locator('#ticket').innerText(),/2份/);
 await page.locator('[data-action="support-selected"]').click();await page.locator('#allocation-quantity').fill('1');await page.locator('[data-action="confirm-allocation"]').click();
 await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(100);
 await page.screenshot({path:path.join(out,'paper-support-mobile.png'),fullPage:true});
 ok('纸页交易单可实际买入粮草，支援页可实际分配，提示不拦截后续按钮');
 await page.locator('.tabs [data-id="street"]').click();await page.locator('[data-action="send-chat"]').click();
 await page.locator('blockquote').waitFor();await page.waitForTimeout(4600);
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:path.join(out,'paper-street-mobile.png'),fullPage:true});
 await page.screenshot({path:path.join(out,'paper-street-viewport.png')});
 await page.setViewportSize({width:1440,height:1100});await page.locator('.tabs [data-id="market"]').click();
 await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,'paper-market-desktop.png')});
 await page.screenshot({path:path.join(out,'paper-market-desktop-full.png'),fullPage:true});
 ok('已生成实际桌面、手机盘面、街谈与支援截图供视觉检查');
 const local=await browser.newPage({viewport:{width:390,height:844}});local.on('pageerror',e=>errors.push(e.message));
 await local.route('https://**/*',route=>route.abort());
 await local.goto(pathToFileURL(path.join(root,'index.html')).href);await local.evaluate(()=>document.fonts.ready);
 assert.ok(await local.evaluate(()=>document.fonts.check('18px "Qianqiu Notes"')));assert.equal(await local.locator('.asset').count(),8);
 ok('断开外部网络后，本地双击仍显示字体和八种资产');
 assert.deepEqual(errors,[]);ok('实际浏览器无脚本异常');
 fs.writeFileSync(path.join(out,'paper-ui-results.json'),JSON.stringify({checks,errors,remote,limitations:'桌面Chrome模拟视口与预设玩法；未做真人、真实手机、实际付费API或完整无障碍认证'},null,2));
}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
