/* BilaChat 2.0 · UI and local storage */
(function(){
"use strict";
const C=window.BilaCore,E=window.BilaEngine,CV=window.CVNSSConverter;
if(!C||!E){document.body.textContent="Không tải được BilaChat core/engine.";return;}
const $=id=>document.getElementById(id);
const K_THREADS="bilachat_v2_threads",K_SETTINGS="bilachat_v2_settings",K_CURRENT="bilachat_v2_current",K_API="bilachat_v2_api_key",K_SEARCH="bilachat_v2_search_key";
const defaults={provider:"deepseek",url:"https://api.deepseek.com/chat/completions",model:"deepseek-flash",temperature:0.7,maxTokens:4096,rememberKey:false,readerConsent:false,theme:"light",locale:"vi"};
const words={
vi:{newChat:"Cuộc trò chuyện mới",searchChats:"Tìm cuộc trò chuyện...",recent:"Gần đây",export:"Xuất dữ liệu ZIP",import:"Nhập dữ liệu ZIP",settings:"Cài đặt & API",notConnected:"Chưa cấu hình",greeting:"Hôm nay bạn cần BilaChat giúp gì?",tagline:"Trò chuyện với AI bằng tiếng Việt · CVNSS4.0 xử lý · Unicode hiển thị",prompt1:"Giải thích CVNSS4.0",prompt2:"Viết mã Python",prompt3:"Phân tích kiến trúc AI",prompt4:"Soạn thảo nội dung",compose:"Nhắn tin cho BilaChat...",attach:"Đính kèm",thinking:"Suy nghĩ sâu",webSearch:"Tìm kiếm",voice:"Giọng nói",disclaimer:"BilaChat có thể mắc lỗi. Hãy kiểm tra những thông tin quan trọng.",settingsTitle:"Cài đặt BilaChat",settingsSubtitle:"API thuộc quyền kiểm soát của bạn, không lưu trên GitHub.",configured:"Đã nhập khóa",processing:"Đang xử lý",done:"Hoàn tất",thinkingTitle:"Nhật ký xử lý · CVNSS4.0",sources:"Nguồn tham khảo",edit:"Sửa câu hỏi",regenerate:"Tạo lại",copy:"Sao chép",speak:"Đọc to"},
en:{newChat:"New chat",searchChats:"Search chats...",recent:"Recent",export:"Export ZIP",import:"Import ZIP",settings:"Settings & API",notConnected:"Not configured",greeting:"How can BilaChat help today?",tagline:"Vietnamese AI · CVNSS4.0 processing · Unicode responses",prompt1:"Explore CVNSS4.0",prompt2:"Write Python code",prompt3:"Analyze AI architecture",prompt4:"Draft a message",compose:"Message BilaChat...",attach:"Attach",thinking:"Deep think",webSearch:"Search",voice:"Voice",disclaimer:"BilaChat can make mistakes. Verify important information.",settingsTitle:"BilaChat Settings",settingsSubtitle:"Your API, your control. No credentials on GitHub.",configured:"Key entered",processing:"Generating",done:"Done",thinkingTitle:"Processing trace · CVNSS4.0",sources:"References",edit:"Edit",regenerate:"Regenerate",copy:"Copy",speak:"Read aloud"},
zh:{newChat:"新对话",searchChats:"搜索对话...",recent:"最近",export:"导出 ZIP",import:"导入 ZIP",settings:"设置与 API",notConnected:"未配置",greeting:"今天需要 BilaChat 帮什么？",tagline:"越南语 AI · CVNSS4.0 处理 · Unicode 回答",prompt1:"了解 CVNSS4.0",prompt2:"编写 Python",prompt3:"分析 AI 架构",prompt4:"撰写内容",compose:"发送消息给 BilaChat...",attach:"附件",thinking:"深度思考",webSearch:"搜索",voice:"语音",disclaimer:"BilaChat 可能出错，请核实重要信息。",settingsTitle:"BilaChat 设置",settingsSubtitle:"API 由您控制，不保存在 GitHub。",configured:"已输入密钥",processing:"处理中",done:"已完成",thinkingTitle:"处理日志 · CVNSS4.0",sources:"参考来源",edit:"编辑",regenerate:"重新生成",copy:"复制",speak:"朗读"}};
function parse(v,f){try{return JSON.parse(v)||f}catch(_){return f}}
let settings=Object.assign({},defaults,parse(localStorage.getItem(K_SETTINGS),{}));
let apiKey=(settings.rememberKey?localStorage.getItem(K_API):sessionStorage.getItem(K_API))||"";
let searchKey=sessionStorage.getItem(K_SEARCH)||"";
let threads=(parse(localStorage.getItem(K_THREADS),[])||[]).map(C.normalizeThread).filter(Boolean);
let currentId=localStorage.getItem(K_CURRENT)||null;
let attached=[],thinking=false,searching=false,busy=false,controller=null,recognition=null,micStream=null,micCtx=null,micFrame=null;
const t=k=>(words[settings.locale]||words.vi)[k]||words.vi[k]||k;
const nodeEl=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
function toast(message){const el=$("toast");el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,4600);}
function store(){try{localStorage.setItem(K_THREADS,JSON.stringify(threads));localStorage.setItem(K_CURRENT,currentId||"");}catch(_){toast("Bộ nhớ đầy. Hãy xuất ZIP và xóa các tệp lớn.");}}
function storeSettings(){localStorage.setItem(K_SETTINGS,JSON.stringify(settings));if(settings.rememberKey){localStorage.setItem(K_API,apiKey);sessionStorage.removeItem(K_API)}else{sessionStorage.setItem(K_API,apiKey);localStorage.removeItem(K_API)}sessionStorage.setItem(K_SEARCH,searchKey);}
function current(){return threads.find(x=>x.id===currentId)||null;}
function getThread(){let x=current();if(!x){x=C.newThread();threads.unshift(x);currentId=x.id;store();}return x;}
function appearance(){document.body.classList.toggle("dark",settings.theme==="dark");document.documentElement.lang=settings.locale;document.querySelectorAll("[data-i18n]").forEach(x=>x.textContent=t(x.dataset.i18n));document.querySelectorAll("[data-i18n-placeholder]").forEach(x=>x.placeholder=t(x.dataset.i18nPlaceholder));$("modelLabel").textContent=settings.model||"BilaChat";$("connectionState").textContent="● "+(apiKey?t("configured"):t("notConnected"));$("connectionState").classList.toggle("ok",!!apiKey);}
function closeNav(){$("shell").classList.remove("sidebar-open");}
function action(label,icon,handler){const b=nodeEl("button","",icon);b.title=label;b.setAttribute("aria-label",label);b.onclick=handler;return b;}
function sidebar(){
 const box=$("chatList");box.replaceChildren();const q=$("filterChats").value.trim().toLowerCase();
 const list=threads.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).filter(x=>!q||(x.title+" "+x.nodes.map(n=>n.content).join(" ")).toLowerCase().includes(q));
 for(const th of list){
  const row=nodeEl("div","thread-row"+(th.id===currentId?" active":""));const b=nodeEl("button","thread-title",th.title);b.title=th.title;
  b.onclick=()=>{if(busy)return toast("Vui lòng dừng phản hồi hiện tại.");currentId=th.id;store();render();closeNav();};
  const more=action("Đổi tên hoặc xóa","⋯",()=>{const op=prompt("1: Đổi tên\n2: Xóa cuộc trò chuyện","1");if(op==="1"){const v=prompt("Tên cuộc trò chuyện:",th.title);if(v&&v.trim()){th.title=v.trim().slice(0,150);th.updatedAt=new Date().toISOString();store();sidebar();}}if(op==="2"&&confirm("Xóa cuộc trò chuyện? Không thể hoàn tác.")){threads=threads.filter(x=>x.id!==th.id);if(currentId===th.id)currentId=threads[0]?.id||null;store();render();}});
  more.className="thread-more";row.append(b,more);box.append(row);
 }
}
function encodeTrace(trace){if(!CV)return trace.join("\n");return trace.map(x=>{try{return CV.fromCqn(x.normalize("NFC")).cvss;}catch(_){return x;}}).join("\n");}
function renderMd(text,el){
 el.replaceChildren();if(!window.marked||!window.DOMPurify){el.textContent=text;return;}
 try{
  el.innerHTML=window.DOMPurify.sanitize(window.marked.parse(text||"",{gfm:true,breaks:true}),{USE_PROFILES:{html:true}});
  el.querySelectorAll("a").forEach(x=>{const u=C.safeUrl(x.href);if(!u){x.removeAttribute("href");return;}x.href=u;x.target="_blank";x.rel="noopener noreferrer nofollow";});
  if(window.hljs)el.querySelectorAll("pre code").forEach(x=>{if(!x.classList.contains("language-mermaid"))try{window.hljs.highlightElement(x);}catch(_){}});
  if(window.renderMathInElement)try{window.renderMathInElement(el,{delimiters:[{left:"$$",right:"$$",display:true},{left:"\\(",right:"\\)",display:false},{left:"\\[",right:"\\]",display:true},{left:"$",right:"$",display:false}],throwOnError:false});}catch(_){}
  const mer=Array.from(el.querySelectorAll("code.language-mermaid"));
  if(window.mermaid&&mer.length){mer.forEach(c=>c.parentElement.replaceWith(nodeEl("div","mermaid",c.textContent)));window.mermaid.initialize({startOnLoad:false,securityLevel:"strict",theme:settings.theme==="dark"?"dark":"default"});window.mermaid.run({nodes:Array.from(el.querySelectorAll(".mermaid"))}).catch(()=>{});}
 }catch(_){el.textContent=text;}
}
function showMessage(th,node){
 const row=nodeEl("article","message "+node.role);row.dataset.nodeId=node.id;
 const avatar=nodeEl("div","avatar",node.role==="user"?"U":"B"),content=nodeEl("div","message-content");
 if(node.role==="user"){
  if(node.attachments?.length){const list=nodeEl("div","message-attachments");for(const a of node.attachments)list.append(nodeEl("span","attach-tag","▧ "+a.name));content.append(list);}
  content.append(nodeEl("div","bubble-user",node.content));
 }else{
  if(node.trace?.length){const box=nodeEl("details","reason-box");box.open=busy&&th.selected===node.id;
   box.append(nodeEl("summary","", "✧ "+t("thinkingTitle")+" · "+(busy&&th.selected===node.id?t("processing"):t("done"))));
   box.append(nodeEl("pre","reason-content",encodeTrace(node.trace)));
   box.append(nodeEl("div","reason-note","Chỉ hiển thị nhật ký thao tác công khai được mã hóa, không phải suy luận nội bộ của mô hình."));
   content.append(box);}
  const answer=nodeEl("div","answer-content");if(busy&&th.selected===node.id){answer.textContent=node.content;answer.append(nodeEl("span","cursor"));}else renderMd(node.content,answer);content.append(answer);
  if(node.sources?.length){const box=nodeEl("div","sources");box.append(nodeEl("strong","",t("sources")));for(const source of node.sources){const u=C.safeUrl(source.url);if(!u)continue;const a=nodeEl("a","source-link",source.title);a.href=u;a.target="_blank";a.rel="noopener noreferrer nofollow";box.append(a);}content.append(box);}
 }
 const tools=nodeEl("div","message-actions");const sib=C.siblings(th,node);const idx=sib.findIndex(x=>x.id===node.id);
 if(sib.length>1){tools.append(action("Nhánh trước","‹",()=>branch(sib[(idx+sib.length-1)%sib.length].id)));tools.append(nodeEl("span","branch-indicator",(idx+1)+" / "+sib.length));tools.append(action("Nhánh sau","›",()=>branch(sib[(idx+1)%sib.length].id)));}
 if(node.role==="user")tools.append(action(t("edit"),"✎",()=>edit(node.id)));
 else{
  tools.append(action(t("copy"),"⧉",()=>navigator.clipboard.writeText(node.content).then(()=>toast("Đã sao chép")).catch(()=>toast("Sao chép thất bại."))));
  tools.append(action(t("regenerate"),"↻",()=>regenerate(node.id)));
  tools.append(action(t("speak"),"♫",()=>speak(node.content)));
 }
 content.append(tools);row.append(avatar,content);return row;
}
function messages(){
 const th=current(),path=th?.selected?C.pathTo(th,th.selected):[];const box=$("messages");box.replaceChildren();$("emptyView").hidden=path.length>0;box.hidden=path.length===0;
 for(const node of path)box.append(showMessage(th,node));
}
function updateFiles(){const div=$("attachments");div.replaceChildren();div.hidden=!attached.length;attached.forEach((a,i)=>{const item=nodeEl("div","attachment-item");item.append(nodeEl("span","",a.name+" · "+Math.ceil(a.size/1024)+" KB"));item.append(action("Xóa tệp","×",()=>{attached.splice(i,1);updateFiles();}));div.append(item);});}
function scrollBottom(force){const x=$("chatScroll");if(force||x.scrollHeight-x.scrollTop-x.clientHeight<190)x.scrollTop=x.scrollHeight;}
function render(){sidebar();messages();updateFiles();appearance();scrollBottom(true);}
function branch(id){if(busy)return;const th=current();th.selected=C.latestLeaf(th,id);store();render();}
function edit(id){if(busy)return;const th=current(),n=th.nodes.find(x=>x.id===id);if(!n)return;const val=prompt(t("edit"),n.content);if(val!==null&&val.trim()&&val!==n.content)send(val,{parentId:n.parentId,attachments:n.attachments,editing:true});}
function regenerate(id){if(busy)return;const th=current(),n=th.nodes.find(x=>x.id===id);if(n?.role==="assistant")generate(th,n.parentId);}
function newChat(){if(busy)return toast("Vui lòng dừng phản hồi trước.");const th=C.newThread();threads.unshift(th);currentId=th.id;store();render();closeNav();$("promptInput").focus();}
function showStreaming(n){const card=document.querySelector('[data-node-id="'+n.id+'"]');if(!card)return;const el=card.querySelector(".answer-content");if(el){el.textContent=n.content;el.append(nodeEl("span","cursor"));}scrollBottom(false);}
function showTrace(n){const card=document.querySelector('[data-node-id="'+n.id+'"]');const pre=card?.querySelector(".reason-content");if(pre)pre.textContent=encodeTrace(n.trace);}
async function generate(th,userId){
 if(busy)return;
 const n=C.addNode(th,"assistant","",userId,{trace:thinking?["Đã tiếp nhận câu hỏi Unicode và tạo yêu cầu xử lý."]:[],sources:[]});
 busy=true;controller=new AbortController();$("sendBtn").hidden=true;$("stopBtn").hidden=false;render();
 const timer=setTimeout(()=>controller?.abort(),150000);
 try{
  await E.generate(th,userId,n,{settings:Object.assign({},settings),apiKey,searchKey,thinking,searching,readerConsent:settings.readerConsent,signal:controller.signal,onTrace:s=>{if(thinking){n.trace.push(s);showTrace(n);}},onToken:()=>showStreaming(n),onWarning:toast});
 }catch(e){
  if(e.name==="AbortError"){if(!n.content)n.content="Đã dừng tạo phản hồi.";if(thinking)n.trace.push("Yêu cầu dừng hoặc đã quá thời gian.");}
  else{if(thinking)n.trace.push("Lỗi: "+String(e.message).slice(0,120));n.content=(n.content?n.content+"\n\n":"")+"⚠ Không thể hoàn thành yêu cầu.\n\n"+String(e.message||e).slice(0,620);}
 }finally{clearTimeout(timer);controller=null;busy=false;$("sendBtn").hidden=false;$("stopBtn").hidden=true;store();render();}
}
function send(text,opts){
 if(busy)return;const val=String(text||"").trim();if(!val)return;const th=getThread();
 const parent=opts&&Object.prototype.hasOwnProperty.call(opts,"parentId")?opts.parentId:th.selected;
 const files=(opts?.attachments||attached).map(a=>({name:a.name,type:a.type,text:a.text||"",dataUrl:a.dataUrl||""}));
 const n=C.addNode(th,"user",val,parent,{attachments:files});
 if(!opts?.editing){attached=[];$("promptInput").value="";resize();}
 store();render();generate(th,n.id);
}
function resize(){const x=$("promptInput");x.style.height="auto";x.style.height=Math.min(180,Math.max(43,x.scrollHeight))+"px";$("countHint").textContent=x.value.length>300?x.value.length+" ký tự":"";}
async function attach(files){for(const f of Array.from(files||[]).slice(0,8)){try{attached.push(await E.readAttachment(f));}catch(e){toast(f.name+": "+e.message);}}updateFiles();$("fileInput").value="";}
function formValues(){return{provider:$("provider").value,url:$("apiUrl").value.trim(),model:$("modelId").value.trim(),temperature:Number($("temperature").value),maxTokens:Number($("maxTokens").value),rememberKey:$("rememberKey").checked,readerConsent:$("readerConsent").checked,theme:$("themeSelect").value,locale:$("localeSelect").value};}
function openSettings(){
 for(const [id,val] of Object.entries({provider:settings.provider,apiUrl:settings.url,modelId:settings.model,apiKey,temperature:settings.temperature,maxTokens:settings.maxTokens,searchKey,themeSelect:settings.theme,localeSelect:settings.locale}))$(id).value=val;
 $("rememberKey").checked=!!settings.rememberKey;$("readerConsent").checked=!!settings.readerConsent;$("testResult").textContent="";$("settingsDialog").showModal();closeNav();
}
function saveForm(e){
 e.preventDefault();try{const v=formValues();v.url=C.endpoint(v.url);if(!v.model)throw Error("Model ID không được trống.");settings=Object.assign({},settings,v);apiKey=$("apiKey").value.trim();searchKey=$("searchKey").value.trim();storeSettings();$("settingsDialog").close();render();toast("Đã lưu cài đặt trong trình duyệt.");}catch(e){$("testResult").textContent=e.message;}
}
async function testApi(){
 const old=settings,key=apiKey;
 const result=$("testResult"),ac=new AbortController();
 const timeout=setTimeout(()=>ac.abort(),18000);
 try{
  settings=Object.assign({},settings,formValues());apiKey=$("apiKey").value.trim();
  settings.url=C.endpoint(settings.url);
  if(!apiKey)throw Error("Chưa nhập API key.");
  result.textContent="Đang kiểm tra khóa, số dư và model ...";
  let balanceInfo="";
  const official=settings.provider==="deepseek"&&new URL(settings.url).hostname==="api.deepseek.com";
  if(official){
   try{
    const r=await fetch("https://api.deepseek.com/user/balance",{method:"GET",headers:{"Authorization":"Bearer "+apiKey},cache:"no-store",signal:ac.signal});
    if(r.ok){
     const j=await r.json();
     const balances=(j.balance_infos||[]).map(x=>x.total_balance+" "+x.currency).join(", ");
     balanceInfo="Số dư API: "+(j.is_available?"khả dụng":"không đủ")+(balances?" ("+balances+")":"")+". ";
    }else balanceInfo="Kiểm tra số dư: HTTP "+r.status+". ";
   }catch(e){if(e.name==="AbortError")throw e;balanceInfo="Không đọc được số dư (CORS/mạng). ";}
  }
  const r=await E.post({model:settings.model,messages:[{role:"user",content:"Chỉ trả lời OK bằng tiếng Việt."}],stream:false,max_tokens:40,thinking:{type:"disabled"}},{settings,apiKey,signal:ac.signal});
  const response=await r.json();
  if(response.error)throw Error(response.error.message||"API trả về lỗi.");
  const message=String(response.choices?.[0]?.message?.content||"");
  if(!message.trim())throw Error("API trả về HTTP 200 nhưng câu trả lời trống.");
  result.textContent="✓ "+balanceInfo+"API và model phản hồi thành công: "+message.slice(0,100);
 }catch(e){
  const hint=e.status===401?" Khóa không hợp lệ hoặc đã thu hồi.":e.status===402?" Tài khoản không đủ số dư.":e.status===429?" Đang vượt giới hạn truy cập.":"";
  result.textContent="✗ "+String(e.message).slice(0,240)+hint;
 }finally{clearTimeout(timeout);settings=old;apiKey=key;}
}
async function exportZip(){
 if(!window.JSZip)return toast("Không thể tải JSZip.");const z=new JSZip();z.file("chats.json",JSON.stringify({schema:2,exportedAt:new Date().toISOString(),conversations:threads},null,2));z.file("README.txt","BilaChat 2.0. Contains conversation history only. No API keys or settings are included.");
 const blob=await z.generateAsync({type:"blob",compression:"DEFLATE"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download="BilaChat_"+new Date().toISOString().slice(0,10)+".zip";a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);toast("Đã xuất ZIP, không kèm API key.");
}
async function importZip(file){
 if(!file||file.size>15*1024*1024)return toast("ZIP cần nhỏ hơn 15 MB.");
 try{if(!window.JSZip)throw Error("JSZip chưa tải.");const z=await JSZip.loadAsync(file),item=z.file("chats.json");if(!item)throw Error("Không có chats.json.");const raw=await item.async("string");if(raw.length>18000000)throw Error("ZIP giải nén quá lớn.");const obj=JSON.parse(raw);if(!Array.isArray(obj.conversations))throw Error("Sai định dạng hội thoại.");
 let count=0;for(const data of obj.conversations.slice(0,250)){const th=C.normalizeThread(data);if(!th)continue;if(threads.some(x=>x.id===th.id))th.id=C.uid();threads.push(th);count++;}store();render();toast("Đã nhập "+count+" cuộc trò chuyện.");
 }catch(e){toast("Nhập ZIP thất bại: "+e.message);}
}
function speak(text){
 if(!window.speechSynthesis)return toast("Trình duyệt không hỗ trợ TTS.");speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(String(text).replace(/[*#_~>|]/g," ").slice(0,6000));u.lang="vi-VN";const v=speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith("vi"));if(v)u.voice=v;
 u.onstart=()=>{toast("Đang đọc: hiệu ứng thanh âm minh họa, không phải phổ đo từ TTS.");const cv=$("waveform"),g=cv.getContext("2d");cv.hidden=false;let tick=0;const animate=()=>{if(!speechSynthesis.speaking||recognition){cv.hidden=true;return;}tick++;g.clearRect(0,0,cv.width,cv.height);g.fillStyle=settings.theme==="dark"?"#eee":"#222";for(let i=0;i<22;i++){const h=3+14*(0.5+0.5*Math.sin(tick*.21+i*.75));g.fillRect(i*4,14-h/2,2,h);}requestAnimationFrame(animate);};animate();};
 u.onend=u.onerror=()=>{if(!recognition)$("waveform").hidden=true;};speechSynthesis.speak(u);
}
function stopMic(){
 if(recognition){try{recognition.stop()}catch(_){}recognition=null;}
 if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null;}
 if(micCtx){micCtx.close().catch(()=>{});micCtx=null;}if(micFrame)cancelAnimationFrame(micFrame);micFrame=null;
 $("waveform").hidden=true;$("micBtn").classList.remove("active");
}
async function voice(){
 const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Rec)return toast("SpeechRecognition không được hỗ trợ trên trình duyệt này.");
 if(recognition){stopMic();return;}
 const r=new Rec();recognition=r;r.lang="vi-VN";r.continuous=false;r.interimResults=true;
 r.onresult=e=>{let fin="",preview="";for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)fin+=e.results[i][0].transcript;else preview+=e.results[i][0].transcript;}if(fin){$("promptInput").value=($("promptInput").value+" "+fin).trim();resize();}else if(preview)$("countHint").textContent="🎙 "+preview.slice(0,25);};
 r.onerror=e=>{toast("Microphone: "+e.error);stopMic();};r.onend=()=>{recognition=null;stopMic();};
 try{
  r.start();$("micBtn").classList.add("active");
  if(navigator.mediaDevices?.getUserMedia){micStream=await navigator.mediaDevices.getUserMedia({audio:true});micCtx=new (window.AudioContext||window.webkitAudioContext)();const s=micCtx.createMediaStreamSource(micStream),analyser=micCtx.createAnalyser();analyser.fftSize=256;s.connect(analyser);
   const cv=$("waveform"),g=cv.getContext("2d"),data=new Uint8Array(analyser.frequencyBinCount);cv.hidden=false;
   const draw=()=>{if(!micStream)return;micFrame=requestAnimationFrame(draw);analyser.getByteFrequencyData(data);g.clearRect(0,0,cv.width,cv.height);g.fillStyle=settings.theme==="dark"?"#eaeaea":"#232323";for(let i=0;i<22;i++){const h=Math.max(2,data[i*4]/255*26);g.fillRect(i*4,14-h/2,2,h);}};draw();
  }
 }catch(e){toast("Không mở được microphone: "+e.message);stopMic();}
}
function wire(){
 $("newChat").onclick=newChat;$("topNew").onclick=newChat;$("settingsBtn").onclick=openSettings;$("topSettings").onclick=openSettings;$("modelLabel").onclick=openSettings;
 $("openSidebar").onclick=()=>$("shell").classList.add("sidebar-open");$("closeSidebar").onclick=closeNav;$("scrim").onclick=closeNav;
 $("filterChats").oninput=sidebar;$("promptInput").oninput=resize;$("promptInput").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();send($("promptInput").value);}};
 $("sendBtn").onclick=()=>send($("promptInput").value);$("stopBtn").onclick=()=>controller?.abort();
 $("thinkBtn").onclick=()=>{thinking=!thinking;$("thinkBtn").classList.toggle("active",thinking);$("thinkBtn").setAttribute("aria-pressed",String(thinking));};
 $("searchBtn").onclick=()=>{searching=!searching;$("searchBtn").classList.toggle("active",searching);$("searchBtn").setAttribute("aria-pressed",String(searching));if(searching&&!searchKey)toast("Tìm kiếm trực tiếp cần Tavily key trong Cài đặt.");};
 $("micBtn").onclick=voice;$("fileInput").onchange=e=>attach(e.target.files);
 $("dropZone").ondragover=e=>{e.preventDefault();$("dropZone").classList.add("dragging");};$("dropZone").ondragleave=()=>$("dropZone").classList.remove("dragging");$("dropZone").ondrop=e=>{e.preventDefault();$("dropZone").classList.remove("dragging");attach(e.dataTransfer.files);};
 $("promptInput").onpaste=e=>{const files=Array.from(e.clipboardData?.files||[]);if(files.length){e.preventDefault();attach(files);}};
 document.querySelectorAll(".suggestion").forEach(b=>b.onclick=()=>send(b.dataset.prompt));
 $("settingsForm").onsubmit=saveForm;$("provider").onchange=()=>{const m={deepseek:["https://api.deepseek.com/chat/completions","deepseek-flash"],openrouter:["https://openrouter.ai/api/v1/chat/completions","deepseek/deepseek-chat"],openai:["https://api.openai.com/v1/chat/completions","gpt-4.1-mini"]}[$("provider").value];if(m){$("apiUrl").value=m[0];$("modelId").value=m[1];}};
 $("testApi").onclick=testApi;$("toggleKey").onclick=()=>{const x=$("apiKey");x.type=x.type==="password"?"text":"password";$("toggleKey").textContent=x.type==="password"?"Hiện":"Ẩn";};
 $("exportBtn").onclick=exportZip;$("importBtn").onclick=()=>$("zipInput").click();$("zipInput").onchange=e=>{importZip(e.target.files[0]);e.target.value="";};
 document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();newChat();}if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="f"){e.preventDefault();$("shell").classList.add("sidebar-open");$("filterChats").focus();}if(e.key==="Escape")closeNav();});
 window.addEventListener("storage",e=>{if(e.key===K_THREADS&&!busy){threads=(parse(e.newValue,[])||[]).map(C.normalizeThread).filter(Boolean);render();}});
}
wire();render();
if(CV){try{if(!CV.selfTest().ok)toast("Cảnh báo: CVNSS4.0 selfTest chưa đạt.");}catch(e){toast("CVNSS4.0 lỗi: "+e.message);}}else toast("Không tải được CVNSS4.0, nhật ký sẽ dùng Unicode.");
})();