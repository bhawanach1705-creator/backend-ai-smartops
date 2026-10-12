export function allowedDomain(role, domain) {
  if (['ADMIN','SUPER_ADMIN'].includes(role)) return true;
  if (role==='TEACHER') return ['students','attendance','tests','results','batches'].includes(domain);
  return role==='STUDENT' && ['students','attendance','fees','payments','results','tests','batches'].includes(domain);
}
export function dayRange(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date must be YYYY-MM-DD');
  const start=new Date(date+'T00:00:00.000Z');
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0,10)!==date) throw new Error('Invalid date');
  return {$gte:start,$lt:new Date(start.getTime()+86400000)};
}
