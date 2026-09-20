type QueueState = { active: number; waiting: Array<() => void> };
const queues = new Map<string, QueueState>();
function stateFor(key:string){let s=queues.get(key);if(!s){s={active:0,waiting:[]};queues.set(key,s)}return s}
async function acquire(key:string,limit:number){const s=stateFor(key);if(s.active<limit){s.active+=1;return}await new Promise<void>(resolve=>s.waiting.push(resolve));s.active+=1}
function release(key:string){const s=queues.get(key);if(!s)return;s.active=Math.max(0,s.active-1);const next=s.waiting.shift();if(next){next();return}if(s.active===0)queues.delete(key)}
export async function withProviderConcurrency<T>(key:string,task:()=>Promise<T>,limit=2):Promise<T>{const bounded=Math.max(1,Math.min(8,Math.floor(limit)||1));await acquire(key,bounded);try{return await task()}finally{release(key)}}
export function providerQueueSnapshot(key:string){const s=queues.get(key);return s?{active:s.active,waiting:s.waiting.length}:{active:0,waiting:0}}
