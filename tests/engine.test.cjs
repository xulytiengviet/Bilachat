"use strict";
const assert = require("node:assert/strict");
const Core = require("../assets/core.js");
global.window = global;
global.BilaCore = Core;
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
    {choices:[{index:0,delta:{role:"assistant",reasoning_content:"hidden reasoning"}}]},
    {choices:[{index:0,delta:{},server_tool_event:{type:"call_started",call:{action:{type:"search",queries:["vi"]}}}}]},
    {choices:[{index:0,delta:{content:"Xin chào, "}}]},
    {choices:[{index:0,delta:{},server_tool_event:{type:"call_completed",call:{sources:[{url:"https://example.org/source",title:"Nguồn 1"}]}}}]},
    {choices:[{index:0,delta:{content:"tôi là BilaChat!",annotations:[{type:"url_citation",url_citation:{url:"https://example.org/source",title:"Nguồn 1"}}]},finish_reason:"stop"}]}
  ];
  let tokenEvents=0,toolEvents=0;
  await E.consume(responseFromFrames(frames),assistant,{onToken:()=>tokenEvents++,onTrace:()=>toolEvents++});
  assert.equal(assistant.content,"Xin chào, tôi là BilaChat!");
  assert.equal(assistant.sources.length,1,"Citation deduplication");
  assert.equal(assistant.sources[0].url,"https://example.org/source");
  assert.ok(toolEvents>=1,"Tool event is processed");
  assert.ok(tokenEvents>1,"Tokens are emitted incrementally");
  const ordinary={content:"",sources:[]};
  await E.consume(responseFromFrames([{choices:[{delta:{content:"Đúng Unicode tiếng Việt."}}]}]),ordinary,{});
  assert.equal(ordinary.content,"Đúng Unicode tiếng Việt.");
  const failed=new Response(JSON.stringify({error:{message:"request failed"}}),{status:200,headers:{"content-type":"application/json"}});
  await assert.rejects(()=>E.consume(failed,{content:"",sources:[]},{}),/request failed/);
  console.log("BilaChat DeepSeek SSE regression tests passed");
}
main().catch(e=>{console.error(e);process.exitCode=1;});