import {test} from 'node:test';import assert from 'node:assert/strict';import {allowedDomain,dayRange} from '../ai/scope.js';
test('teacher cannot access institute fees',()=>assert.equal(allowedDomain('TEACHER','fees'),false));
test('student own-data categories only',()=>{assert.equal(allowedDomain('STUDENT','attendance'),true);assert.equal(allowedDomain('STUDENT','devices'),false);});
test('super admin project domains',()=>assert.equal(allowedDomain('SUPER_ADMIN','fees'),true));
test('strict calendar date',()=>{assert.throws(()=>dayRange('2026-02-30'));assert.throws(()=>dayRange('yesterday'));const r=dayRange('2026-10-12');assert.equal(r.$lt-r.$gte,86400000);});
