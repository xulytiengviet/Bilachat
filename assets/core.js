/* BilaChat core: pure chat-tree and SSE utilities. MIT. */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined" && module.exports) module.exports=api;
  if(root) root.BilaCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const uid=()=> (typeof crypto!=="undefined"&&crypto.randomUUID ? crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
const stamp=()=>new Date().toISOString();
function newThread(){return {id:uid(),title:"Cuộc trò chuyện mới",createdAt:stamp(),updatedAt:stamp(),selected:null,nodes:[]};}
function addNode(thread,role,content,parentId,extra){
  if(!["user","assistant"].includes(role))throw Error("Invalid role");
  if(parentId!==null&&!thread.nodes.some(n=>n.id===parentId))throw Error("Missing parent");
  const node={id:uid(),parentId:parentId??null,role,content:String(content||""),createdAt:stamp(),trace:[],sources:[],attachments:[],...extra};
  thread.nodes.push(node);thread.selected=node.id;thread.updatedAt=stamp();
  if(role==="user"&&thread.nodes.filter(n=>n.role==="user").length===1)thread.title=content.trim().replace(/\s+/g," ").slice(0,52)||"Cuộc trò chuyện mới";
  return node;
}
function pathTo(thread,id){
  const byId=new Map(thread.nodes.map(n=>[n.id,n]));const result=[];const visited=new Set();let current=id;
  while(current!==null&&current!==undefined){if(visited.has(current))break;visited.add(current);let node=byId.get(current);if(!node)break;result.push(node);current=node.parentId;}
  return result.reverse();
}
function siblings(thread,node){return thread.nodes.filter(n=>n.parentId===node.parentId&&n.role===node.role).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||thread.nodes.indexOf(a)-thread.nodes.indexOf(b));}
function latestLeaf(thread,id){let cur=id;let count=0;while(count++<1000){const children=thread.nodes.filter(n=>n.parentId===cur);if(!children.length)break;cur=children[children.length-1].id;}return cur;}
function normalizeThread(t){
  if(!t||typeof t!=="object"||!Array.isArray(t.nodes))return null;
  const o={id:String(t.id||uid()),title:String(t.title||"Cuộc trò chuyện").slice(0,150),createdAt:String(t.createdAt||stamp()),updatedAt:String(t.updatedAt||stamp()),selected:t.selected?String(t.selected):null,nodes:[]};
  const ids=new Set();
  for(const n of t.nodes.slice(0,1500)){
    if(!n||!["user","assistant"].includes(n.role)||!n.id||ids.has(String(n.id)))continue;
    const id=String(n.id),parentId=n.parentId===null?null:String(n.parentId||"");
    if(parentId!==null&&!ids.has(parentId))continue;
    const limit=150000;
    o.nodes.push({id,parentId,role:n.role,content:String(n.content||"").slice(0,limit),createdAt:String(n.createdAt||stamp()),trace:Array.isArray(n.trace)?n.trace.slice(0,40).map(x=>String(x).slice(0,500)):[],sources:Array.isArray(n.sources)?n.sources.slice(0,10).filter(x=>x&&typeof x==="object").map(x=>({title:String(x.title||"Nguồn").slice(0,150),url:String(x.url||"").slice(0,2048)})):[],attachments:Array.isArray(n.attachments)?n.attachments.slice(0,8).map(x=>({name:String(x.name||"tệp").slice(0,150),type:String(x.type||""),text:String(x.text||"").slice(0,25000),dataUrl:typeof x.dataUrl==="string"&&x.dataUrl.length<=1500000?x.dataUrl:""})):[]});
    ids.add(id);
  }
  if(!ids.has(o.selected))o.selected=o.nodes.length?o.nodes[o.nodes.length-1].id:null;
  return o;
}
function safeUrl(u){try{const x=new URL(u);if(x.protocol==="https:"||x.protocol==="http:")return x.href;}catch(_){/* ignore */}return null;}
function endpoint(input){let u=new URL(String(input||"").trim());if(u.protocol!=="https:"&&!(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname)))throw Error("Endpoint phải dùng HTTPS, trừ localhost.");if(!u.pathname.endsWith("/chat/completions"))u.pathname=u.pathname.replace(/\/$/,"")+"/chat/completions";return u.href;}
function parseSSEFrame(frame){const rows=frame.split(/\r?\n/).filter(l=>l.startsWith("data:")).map(l=>l.slice(5).trimStart());if(!rows.length)return null;const raw=rows.join("\n").trim();if(raw==="[DONE]")return {done:true};try{return {data:JSON.parse(raw)}}catch(_){return null}}
async function* parseSSE(body){
  if(!body||!body.getReader)throw Error("Không có stream phản hồi");
  const reader=body.getReader(),decoder=new TextDecoder();let buf="";
  try{
    for(;;){
      const r=await reader.read();if(r.done)break;
      buf+=decoder.decode(r.value,{stream:true});buf=buf.replace(/\r\n/g,"\n");
      let split;
      while((split=buf.indexOf("\n\n"))!==-1){
        const frame=buf.slice(0,split);buf=buf.slice(split+2);
        const evt=parseSSEFrame(frame);if(evt){yield evt;if(evt.done)return;}
      }
    }
    buf+=decoder.decode();if(buf.trim()){const evt=parseSSEFrame(buf);if(evt)yield evt;}
  }finally{try{reader.releaseLock()}catch(_){}}
}
function requestMessages(thread,userId){
  return pathTo(thread,userId).map(n=>{
    const pieces=n.attachments||[];
    const text=n.content+pieces.filter(a=>a.text).map(a=>"\n\n[Tệp "+a.name+"]\n"+a.text).join("");
    if(n.role==="user"&&pieces.some(a=>a.dataUrl&&a.type.startsWith("image/"))){
      return {role:"user",content:[{type:"text",text},...pieces.filter(a=>a.dataUrl&&a.type.startsWith("image/")).map(a=>({type:"image_url",image_url:{url:a.dataUrl}}))]};
    }
    return {role:n.role,content:text};
  });
}
return Object.freeze({uid,newThread,addNode,pathTo,siblings,latestLeaf,normalizeThread,safeUrl,endpoint,parseSSEFrame,parseSSE,requestMessages});
});