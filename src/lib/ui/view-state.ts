type ViewStateEnvelope<T>={value:T;scrollY:number};
const CACHE_OWNER_KEY='pachimanga:cache-owner';
function scopedKey(name:string){if(typeof window==='undefined')return null;const owner=localStorage.getItem(CACHE_OWNER_KEY);return owner?`pachimanga:view-state:${owner}:${name}`:null}
export function readViewState<T>(name:string,fallback:T):ViewStateEnvelope<T>{const key=scopedKey(name);if(!key)return{value:fallback,scrollY:0};try{const parsed=JSON.parse(sessionStorage.getItem(key)||'') as Partial<ViewStateEnvelope<T>>;return{value:parsed&&'value'in parsed?parsed.value as T:fallback,scrollY:Number.isFinite(Number(parsed?.scrollY))?Math.max(0,Number(parsed?.scrollY)):0}}catch{return{value:fallback,scrollY:0}}}
export function writeViewState<T>(name:string,value:T,scrollY=0){const key=scopedKey(name);if(!key)return;try{sessionStorage.setItem(key,JSON.stringify({value,scrollY:Math.max(0,scrollY)}))}catch{}}
