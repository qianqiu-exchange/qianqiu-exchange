(function(root){
'use strict';
function profile(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('连接配置必须是JSON对象');
 const allowed=['version','provider','endpoint','model','protocol','name','appUrl'];for(const k of Object.keys(raw))if(!allowed.includes(k))throw Error('可导入配置只接受公开连接字段，不接受Key、脚本或其他数据');
 if(raw.version!==1||!['direct','tokenpay'].includes(raw.provider)||raw.protocol!=='chat-completions'||typeof raw.endpoint!=='string'||raw.endpoint.length>1500||typeof raw.model!=='string'||!raw.model.trim()||raw.model.length>160)throw Error('连接配置格式无效');
 let u;try{u=new URL(raw.endpoint);}catch(e){throw Error('接口地址无效');}
 if(u.username||u.password||u.search||u.hash||!(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname))))throw Error('只接受无查询参数的HTTPS或本机HTTP端点');
 let appUrl;if(raw.appUrl!=null){let app;try{app=new URL(raw.appUrl);}catch(e){throw Error('App URL无效');}if(!['https:','http:','app:'].includes(app.protocol)||app.username||app.password||app.search||app.hash)throw Error('App URL须为不含敏感参数的稳定地址');appUrl=app.href;}
 return {version:1,provider:raw.provider,protocol:'chat-completions',endpoint:u.href,model:raw.model.trim(),name:typeof raw.name==='string'?raw.name.slice(0,80):'',...(appUrl?{appUrl}:{})};
}
const api={profile};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.HXConnections=api;
})(typeof globalThis!=='undefined'?globalThis:this);
