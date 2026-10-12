import {tool} from 'ai';
import {z} from 'zod';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';
import Fee from '../models/Fee.js';
import FeePayment from '../models/FeePayment.js';
import Test from '../models/Test.js';
import TestResult from '../models/TestResult.js';
import Batch from '../models/Batch.js';
import AuditLog from '../models/AuditLog.js';
import {allowedDomain,dayRange} from './scope.js';
const models={students:Student,attendance:Attendance,fees:Fee,payments:FeePayment,tests:Test,results:TestResult,batches:Batch};
const fields={students:'studentId name gender batch course status',attendance:'student batch date status source',fees:'student title totalAmount paidAmount dueDate',payments:'student amount method paidAt',tests:'title batch durationMinutes startAt endAt isPublished',results:'student test status score totalMarks percentage submittedAt',batches:'name course teacher isActive'};
export async function createTools(user) {
 const own=user.role==='STUDENT'?await Student.findOne({user:user._id}).select('_id batch').lean():null;
 const batches=user.role==='TEACHER'?await Batch.find({teacher:user._id}).select('_id').lean():[];
 const teacherIds=batches.length?await Student.find({batch:{$in:batches.map(b=>b._id)}}).distinct('_id'):[];
 async function scope(domain) {
  if(!allowedDomain(user.role,domain)) throw new Error('Access denied for this data category');
  if(user.role==='STUDENT') {
   if(!own) throw new Error('No student profile linked to this account');
   if(domain==='students') return {_id:own._id};
   if(domain==='batches') return {_id:own.batch};
   if(domain==='tests') return {batch:own.batch,isPublished:true};
   return {student:own._id};
  }
  if(user.role==='TEACHER') {
   if(domain==='batches') return {teacher:user._id};
   if(domain==='students') return {_id:{$in:teacherIds}};
   if(domain==='tests') return {batch:{$in:batches.map(b=>b._id)}};
   return {student:{$in:teacherIds}};
  }
  return {};
 }
 async function audit(name,input) {await AuditLog.create({userId:user._id,role:user.role,action:'AI_TOOL_CALLED',target:name,metadata:input,result:'SUCCESS'});}
 return {
  getProjectData:tool({description:'Read authorized live students, attendance, fees, payments, tests, results or batches. Get count and paginated records; never arbitrary DB queries. Date filters use UTC calendar date. Search only student name or ID. Teachers only assigned batches; students only own records.',inputSchema:z.object({domain:z.enum(['students','attendance','fees','payments','tests','results','batches']),date:z.string().nullable(),search:z.string().nullable(),offset:z.number().nullable()}).strict(),execute:async(input)=>{
   const {domain,date,search}=input; let filter=await scope(domain);
   if(search){const escaped=search.slice(0,100).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); const base=await scope('students'); const ids=await Student.find({...base,$or:[{name:new RegExp(escaped,'i')},{studentId:new RegExp(escaped,'i')}]}).distinct('_id'); if(domain==='students') filter={$and:[filter,{_id:{$in:ids}}]};else if(['attendance','fees','payments','results'].includes(domain)) filter={$and:[filter,{student:{$in:ids}}]};}
   if(date){const key={attendance:'date',payments:'paidAt',results:'submittedAt',tests:'startAt'}[domain]; if(key) filter={$and:[filter,{[key]:dayRange(date)}]};}
   const offset=Math.max(0,Math.floor(input.offset||0));const m=models[domain]; const [total,records]=await Promise.all([m.countDocuments(filter),m.find(filter).select(fields[domain]).sort({_id:1}).skip(offset).limit(40).lean()]);await audit('getProjectData',input);return {domain,total,records,offset,nextOffset:offset+records.length<total?offset+records.length:null,source:'MongoDB',scope:user.role};
  }}),
  getAttendanceSummary:tool({description:'Exact authorized attendance counts by PRESENT ABSENT LATE LEAVE and recorded gender, plus missing/unmarked students. Never count unmarked students as absent.',inputSchema:z.object({date:z.string()}).strict(),execute:async({date})=>{
    const sf=await scope('students');const af=await scope('attendance');const students=await Student.find(sf).select('_id gender status').lean();const rows=await Attendance.find({...af,date:dayRange(date)}).select('student status').lean(); const map=new Map(students.map(s=>[String(s._id),s]));const counts={PRESENT:0,ABSENT:0,LATE:0,LEAVE:0};const absentGender={FEMALE:0,MALE:0,OTHER:0,UNKNOWN:0};for(const r of rows){counts[r.status]=(counts[r.status]||0)+1;if(r.status==='ABSENT'){const g=map.get(String(r.student))?.gender||'UNKNOWN';absentGender[g]=(absentGender[g]||0)+1;}}await audit('getAttendanceSummary',{date});return {date,timezone:'UTC',studentCount:students.length,marked:rows.length,unmarked:students.filter(s=>s.status==='ACTIVE'&&!rows.some(r=>String(r.student)===String(s._id))).length,counts,absentGender,scope:user.role};
  }}),
  getPlatformCapabilities:tool({description:'Identify available project modules, permissions and missing IoT/energy/room integrations. No invented data.',inputSchema:z.object({}).strict(),execute:async()=>({available:Object.keys(models).filter(d=>allowedDomain(user.role,d)),unavailable:['rooms','IoT telemetry','energy','device commands','alerts'],role:user.role,physicalActions:'Not enabled; require separately authorized human approval'})})
 };
}
