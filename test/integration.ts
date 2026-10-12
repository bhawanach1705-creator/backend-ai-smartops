import {MongoMemoryServer} from 'mongodb-memory-server';
import mongoose from 'mongoose';
import assert from 'node:assert/strict';
// By default exercise the real Express/auth/MongoDB/SDK flow with a deterministic Gemini transport.
// GEMINI_LIVE_TEST=true uses the configured real Gemini key instead.
const nativeFetch=globalThis.fetch;
if(process.env.GEMINI_LIVE_TEST!=='true') {
 process.env.GEMINI_API_KEY='integration-fixture-only';
 let upstreamCalls=0;
 globalThis.fetch=async(input,init)=>{
  if(!String(input).startsWith('https://generativelanguage.googleapis.com/')) return nativeFetch(input,init);
  upstreamCalls++;
  const parts=upstreamCalls===1?[{functionCall:{name:'getAttendanceSummary',args:{date:'2026-10-12'}},thoughtSignature:'integration-signature'}]:[{text:upstreamCalls===2?'1 absent student, 1 female absent student.':'No people are visible in this synthetic fixture.'}];
  return new Response('data: '+JSON.stringify({candidates:[{content:{role:'model',parts},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:5,totalTokenCount:15}})+'\n\n',{headers:{'Content-Type':'text/event-stream'}});
 };
}
const mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri());
process.env.JWT_SECRET='test-only-random-secret-32-characters-long';
const {default:User}=await import('../models/User.js');const {default:Student}=await import('../models/Student.js');const {default:Batch}=await import('../models/Batch.js');const {default:Attendance}=await import('../models/Attendance.js');
const {default:app}=await import('../app.js');const {signToken}=await import('../services/tokenService.js');
const admin=await User.create({name:'Test Admin',email:'test-admin@example.test',password:'test-password-only',role:'SUPER_ADMIN'});
const teacher=await User.create({name:'Test Teacher',email:'teacher@example.test',password:'test-password-only',role:'TEACHER'});
const pupil=await User.create({name:'Test Student',email:'student@example.test',password:'test-password-only',role:'STUDENT'});
const batch=await Batch.create({name:'Fixture batch',course:'CS',teacher:teacher._id});
const s=await Student.create({studentId:'FIX1',name:'Fixture Student',email:'fixture@example.test',gender:'FEMALE',batch:batch._id,user:pupil._id});await Attendance.create({student:s._id,batch:batch._id,date:new Date('2026-10-12'),status:'ABSENT'});
const {createTools}=await import('../ai/tools.js');const at=await createTools(admin);const summary=await at.getAttendanceSummary.execute({date:'2026-10-12'},{});assert.equal(summary.absentGender.FEMALE,1);
const tt=await createTools(teacher);await assert.rejects(()=>tt.getProjectData.execute({domain:'fees',date:null,search:null,offset:null},{}));
const server=app.listen(5099);const headers={'Content-Type':'application/json',Authorization:'Bearer '+signToken(admin)};
try{
 const unauthorized=await fetch('http://localhost:5099/api/ai/conversation');assert.equal(unauthorized.status,401);
 const res=await fetch('http://localhost:5099/api/ai/chat',{method:'POST',headers,body:JSON.stringify({messages:[{id:'verify-user',role:'user',parts:[{type:'text',text:'2026-10-12 ko kitne absent aur female absent hain? Use live attendance summary.'}]}]})});assert.equal(res.status,200);const streamed=await res.text();assert.ok(streamed.includes('text-delta'));assert.ok(streamed.includes('getAttendanceSummary'));
 const history=await fetch('http://localhost:5099/api/ai/conversation',{headers}).then(r=>r.json());assert.equal(history.messages.length,2);assert.equal(history.messages[1].role,'assistant');console.log('PASS authenticated Gemini SDK -> MongoDB summary -> saved history readback');
 const studentHistory=await fetch('http://localhost:5099/api/ai/conversation',{headers:{Authorization:'Bearer '+signToken(pupil)}}).then(r=>r.json());assert.equal(studentHistory.messages.length,0);console.log('PASS history isolation and teacher fee denial');
 const image='iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAAC1ElEQVR4nO3VsQ2EQBAEwb8X+ae8JAAe0hpdFcE4rTkz84Oq//YA2CQA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkHZtD3hxzvYCvjazveCBByBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgLRre8CLme0FJHgA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0gRAmgBIEwBpAiBNAKQJgDQBkCYA0m7WbAj/heFf5gAAAABJRU5ErkJggg==';
 const ir=await fetch('http://localhost:5099/api/ai/chat',{method:'POST',headers,body:JSON.stringify({messages:[{id:'verify-image',role:'user',parts:[{type:'text',text:'Describe this image. Are people visible?'},{type:'file',mediaType:'image/png',url:'data:image/png;base64,'+image,filename:'fixture.png'}]}]})});const imageOutput=await ir.text();console.log('Image HTTP status:',ir.status);if(ir.status!==200)console.log('Safe response:',imageOutput);assert.equal(ir.status,200);assert.ok(imageOutput.includes('text-delta'));console.log('PASS authenticated image upload response');
 const savedImage=await fetch('http://localhost:5099/api/ai/conversation',{headers}).then(r=>r.json());assert.equal(savedImage.messages.length,4);assert.ok(savedImage.messages[3].parts.some(p=>p.type==='text'));console.log('PASS image response persisted and restored');

}finally{await new Promise(resolve=>setTimeout(resolve,500));await new Promise<void>(resolve=>server.close(()=>resolve()));await mongoose.disconnect();await mongo.stop();}
