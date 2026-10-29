(function(root){
'use strict';
function credentials(config){
 let url;try{url=new URL(config.endpoint.trim());}catch(_){throw Error('请填写完整 API 端点');}
 if(url.username||url.password||url.hash||url.search||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw Error('请使用 HTTPS 或本机 HTTP 端点，不包含账号、查询参数或片段');
 if(!config.model.trim()||!config.key.trim())throw Error('请填写模型名与 API Key');
 return {endpoint:url.href,model:config.model.trim(),key:config.key.trim()};
}
async function complete(config,system,data,{signal,timeout=25000,fetcher=root.fetch}={}){
 const c=credentials(config),controller=new AbortController();
 const attribution={};if(config.provider==='tokenpay'&&config.appUrl){let u;try{u=new URL(config.appUrl);}catch(e){throw Error('App URL无效');}if(!['https:','http:','app:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error('App URL不能包含敏感参数');attribution['X-App-URL']=u.href;}
 const cancel=()=>controller.abort();if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(cancel,timeout);
 try{
  const response=await fetcher(c.endpoint,{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+c.key,...attribution},body:JSON.stringify({model:c.model,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(data)}],temperature:.5,max_tokens:700})});
  if(!response.ok){const action=response.headers?.get('TokenDance-Recovery-Action');const hint=({top_up_balance:'账户余额不足，当前Key仍可能有效',reauthorize_api_key:'需要重新授权专用Key',api_key_quota:'专用Key额度达到限制，可等待刷新或重新授权'})[action];throw Error('接口返回 HTTP '+response.status+(hint?'；'+hint:''));}
  const out=await response.json();let content=out.choices?.[0]?.message?.content;
  if(Array.isArray(content))content=content.map(x=>x.text||'').join('');
  if(typeof content!=='string'||content.length>16000)throw Error('接口未返回有效文本');
  return JSON.parse(content.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim());
 }catch(e){
  if(e.name==='AbortError'||controller.signal.aborted)throw Error(signal?.aborted?'已取消模型请求':'模型请求超时');
  if(e instanceof SyntaxError)throw Error('模型未返回有效 JSON');
  if(/^接口/.test(e.message))throw e;
  throw Error('模型请求失败，请检查网络、CORS 和接口协议');
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
const api={credentials,complete};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.HXAI=api;
})(typeof globalThis!=='undefined'?globalThis:this);
