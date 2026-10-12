import {test} from 'node:test';
import assert from 'node:assert/strict';
import {streamText,tool,stepCountIs,convertToModelMessages} from 'ai';
import {z} from 'zod';
import {createGeminiProvider,safeAIError} from '../ai/gemini.js';

export function fixtureResponse(parts:unknown[],finishReason='STOP') {
 return new Response(`data: ${JSON.stringify({candidates:[{content:{role:'model',parts},finishReason}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:5,totalTokenCount:15}})}\n\n`,{headers:{'Content-Type':'text/event-stream'}});
}
test('Gemini tool continuation, paired saved history, and image MIME survive SDK conversion',async()=>{
 const requests:any[]=[];let call=0;
 const connection=createGeminiProvider({apiKey:'test-fixture-only',fetchImpl:async(_input,init)=>{
  const body=JSON.parse(String(init?.body));requests.push(body);call++;
  if(call===1) return fixtureResponse([{functionCall:{name:'getAttendanceSummary',args:{date:'2026-10-12'}},thoughtSignature:'fixture-signature'}]);
  return fixtureResponse([{text:call===2?'One absent, one female absent.':'No people visible in the fixture.'}]);
 }});
 const tools={getAttendanceSummary:tool({inputSchema:z.object({date:z.string()}),execute:async()=>({absent:1,femaleAbsent:1})})};
 const messages:any[]=[{id:'user-1',role:'user',parts:[{type:'text',text:'Count absentees'}]}];
 const result=streamText({model:connection.model,messages:await convertToModelMessages(messages),tools,stopWhen:stepCountIs(50),maxRetries:0});
 let saved:any[]=[];
 const output=await result.toUIMessageStreamResponse({originalMessages:messages,onFinish:({messages})=>{saved=messages;}}).text();
 assert.ok(output.includes('text-delta'));assert.equal(requests.length,2);
 assert.ok(requests[1].contents.at(-1).parts.some((p:any)=>p.functionResponse));
 assert.equal(requests[1].contents.find((c:any)=>c.role==='model').parts[0].thoughtSignature,'fixture-signature');
 assert.equal(saved.length,2);
 const next=[...JSON.parse(JSON.stringify(saved)),{id:'photo',role:'user',parts:[{type:'text',text:'Are people visible?'},{type:'file',mediaType:'image/png',url:'data:image/png;base64,aGVsbG8='}]}];
 const follow=streamText({model:connection.model,messages:await convertToModelMessages(next),tools,maxRetries:0});
 await follow.toUIMessageStreamResponse().text();
 assert.equal(requests[2].contents.at(-1).role,'user');
 assert.ok(requests[2].contents.at(-1).parts.some((p:any)=>p.inlineData?.mimeType==='image/png'));
 assert.ok(requests[2].contents.some((c:any)=>c.parts.some((p:any)=>p.functionResponse)));
});
test('Quota errors retain 429 without retrying or exposing provider text',async()=>{
 let calls=0;
 const c=createGeminiProvider({apiKey:'test-fixture-only',fetchImpl:async()=>{calls++;return new Response(JSON.stringify({error:{code:429,message:'sensitive-provider-message',status:'RESOURCE_EXHAUSTED'}}),{status:429});}});
 const r=streamText({model:c.model,prompt:'hello',maxRetries:0});
 const output=r.toUIMessageStreamResponse({onError:safeAIError}).text();
 assert.equal((await c.firstResponse).status,429);assert.ok((await output).includes('quota reached'));assert.equal(calls,1);
});
test('Access denial persists through callback and secrets are not echoed',async()=>{
 let denied=0;
 const c=createGeminiProvider({apiKey:'test-fixture-only',onDenied:async()=>{denied++;},fetchImpl:async()=>new Response(JSON.stringify({error:{code:403,message:'sensitive-provider-message',status:'PERMISSION_DENIED'}}),{status:403})});
 const r=streamText({model:c.model,prompt:'hello',maxRetries:0});const output=r.toUIMessageStreamResponse({onError:safeAIError}).text();
 const first=await c.firstResponse;assert.equal(first.status,403);assert.equal(denied,1);assert.ok(!(await output).includes('sensitive-provider-message'));
});