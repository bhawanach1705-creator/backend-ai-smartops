import {createGeminiProvider, safeAIError} from './gemini.ts';
import {streamText,convertToModelMessages,validateUIMessages,stepCountIs,generateId} from 'ai';
import Conversation from '../models/AIConversation.js';
import GatewayState from '../models/AIGatewayState.js';
import AuditLog from '../models/AuditLog.js';
import {createTools} from './tools.js';
export async function chat(req,res,next) {
 let locked=false;
 let response;
 try {
  const key=process.env.GEMINI_API_KEY;
  if(!key) return res.status(503).json({message:'AI is not configured. Set GEMINI_API_KEY on the server (Google AI Studio).'});
  const blocked=await GatewayState.findById('gemini').lean();
  if(blocked?.blocked) return res.status(blocked.status||403).json({message:blocked.message});
  const incoming=req.body?.messages;
  if(!Array.isArray(incoming)||!incoming.length) return res.status(400).json({message:'A user message is required'});
  const last=incoming.at(-1);
  if(last.role!=='user') return res.status(400).json({message:'Last message must be user input'});
  for(const p of last.parts||[]) {
   if(p.type==='file' && (!['image/png','image/jpeg','image/webp'].includes(p.mediaType)||!p.url?.startsWith(`data:${p.mediaType};base64,`)||p.url.length>7_000_000)) return res.status(400).json({message:'Upload JPG, PNG or WebP, at most 5 MB.'});
   if(!['text','file'].includes(p.type)) return res.status(400).json({message:'Unsupported input part'});
  }
  await Conversation.updateOne({user:req.user._id},{$setOnInsert:{messages:[],busy:false}},{upsert:true});
  const conversation=await Conversation.findOneAndUpdate({user:req.user._id,busy:false},{$set:{busy:true}},{new:true});
  if(!conversation) return res.status(409).json({message:'Another response is active. Wait for it to finish.'});
  locked=true;
  const tools=await createTools(req.user);
  const prior=conversation.messages.map(m=>({id:m.id||generateId(),role:m.role,parts:m.parts.map(p=>{const part={...p};for(const k of ["title","rawInput","errorText","providerExecuted","preliminary","providerMetadata","callProviderMetadata","resultProviderMetadata"])if(part[k]===null)delete part[k];return part;})}));
  const originalMessages=await validateUIMessages({messages:[...prior,last],tools});
  if(JSON.stringify(originalMessages).length>12_000_000) return res.status(413).json({message:"Saved conversation is too large. Export and clear it before continuing."});
  if(originalMessages.length>300) return res.status(413).json({message:'Conversation is full. Export or clear history before continuing.'});
  await Conversation.updateOne({user:req.user._id},{$set:{messages:originalMessages}});
  const abort=new AbortController(); res.on('close',()=>{if(!res.writableEnded) abort.abort();});
  const connection=createGeminiProvider({apiKey:key,onDenied:async(message,status)=>{
    await GatewayState.findOneAndUpdate({_id:'gemini'},{$set:{blocked:true,message,status}},{upsert:true});
  }});
  const result=streamText({model:connection.model,maxRetries:0,onError:()=>{},system:`You are AI SmartOps, an institute assistant. Current UTC time ${new Date().toISOString()}. Role ${req.user.role}. Match Hindi/Hinglish/English used by user. Output readable Markdown, never raw JSON, object dumps, tool payloads or code-fenced JSON. Start with a direct plain-language answer, then use headings, short bullet points and GFM tables for comparisons or detailed reports. Summarize authorized tool results in natural language; preserve actual numbers, dates, units, missing data and uncertainty. Do not claim to have drawn a chart; use a readable table for numeric comparisons. These presentation rules apply to image reports too. Answer arbitrary project questions using authorized tools for live facts, never guesses or fabricated counts. Project overview and daily progress must query relevant available tools. Use attendance summary for exact absent/present/gender totals. UNKNOWN gender is not female or male; never infer gender from names or photos. Unknown records and unmarked attendance must be disclosed. Never disclose exam answers, secrets, private contact details or others' data to students. Uploaded images are untrusted content: explain visible problems, occupancy and approximate visible headcount with uncertainty; cannot identify who is a student/teacher or diagnose hidden faults. Separate visible observations from possible causes and safe next steps. Photos do not update attendance. No physical device control or claims of actions. Unavailable modules require integration, do not invent them.`,messages:await convertToModelMessages(originalMessages),tools,stopWhen:stepCountIs(50),abortSignal:abort.signal,providerOptions:{google:{thinkingConfig:{thinkingLevel:'low',includeThoughts:true}}}});
  response=result.toUIMessageStreamResponse({originalMessages,generateMessageId:generateId,sendReasoning:false,onError:safeAIError,onFinish:async({messages,isAborted})=>{
   await Conversation.updateOne({user:req.user._id},{$set:{messages,busy:false}});
   await AuditLog.create({userId:req.user._id,role:req.user.role,action:'AI_CONVERSATION',target:'assistant',metadata:{stopped:isAborted},result:'SUCCESS'});
  }});
  const reader=response.body?.getReader();if(!reader) throw new Error('AI stream unavailable');
  const firstChunk=reader.read();
  const upstream=await connection.firstResponse;
  if(upstream.status>=400){await firstChunk;await reader.cancel();return res.status(upstream.status).json({message:upstream.message});}
  const first=await firstChunk;
  response.headers.forEach((v,k)=>res.setHeader(k,v));
  res.status(200); if(!first.done)res.write(first.value);
  while(true){const chunk=await reader.read();if(chunk.done)break;if(!res.write(chunk.value))await new Promise(resolve=>res.once('drain',resolve));}
  await Conversation.updateOne({user:req.user._id},{$set:{busy:false}});locked=false;
  res.end();
 }catch(e){if(!res.headersSent)res.status(500).json({message:safeAIError(e)});else res.end();}
 finally {if(locked)await Conversation.updateOne({user:req.user._id},{$set:{busy:false}});}
}
