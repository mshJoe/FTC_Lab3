/* ================= Helpers ================= */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const parseISO=s=>{const [y,m,d]=String(s).slice(0,10).split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(iso,n)=>{const d=parseISO(iso);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const diffDays=(a,b)=>Math.round((parseISO(a)-parseISO(b))/864e5);
const toMin=t=>{const [h,m]=String(t||'0:0').split(':').map(Number);return h*60+m};
const fmtTime=min=>{const h=Math.floor(min/60)%24,m=min%60;return `${h%12||12}:${pad(m)} ${h<12?'ص':'م'}`};
const LOC='ar-SA-u-ca-gregory-nu-latn';
const fmtLong=iso=>new Intl.DateTimeFormat(LOC,{weekday:'long',day:'numeric',month:'long'}).format(parseISO(iso));
const fmtShort=iso=>{
  if(!iso)return '—';
  const s=String(iso);
  const tz=isISODate(s)?{timeZone:'Asia/Riyadh'}:undefined;
  if(s.length>10&&!isISODate(s)){return new Intl.DateTimeFormat(LOC,{day:'numeric',month:'short',timeZone:'Asia/Riyadh'}).format(new Date(s))+' · '+new Intl.DateTimeFormat('en-GB',{hour12:false,hour:'2-digit',minute:'2-digit',timeZone:'Asia/Riyadh'}).format(new Date(s))}
  const d=new Intl.DateTimeFormat(LOC,{day:'numeric',month:'short',...tz}).format(parseISO(s.slice(0,10)));
  const hm=s.length>10&&!tz?s.slice(11,16):'';
  return hm?d+' · '+hm:d;
};
const isISODate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s);
const WD=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const MO=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function daysWord(n){n=Math.abs(n);if(n===1)return 'يوم';if(n===2)return 'يومين';if(n<=10)return `${n} أيام`;return `${n} يوم`}
function relFuture(n){if(n===0)return 'اليوم';if(n===1)return 'بكرة';if(n===-1)return 'أمس';return n>0?`بعد ${daysWord(n)}`:`قبل ${daysWord(n)}`}
const fmtPhone=p=>p&&p.length===10?`${p.slice(0,3)} ${p.slice(3,6)} ${p.slice(6)}`:(p||'');
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const nowISO=()=>new Date().toISOString();
const dayOfISO=iso=>String(iso||'').slice(0,10);
const relTime=isoTs=>{const ms=Date.now()-new Date(isoTs).getTime();const days=Math.floor(ms/864e5);const hrs=Math.floor(ms/36e5);if(days>=1)return relFuture(-days);if(hrs>=1)return `قبل ${hrs} ساعة`;const mins=Math.floor(ms/6e4);return mins<=1?'اللحظة':`قبل ${mins} دقيقة`};

/* == Riyadh clock (live) == */
const RT_DATE=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh'});
const RT_TIME=new Intl.DateTimeFormat('en-GB',{hour12:false,hour:'2-digit',minute:'2-digit',timeZone:'Asia/Riyadh'});
const riyadhToday=()=>RT_DATE.format(new Date());
function nowRiyadhMin(){const t=RT_TIME.format(new Date());let[h,m]=t.split(':').map(Number);if(h===24)h=0;return h*60+m}

/* ================= norm module (pure) ================= */
const AR_DIG={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'};
function normChar(c){
  if(AR_DIG[c]!==undefined)return AR_DIG[c];
  if(/[\u064B-\u065F\u06D6-\u06ED]/.test(c))return '';
  if(c==='ـ')return '';
  if(c==='أ'||c==='إ'||c==='آ'||c==='ٱ')return 'ا';
  if(c==='ة')return 'ه';
  if(c==='ى')return 'ي';
  if(c==='ؤ')return 'و';
  if(c==='ئ')return 'ي';
  return c.toLowerCase();
}
const norm=s=>String(s||'').split('').map(normChar).join('').replace(/\s+/g,' ').trim();
function buildMap(str){
  const s=String(str||'');let out='';const idx=[];
  for(let i=0;i<s.length;i++){
    const n=normChar(s[i]);
    if(n){out+=n;idx.push(i)}
  }
  return {normStr:out,idx};
}
function highlight(str,needle){
  str=String(str??'');needle=String(needle||'').trim();
  if(!needle)return esc(str);
  const m=buildMap(str),q=norm(needle);
  const i=q?m.normStr.indexOf(q):-1;
  if(i<0)return esc(str);
  const rs=m.idx[i],re=m.idx[i+q.length-1]+1;
  if(rs==null||re==null||re<=rs)return esc(str);
  return esc(str.slice(0,rs))+'<mark>'+esc(str.slice(rs,re))+'</mark>'+esc(str.slice(re));
}
/* == canonical cleaners (pure, B2) == */
const stripWSp=v=>String(v??'').replace(/[\u200B-\u200D\uFEFF\u00A0]/g,'');
function phoneCanonical(raw){
  let d=stripWSp(raw).replace(/[٠-٩۰-۹]/g,c=>AR_DIG[c]||c).replace(/\D/g,'');
  if(d.startsWith('00966'))d=d.slice(5);
  else if(d.startsWith('966')){
    d=d.slice(3);
    if(!(d.startsWith('05')||d.startsWith('5')&&d.length===9))return null;
  }
  if(d.length===9&&d.startsWith('5'))d='0'+d;
  return (d.length===10&&d.startsWith('05'))?d:null;
}
const BAD_DOMAINS={'gmail.con':'gmail.com','gmai.com':'gmail.com','gamil.com':'gmail.com','gmail.cm':'gmail.com','gmail.om':'gmail.com','hotmail.con':'hotmail.com','outlok.com':'outlook.com','yahoo.con':'yahoo.com','hotmail.cm':'hotmail.com'};
function emailCanonical(raw){
  const v=stripWSp(raw).replace(/\s+/g,'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))return null;
  const dom=v.split('@')[1];
  return {value:v,suggest:BAD_DOMAINS[dom]||null};
}
function linkedinCanonical(raw){
  let v=stripWSp(raw).trim();
  if(!v)return null;
  const m=v.match(/linkedin\.com\/(in|pub)\/([^/?#\s]+)/i);
  v=m?m[2]:v.replace(/^@+/,'');
  try{v=decodeURIComponent(v)}catch(e){}
  v=v.replace(/\/+$/,'').toLowerCase();
  return /^[a-z0-9][a-z0-9\-_.]{1,59}$/.test(v)?v:null;
}
function cleanContact(type,raw){
  if(type==='phone'){const v=phoneCanonical(raw);return v?{ok:true,value:v,raw}:{ok:false,raw}}
  if(type==='email'){const v=emailCanonical(raw);return v?{ok:true,value:v.value,suggest:v.suggest}:{ok:false,raw}}
  if(type==='linkedin'){const v=linkedinCanonical(raw);return v?{ok:true,value:v,raw}:{ok:false,raw}}
  return null;
}
/* canonical dedupe keys across all modules (must live in the IIFE) */
const phoneKey=v=>{const c=phoneCanonical(v);return 'phone|'+(c?c.slice(1):(c===null?String(v||'').replace(/\D/g,'').replace(/^966/,''):''))};
const emailKey=v=>{const e=emailCanonical(v);return 'email|'+((e&&e.value)||String(v||'').trim().toLowerCase())};
const liKey=v=>{const l=linkedinCanonical(v);return 'linkedin|'+((l)||String(v||'').trim().toLowerCase())};
const compactKey=(t,v)=>t==='phone'?phoneKey(v):t==='email'?emailKey(v):t==='linkedin'?liKey(v):t+'|'+v;
const PLACEHOLDER_NAME='(بدون اسم)';

