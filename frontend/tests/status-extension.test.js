import test from 'node:test';
import assert from 'node:assert/strict';
import {createStatusExtensionController, getAppointmentStatusExtension} from '../src/statusExtension.js';
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a; reject=b}); return {promise,resolve,reject}; };
const config = {fields: [], errorLabel: 'safe error', open: {url: 'open', params: (_, c) => ({id: c.row.name})}, continue: {url: 'continue', key: (_, c) => c.response.id, when: (_, c) => c.response.process_required, params: (_,c) => ({id:c.response.id})}, initialValues: response => ({choice: response.choice}), actions: []};
test('absent optional configuration does no work', async () => {
 assert.equal(getAppointmentStatusExtension({}), null); let count=0; const state={}; const ctl=createStatusExtensionController(state,{request:()=>count++});
 await ctl.open(null,{name:'one'}); assert.equal(count,0); assert.equal(state.active,false);
});
test('open continues the same operation without locking native actions or edited values', async () => {
 const slow=deferred(), state={}, calls=[];
 const ctl=createStatusExtensionController(state,{request:(url, options)=>{calls.push([url,options.params]); return url==='open'?Promise.resolve({id:'check',choice:'first',process_required:true}):slow.promise;}});
 const work=ctl.open(config,{name:'one'}); await new Promise(resolve=>setImmediate(resolve));
 assert.equal(state.busy,true); assert.equal(state.response.id,'check'); assert.deepEqual(calls.map(x=>x[0]),['open','continue']);
 state.values.choice='draft'; slow.resolve({id:'check',result:'done'}); await work; assert.equal(state.values.choice,'draft'); assert.equal(state.busy,false);
});
test('close and another appointment reject stale responses', async () => {
 const slow=deferred(), state={}; let calls=0;
 const ctl=createStatusExtensionController(state,{request:()=>++calls===1?slow.promise:Promise.resolve({id:'new',choice:'new'})});
 const old=ctl.open(config,{name:'old'}); ctl.close(); await ctl.open(config,{name:'new'}); slow.resolve({id:'old',choice:'old',process_required:true}); await old;
 assert.equal(state.row.name,'new'); assert.equal(state.response.id,'new'); assert.equal(calls,2);
});
test('failed explicit action reuses host intent; duplicates while busy do nothing', async () => {
 let generated=0; const slow=deferred(), state={}, sent=[]; let attempt=0;
 const ctl=createStatusExtensionController(state,{request:(url, options)=>{if(url==='open') return Promise.resolve({id:'one'}); sent.push(options.params); return ++attempt===1?slow.promise:Promise.resolve({id:'one'});}});
 await ctl.open(config,{name:'one'}); const action={name:'save',url:'save',params:()=>({intent:++generated})};
 const work=ctl.act(action); await ctl.act(action); slow.reject(new Error('secret stack')); await work; assert.equal(state.error,'safe error'); await ctl.act(action);
 assert.equal(generated,1); assert.deepEqual(sent,[{intent:1},{intent:1}]);
});
test('readonly refresh preserves edited values and cleans timers on close', async () => {
 const timers=new Map(); let number=0, calls=0; const state={};
 const ctl=createStatusExtensionController(state,{schedule:fn=>{timers.set(++number,fn);return number;},cancel:id=>timers.delete(id),request:()=>Promise.resolve(++calls===1?{id:'one',loading:true,choice:'original'}:{id:'one',loading:true,choice:'server'})});
 await ctl.open({...config,refresh:{url:'refresh',method:'GET',when:(_,c)=>c.response.loading}}, {name:'one'});
 state.values.choice='draft'; const callback=[...timers.values()][0]; timers.clear(); await callback();
 assert.equal(state.values.choice,'draft'); assert.equal(calls,2); ctl.close(); assert.equal(timers.size,0);
});
test('timeout reports configured safe error and discards late work', async () => {
 let expiry; const state={}, slow=deferred(); const ctl=createStatusExtensionController(state,{request:()=>slow.promise,schedule:fn=>{expiry=fn;return 1},cancel:()=>{}});
 const work=ctl.open(config,{name:'one'}); expiry(); await work; assert.equal(state.error,'safe error'); slow.resolve({id:'late'}); await Promise.resolve(); assert.equal(state.response,null);
});
