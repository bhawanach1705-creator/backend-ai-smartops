import {createGoogleGenerativeAI} from '@ai-sdk/google';

// Never expose raw upstream errors: URLs or provider bodies can contain credentials.
export function safeAIError(error: unknown): string {
 const status=typeof error==='object' && error!==null && 'statusCode' in error ? Number(error.statusCode) : 0;
 if(status===400) return 'Gemini rejected the request. Check the image, conversation and model configuration.';
 if(status===401) return 'Gemini API key is invalid. Update GEMINI_API_KEY on the server and restart.';
 if(status===403) return 'Gemini access denied. Check the API key permissions and supported region before resuming.';
 if(status===404) return 'Configured Gemini model is unavailable. Check GEMINI_MODEL against Google AI Studio.';
 if(status===429) return 'Gemini free-tier quota reached. Wait for your quota to reset; check usage in Google AI Studio.';
 if(status>=500) return 'Gemini is temporarily unavailable. Try a fresh request later.';
 return 'AI request could not finish. Check your connection and server configuration.';
}

export function createGeminiProvider({apiKey, modelId=process.env.GEMINI_MODEL||'gemini-3.8-flash', fetchImpl=fetch, onDenied=async()=>{}}: {
 apiKey:string; modelId?:string; fetchImpl?:typeof fetch; onDenied?:(message:string,status:number)=>Promise<void>;
}) {
 let resolveFirst:(result:{status:number;message:string})=>void=()=>{};
 const firstResponse=new Promise<{status:number;message:string}>(resolve=>{resolveFirst=resolve;});
 let settled=false;
 const settle=(value:{status:number;message:string})=>{if(!settled){settled=true;resolveFirst(value);}};
 const provider=createGoogleGenerativeAI({apiKey,fetch:async(input,init)=>{
  try {
   const response=await fetchImpl(input,init);
   const message=response.ok?'':safeAIError({statusCode:response.status});
   if(response.status===403) await onDenied(message,403);
   settle({status:response.status,message});
   return response;
  }catch(error){settle({status:502,message:safeAIError(error)});throw error;}
 }});
 return {model:provider(modelId),firstResponse};
}