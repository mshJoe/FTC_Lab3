/* ================= Importer (B1-B6, pure where possible) ================= */
const FIELDS=['name','year','major','phone','email','linkedin','company','role'];
const FIELD_AR={name:'الاسم',year:'سنة التخرج',major:'التخصص',phone:'الجوال',email:'الإيميل',linkedin:'لينكد إن',company:'جهة العمل',role:'المسمى'};
const SYNONYMS={
  name:['الاسم','الاسم الكامل','اسم الخريج','الاسم الثلاثي','name','full name','graduate'],
  year:['سنة التخرج','دفعة','السنة','عام التخرج','year','batch','graduation year'],
  major:['التخصص','البرنامج','major','program','specialization'],
  phone:['الجوال','الرقم','الهاتف','رقم التواصل','موبايل','جوال','phone','mobile','whatsapp','واتساب'],
  email:['الإيميل','البريد','الايميل','البريد الإلكتروني','email','e-mail','mail'],
  linkedin:['لينكد إن','لينكدإن','حساب لينكد إن','لينكد','linkedin','linked'],
  company:['جهة العمل','الشركة','جهة','مكان العمل','company','employer','organization'],
  role:['المسمى','الوظيفة','المسمى الوظيفي','الدور','role','title','position']
};
function matchSynonym(label){
  const q=norm(label).trim();
  if(!q)return null;
  for(const f of FIELDS){
    for(const syn of SYNONYMS[f]){
      const ns=norm(syn);
      if(q===ns)return f;
    }
  }
  for(const f of FIELDS){
    for(const syn of SYNONYMS[f]){
      const ns=norm(syn);
      if(q.startsWith(ns)||ns.startsWith(q)&&q.length>=3)return f;
    }
  }
  return null;
}
function splitLine(line){
  const s=String(line);
  /* choose delimiter by frequency outside quotes */
  const counts={'\t':0,',':0,';':0,'؛':0};
  let inQ=false;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(c==='"'){inQ=!inQ;continue}
    if(!inQ&&counts[c]!==undefined)counts[c]++;
  }
  let delim='\t',best=0;
  for(const d of ['\t','؛',',',';'])if(counts[d]>best){best=counts[d];delim=d}
  if(best===0)return {delim:null,cells:[s.replace(/^"|"$/g,'').trim()]};
  /* split honoring quotes */
  const cells=[];let cur='',q=false;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(c==='"'){
      if(q&&s[i+1]==='"'){cur+='"';i++}
      else q=!q;
    }else if(c===delim&&!q){cells.push(cur.trim());cur=''}
    else cur+=c;
  }
  cells.push(cur.trim());
  return {delim,cells};
}
function guessHeader(rows){
  let bestIdx=-1,bestMap=null,bestScore=0;
  rows.forEach((r,i)=>{
    if(i>5)return;
    const map={};let score=0;
    r.cells.forEach((c,ci)=>{
      const f=matchSynonym(c);
      if(f&&!Object.values(map).includes(f)){map[ci]=f;score++}
    });
    if(score>=2&&score>bestScore){bestScore=score;bestIdx=i;bestMap=map}
  });
  return bestIdx>=0?{headerIdx:bestIdx,map:bestMap}:null;
}
function guessDefaultMap(headers){
  const map={};
  headers.forEach((c,ci)=>{const f=matchSynonym(c);if(f&&!Object.values(map).includes(f))map[ci]=f});
  return map;
}
function yearClean(raw){
  if(!raw)return null;
  const v=stripWSp(raw).replace(/[٠-٩۰-۹]/g,c=>AR_DIG[c]||c).trim();
  const m=v.match(/\d{4}/);
  return m?+m[0]:null;
}
function cleanValue(field,raw){
  if(!raw)return {value:'',note:null};
  if(field==='phone'){const r=cleanContact('phone',raw);return {value:r&&r.ok?r.value:raw,valid:r&&r.ok,note:(!r||!r.ok)?'رقم غير معروف الصيغة':null}}
  if(field==='email'){const r=cleanContact('email',raw);return {value:r&&r.ok?r.value:raw,valid:r&&r.ok,suggest:r&&r.suggest,note:(!r||!r.ok)?'إيميل غير صحيح':(r.suggest?`هل تقصد ${r.suggest}؟`:null)}}
  if(field==='linkedin'){const r=cleanContact('linkedin',raw);return {value:r&&r.ok?r.value:raw,valid:r&&r.ok,note:(!r||!r.ok)?'حساب لينكد إن غير مفهوم':null}}
  if(field==='year'){const y=yearClean(raw);return {value:y!=null?String(y):raw,note:null}}
  return {value:String(raw).replace(/[\u200B-\u200D\uFEFF]/g,'').trim()};
}
function buildCandidate(cells,map){
  const c={name:'',year:'',major:'',company:'',role:'',phones:[],emails:[],linkedins:[],raw:cells.map(x=>x).join('|'),notes:[]};
  map.forEach((f,ci)=>{
    const raw=cells[ci];
    if(!raw)return;
    const r=cleanValue(f,raw);
    if(f==='name')c.name=r.value.trim();
    else if(f==='year')c.year=r.value;
    else if(f==='major')c.major=r.value;
    else if(f==='company')c.company=r.value;
    else if(f==='role')c.role=r.value;
    else{
      const typ=f;
      if(typ==='phone'&&r.value)c.phones.push(r.value);
      if(typ==='email'&&r.value)c.emails.push(r.value);
      if(typ==='linkedin'&&r.value)c.linkedins.push(r.value);
      if(r.note)c.notes.push(r.note);
      if(r.suggest&&!c.suggest)c.suggest=r.suggest;
    }
  });
  return c;
}
function validateCandidate(c){
  const hasName=!!c.name&&c.name!==PLACEHOLDER_NAME;
  const notes=(c.notes||[]).slice();
  const chan=[...c.phones,...c.emails,...c.linkedins];
  const validCount=c.phones.filter(v=>phoneCanonical(v)).length
    +c.emails.filter(v=>emailCanonical(v)).length
    +c.linkedins.filter(v=>linkedinCanonical(v)).length;
  if(c.year&&+c.year>=1400&&+c.year<=1500)notes.push('تتوقع سنة هجرية — بنعرضها كما هي');
  if(!hasName)return {level:'bad',notes:['الاسم مفقود',...(chan.length?[]:['ما فيه وسيلة تواصل'])]};
  if(!chan.length)return {level:'warn',notes:['اسم بدون وسيلة تواصل — بنكمل بياناته بعدين']};
  if(chan.length>validCount)return {level:'warn',notes:[...notes,'فيه وسيلة تواصل مش صالحة']};
  return {level:'ok',notes};
}
/* B4: parse a single free-form line */
function extractFields(line){
  const tokens=String(line).trim().split(/\s+/);
  const f={phones:[],emails:[],linkedins:[],year:'',nameTokens:[]};
  tokens.forEach(t=>{
    if(emailCanonical(t)){f.emails.push(emailCanonical(t).value);return}
    const p=phoneCanonical(t);
    if(p){f.phones.push(p);return}
    if(/linkedin\.com\/(in|pub)\//i.test(t)||/^@[\w.\-]+$/.test(t)){
      const l=linkedinCanonical(t);
      if(l){f.linkedins.push(l);return}
    }
    const n=norm(t).replace(/\s/g,'');
    if(/^\d{4}$/.test(n)&&+n>=1390&&+n<=2100){f.year=String(+n);return}
    f.nameTokens.push(t);
  });
  f.name=f.nameTokens.join(' ');
  return f;
}
/* suppression check */
const _hashCache={};
async function suppressionMatch(candidate){
  const set=new Set();
  D.suppressions.forEach(s=>(s.keys||[]).forEach(k=>set.add(k.hash)));
  for(const [type,list] of [['phone',candidate.phones],['email',candidate.emails],['linkedin',candidate.linkedins]]){
    for(const v of list){
      const ck=type+'|'+v;
      if(!_hashCache[ck])_hashCache[ck]=await hashKey(type,v);
      if(set.has(_hashCache[ck]))return true;
    }
  }
  return false;
}
/* B3/B5: match against live grads */
function findMatchByContacts(candidate,ignoreDNC){
  const keys=new Set();
  candidate.phones.forEach(v=>keys.add(phoneKey(v)));
  candidate.emails.forEach(v=>keys.add(emailKey(v)));
  candidate.linkedins.forEach(v=>keys.add(liKey(v)));
  if(!keys.size)return null;
  return liveGrads().find(g=>(g.contacts||[]).some(c=>keys.has(compactKey(c.type,c.value))))||null;
}
async function diffCandidates(cands){
  const rows=[];
  for(const c of cands){
    const row={c,level:null,notes:null,suppressed:false,matched:null,action:null};
    const v=validateCandidate(c);
    row.level=v.level;row.notes=v.notes||[];
    if(v.level==='bad'){row.result='bad';rows.push(row);continue}
    row.suppressed=await suppressionMatch(c);
    const g=findMatchByContacts(c);
    if(row.suppressed){row.result='blocked';row.notes.push('محجوب (سجل منع)');rows.push(row);continue}
    if(g&&g.doNotContact){row.result='blocked';row.matched=g;row.notes.push('محجوب (خريج طلب عدم التواصل)');rows.push(row);continue}
    row.matched=g||null;
    row.action=c._action||'update';
    if(!g){
      if(row.action==='update')row.action='add';
      row.result='add';
    }else{
      const chg=changesFor(g,c);
      if(!chg&&row.action!=='merge')row.result='unchanged';
      else row.result=row.action==='merge'?'merge':'update';
    }
    rows.push(row);
  }
  return rows;
}
function changesFor(g,c){
  let chg=false;
  if(!g.name||g.name===PLACEHOLDER_NAME){const v=c.name.trim();if(v){chg=true}}
  ['year','major','company','role'].forEach(k=>{if(!g[k]&&c[k])chg=true});
  const gk=new Set((g.contacts||[]).map(x=>compactKey(x.type,x.value)));
  c.phones.forEach(v=>{if(phoneCanonical(v)&&!gk.has(phoneKey(v)))chg=true});
  c.emails.forEach(v=>{if(emailCanonical(v)&&!gk.has(emailKey(v)))chg=true});
  c.linkedins.forEach(v=>{if(linkedinCanonical(v)&&!gk.has(liKey(v)))chg=true});
  return chg;
}
function applyUpdate(g,c){
  if(c.name.trim()&&(!g.name||g.name===PLACEHOLDER_NAME))g.name=c.name.trim();
  if(!g.year&&c.year)g.year=+c.year||g.year;
  if(!g.major&&c.major)g.major=c.major;
  if(!g.company&&c.company)g.company=c.company;
  if(!g.role&&c.role)g.role=c.role;
  const gk=new Set((g.contacts||[]).map(x=>compactKey(x.type,x.value)));
  c.phones.forEach(v=>{if(phoneCanonical(v)&&!gk.has(phoneKey(v)))g.contacts.push({type:'phone',value:v})});
  c.emails.forEach(v=>{const em=cleanContact('email',v);if(em&&em.ok&&!gk.has(emailKey(em.value)))g.contacts.push({type:'email',value:em.value})});
  c.linkedins.forEach(v=>{if(linkedinCanonical(v)&&!gk.has(liKey(v)))g.contacts.push({type:'linkedin',value:v})});
}
function commitImport(rows){
  const counts={added:0,updated:0,unchanged:0,blocked:0,merge:0};
  rows.forEach(r=>{if(r.result==='blocked')counts.blocked++;});
  const snaps=[snapArr(D.grads),snapMap(D.states),snapArr(D.timeline),snapArr(D.importBatches)];
  const batch={id:uid('b'),ts:nowISO(),counts,createdBy:me(),purgeAt:Date.now()+30*60*1000,snapshot:{addedIds:[],prev:{},tlLen:D.timeline.length}};
  const e=activeEvent();
  rows.forEach(r=>{
    if(r.result==='add'&&r.level!=='bad'){
      const g={id:uid('g'),name:r.c.name.trim()||PLACEHOLDER_NAME,year:+r.c.year||2024,major:r.c.major||'',company:r.c.company||'',role:r.c.role||'',
        contacts:[],doNotContact:false,createdFrom:'import:'+batch.id,createdAt:nowISO(),deletedAt:null,mergedInto:null};
      r.c.phones.forEach(v=>{if(phoneCanonical(v))g.contacts.push({type:'phone',value:v})});
      r.c.emails.forEach(v=>{const em=cleanContact('email',v);if(em&&em.ok)g.contacts.push({type:'email',value:em.value})});
      r.c.linkedins.forEach(v=>{if(linkedinCanonical(v))g.contacts.push({type:'linkedin',value:v})});
      D.grads.push(g);
      if(e&&!g.doNotContact)evStateOf(g.id,e.id);
      TLwrite(g.id,e?e.id:null,'imported',`أُضيف الخريج ${g.name} من استيراد دفعة`);
      batch.snapshot.addedIds.push(g.id);
      counts.added++;
    }else if((r.result==='update'||r.result==='merge')&&r.matched){
      const g=r.matched;
      batch.snapshot.prev[g.id]=JSON.parse(JSON.stringify(g));
      applyUpdate(g,r.c);
      if(r.result==='merge'){
        counts.merge++;
        TLwrite(g.id,e?e.id:null,'merged',`دمج بيانات مستوردة في «${g.name}»`);
      }else counts.updated++;
    }else if(r.result==='unchanged')counts.unchanged++;
  });
  batch.counts=counts;
  D.importBatches.push(batch);
  commitUndo('استيراد دفعة',snaps);
  Store.save();
  return batch;
}
const Importer={FIELDS,FIELD_AR,SYNONYMS,matchSynonym,splitLine,guessHeader,guessDefaultMap,buildCandidate,validateCandidate,extractFields,diffCandidates,changesFor,applyUpdate,commitImport,cleanValue,yearClean};

