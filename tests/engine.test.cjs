"use strict";
const assert = require("node:assert/strict");
const Core = require("../assets/core.js");
global.window = global;
global.BilaCore = Core;
global.CVNSSConverter = require("../assets/cvnss-converter.js");
require("../assets/engine.js");
const E = global.BilaEngine;
const thread=Core.newThread();
const question=Core.addNode(thread,"user","Xin chào, hãy trả lời bằng tiếng Việt.",null);
const opts={settings:{provider:"deepseek",model:"deepseek-flash",maxTokens:4096,temperature:0.7},thinking:true,searching:true,readerConsent:false};
const payload=E.requestPayload(thread,question.id,opts.settings,true,[],opts);
assert.equal(payload.model,"deepseek-flash");
assert.equal(payload.thinking.type,"enabled");
assert.equal(payload.tools[0].type,"deepseek_web_search");
assert.equal(payload.safety_check.level,"high");
assert.equal(payload.stream,true);
assert.equal(E.requestPayload(thread,question.id,opts.settings,false,[],opts).thinking.type,"disabled");
function responseFromFrames(frames){
  const encoder=new TextEncoder();
  return new Response(new ReadableStream({start(c){
    for(const frame of frames)c.enqueue(encoder.encode("data: "+JSON.stringify(frame)+"\n\n"));
    c.enqueue(encoder.encode("data: [DONE]\n\n"));c.close();
  }}),{status:200,headers:{"content-type":"text/event-stream"}});
}
async function main(){
  const assistant={content:"",sources:[]},frames=[
    {choices:[{index:0,delta:{role:"assistant",reasoning_content:"Phâ"}}]},
    {choices:[{index:0,delta:{reasoning_content:"n tích câu hỏi tiếng Việt. "}}]},
    {choices:[{index:0,delta:{},server_tool_event:{type:"call_started",call:{action:{type:"search",queries:["vi"]}}}}]},
    {choices:[{index:0,delta:{content:"Xin chào, "}}]},
    {choices:[{index:0,delta:{},server_tool_event:{type:"call_completed",call:{sources:[{url:"https://example.org/source",title:"Nguồn 1"}]}}}]},
    {choices:[{index:0,delta:{content:"tôi là BilaChat!",annotations:[{type:"url_citation",url_citation:{url:"https://example.org/source",title:"Nguồn 1"}}]},finish_reason:"stop"}]}
  ];
  let tokenEvents=0,toolEvents=0;
  await E.consume(responseFromFrames(frames),assistant,{onToken:()=>tokenEvents++,onTrace:()=>toolEvents++});
  assert.equal(assistant.content,"Xin chào, tôi là BilaChat!");
  assert.equal(assistant.reasoningReceived,true,"The API provided its own reasoning_content");
  const expectedCvss=global.CVNSSConverter.fromCqn("Phân tích câu hỏi tiếng Việt. ").cvss;
  assert.equal(assistant.reasoningCvss,expectedCvss,"Vietnamese reasoning must be converted after split chunks");
  assert.notEqual(assistant.reasoningCvss,"Phân tích câu hỏi tiếng Việt. ","CVNSS must not be Unicode original");
  assert.ok(!JSON.stringify(assistant).includes("Phân tích câu hỏi tiếng Việt."),"Raw provider reasoning must not be persisted in the chat object");
  assert.equal(assistant.sources.length,1,"Citation deduplication");
  assert.equal(assistant.sources[0].url,"https://example.org/source");
  assert.ok(toolEvents>=1,"Tool event is processed");
  assert.ok(tokenEvents>1,"Tokens are emitted incrementally");
  const ordinary={content:"",sources:[]};
  await E.consume(responseFromFrames([{choices:[{delta:{content:"Đúng Unicode tiếng Việt."}}]}]),ordinary,{});
  assert.equal(ordinary.content,"Đúng Unicode tiếng Việt.");
  assert.equal(ordinary.reasoningReceived,false);
  assert.equal(ordinary.reasoningCvss,"");
  const failed=new Response(JSON.stringify({error:{message:"request failed"}}),{status:200,headers:{"content-type":"application/json"}});
  await assert.rejects(()=>E.consume(failed,{content:"",sources:[]},{}),/request failed/);
  const nonStream=new Response(JSON.stringify({choices:[{message:{reasoning_content:"Đang kiểm tra dữ liệu.",content:"Câu trả lời Unicode."}}]}),{status:200,headers:{"content-type":"application/json"}});
  const oneShot={content:"",sources:[]};
  await E.consume(nonStream,oneShot,{});
  assert.equal(oneShot.content,"Câu trả lời Unicode.");
  assert.equal(oneShot.reasoningCvss,global.CVNSSConverter.fromCqn("Đang kiểm tra dữ liệu.").cvss);
  const th=Core.newThread(),user=Core.addNode(th,"user","Test",null);
  const node=Core.addNode(th,"assistant","Câu trả lời Unicode.",user.id,{reasoningCvss:expectedCvss,reasoningReceived:true,thinkingRequested:true});
  const saved=Core.normalizeThread(JSON.parse(JSON.stringify(th))).nodes.find(n=>n.id===node.id);
  assert.equal(saved.reasoningCvss,expectedCvss);
  assert.equal(saved.thinkingRequested,true);
  console.log("BilaChat DeepSeek reasoning→CVNSS and Unicode response tests passed");
}
main().catch(e=>{console.error(e);process.exitCode=1;});