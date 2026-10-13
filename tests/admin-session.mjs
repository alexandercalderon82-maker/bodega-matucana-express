import assert from 'node:assert/strict';
import {build} from 'esbuild';
const id='00000000-0000-4000-8000-000000000001';
let user={id}, authorized=true, callback;
const states=[];
globalThis.__sessionTestClient={auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}}}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:authorized?{user_id:user.id}:null,error:null})})})})};
const bundle=await build({entryPoints:['lib/supabase.js'],bundle:true,write:false,format:'esm',platform:'node',define:{'process.env.NEXT_PUBLIC_SUPABASE_URL':'"https://example.test"','process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':'"public-test-key"'},plugins:[{name:'session-test',setup(b){b.onResolve({filter:/^(react|@supabase\/supabase-js)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='react'?`export function useSyncExternalStore(subscribe,getSnapshot){subscribe(()=>globalThis.__sessionTestStates.push(getSnapshot().status));return getSnapshot();}`:`export function createClient(){return globalThis.__sessionTestClient;}`}));}}]});
globalThis.__sessionTestStates=states;
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
api.useAuth();await api.refreshAuth();assert.equal(states.at(-1),'admin');
for(const event of ['SIGNED_IN','TOKEN_REFRESHED','INITIAL_SESSION']){
 states.length=0;callback(event,{user});assert.equal(states.length,0,'Same-user event must not unmount the panel');
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(states.at(-1),'admin');assert.ok(!states.includes('loading'));
}
authorized=false;callback('SIGNED_IN',{user});await new Promise(resolve=>setTimeout(resolve,10));assert.equal(states.at(-1),'denied','Revoked permissions must remove access');
authorized=true;await api.refreshAuth();user={id:'00000000-0000-4000-8000-000000000002'};states.length=0;callback('SIGNED_IN',{user});assert.equal(states[0],'loading','Different user must be checked before entering');await new Promise(resolve=>setTimeout(resolve,10));
callback('SIGNED_OUT',null);assert.equal(states.at(-1),'signed-out');
console.log('PASS: reentrada a pestaña y renovación de token sin desmontar el panel; revocación, cambio de cuenta y cierre de sesión mantienen controles. Cliente simulado, sin credenciales reales.');
delete globalThis.__sessionTestClient;delete globalThis.__sessionTestStates;