/* == WhatsApp / Gmail / LinkedIn links (A3) == */
const waNum=p=>{const c=phoneCanonical(p);return c?'966'+c.slice(1):''};
function channelsFor(g,kind){
  /* returns [{kind:'wa|gmail|linkedin', icon,label,sub,value, href msg-template}] */
  const chan=[];
  (g.contacts||[]).forEach(c=>{
    if(c.type==='phone'){
      const num=waNum(c.value);
      if(num)chan.push({kind:'wa',icon:'phone',label:'واتساب',sub:fmtPhone(c.value),value:c.value,template:'initial'});
    }else if(c.type==='email'){
      const em=cleanContact('email',c.value);
      if(em&&em.ok)chan.push({kind:'gmail',icon:'mail',label:'Gmail',sub:em.value,value:em.value,template:'initial'});
    }else{
      const l=cleanContact('linkedin',c.value);
      if(l&&l.ok)chan.push({kind:'linkedin',icon:'linkedin',label:'LinkedIn (نسخ الرسالة وفتح الحساب)',sub:'in/'+l.value,value:l.value,template:'linkedin'});
    }
  });
  if(kind==='reminder')chan.forEach(c=>{c.template=c.kind==='linkedin'?'linkedin':'reminder'});
  const seen=new Set();
  return chan.filter(c=>{const k=c.kind+c.sub;if(seen.has(k))return false;seen.add(k);return true});
}
function buildChannelMessage(g,ch){
  const st=D.states[g.id+'|'+(activeEvent()?activeEvent().id:'')];
  const vars=templateVarsFor(g,null);
  const r=Tmpl.renderPlain(ch.template,vars);
  return r;
}
function channelHref(g,ch,msg){
  const body=encodeURIComponent(msg);
  if(ch.kind==='wa')return `https://wa.me/${waNum(ch.value)}?text=${body}`;
  if(ch.kind==='gmail'){
    const ev=activeEvent();
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(ch.value)}&su=${encodeURIComponent('دعوة: '+(ev?ev.name:'جلسة خريج')+' — نادي FTC')}&body=${body}`;
  }
  return `https://www.linkedin.com/in/${encodeURIComponent(ch.value)}/`;
}
const liHandle=v=>{const cl=cleanContact('linkedin',v);return cl&&cl.ok?cl.value:String(v||'').replace(/^@|\/+$/g,'')};
const liUrl=g=>`https://www.linkedin.com/in/${encodeURIComponent(liHandle(((g.contacts||[]).find(c=>c.type==='linkedin')||{}).value||''))}/`;

