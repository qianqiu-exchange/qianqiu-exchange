(function(root){
'use strict';
const base='https://tokendance.space';
function appUrl(value){let u;try{u=new URL(value);}catch(e){throw Error('App URL格式无效');}if(!['https:','http:','app:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.href.length>1500)throw Error('App URL应稳定且不包含账号、查询参数或片段');return u.href;}
function b64(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function begin(value,{crypto=root.crypto,now=Date.now()}={}){
 if(!crypto?.subtle||!crypto.getRandomValues)throw Error('当前浏览器不支持PKCE，请使用HTTPS或本机环境');
 const verifier=b64(crypto.getRandomValues(new Uint8Array(32)));
 const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 const url=new URL('/auth',base);url.searchParams.set('code_challenge',challenge);url.searchParams.set('code_challenge_method','S256');url.searchParams.set('app_url',appUrl(value));url.searchParams.set('key_name','千秋交易所 · 游戏专用');
 // Official headless flow: no callback_url, so the authorization page displays a one-time code.
 return {url:url.href,verifier,createdAt:now};
}
async function exchange(session,code,{fetcher=root.fetch,signal,now=Date.now(),timeout=25000}={}){
 if(!session||typeof session.verifier!=='string'||!/^[A-Za-z0-9_-]{43,128}$/.test(session.verifier)||!Number.isSafeInteger(session.createdAt)||now-session.createdAt>600000||now<session.createdAt)throw Error('授权会话已过期，请重新发起授权');
 if(typeof code!=='string'||!code.trim()||code.length>512)throw Error('请粘贴授权页显示的一次性Code');
 const c=new AbortController(),cancel=()=>c.abort();if(signal?.aborted)c.abort();else signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,timeout);
 try{const r=await fetcher(base+'/portal/api/v1/auth/keys',{method:'POST',credentials:'omit',redirect:'error',signal:c.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code.trim(),code_verifier:session.verifier,code_challenge_method:'S256'})});if(!r.ok)throw Error('授权交换返回HTTP '+r.status+'，检查Code是否有效，必要时重新授权');const out=await r.json();if(typeof out.key!=='string'||!out.key.trim()||out.key.length>4096)throw Error('授权交换未返回有效Key');return out.key;
 }catch(e){if(c.signal.aborted)throw Error('授权交换已取消或超时；若服务端已完成，Key无法再次显示，请重新授权');if(/^授权交换/.test(e.message))throw e;throw Error('授权交换结果未确认，请检查网络与CORS；服务端成功后的Key只返回一次，必要时重新授权');}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
async function models({fetcher=root.fetch,signal}={}){const r=await fetcher(base+'/gateway/v1/models',{signal,credentials:'omit',redirect:'error'});if(!r.ok)throw Error('模型目录返回HTTP '+r.status);const out=await r.json();if(!Array.isArray(out.data))throw Error('模型目录格式无效');return out.data.filter(m=>typeof m.id==='string'&&m.id.length<160&&Array.isArray(m.supported_protocols)&&m.supported_protocols.includes('openai:chat-completions')).slice(0,400).map(m=>({id:m.id,name:typeof m.name==='string'?m.name.slice(0,160):m.id}));}
const api={appUrl,begin,exchange,models};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.HXTokenPay=api;
})(typeof globalThis!=='undefined'?globalThis:this);
