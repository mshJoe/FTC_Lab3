/* ================= Import wizard ================= */
const WIZ_IDS={
  grads:{scope:'grads',text:'wiz-text',review:'wiz-review',note:'wiz-note',preview:'wiz-preview',file:'wiz-file-file'}
};
function initWizard(scope){
  const ids=WIZ_IDS[scope];if(!ids)return;
  const text=$(ids.text),review=$(ids.review),note=$(ids.note),prev=$(ids.preview),file=$(ids.file);
  if(!text||!review)return;
  prev&&prev.addEventListener('input',e=>{if(e.target.matches('[data-wfld]'))wizCellInput(e.target)});
  file&&file.addEventListener('change',()=>wizLoadFile(file,ids));
  text.addEventListener('input',()=>{review.disabled=!text.value.trim()});
  review.addEventListener('click',()=>wizReview(ids));
}
function wizLoadFile(file,ids){
  const note=$(ids.note);
  const f=file.files&&file.files[0];if(!f)return;
  if(!/\.csv$/i.test(f.name)&&f.type!=='text/csv'){if(note)note.textContent='نقبل CSV فقط — قوقل شيت يصدّرها بسهولة';return}
  const rd=new FileReader();
  rd.onload=()=>{const text=$(ids.text);if(text)text.value=String(rd.result||'');if(note)note.textContent=`حمّلنا «${esc(f.name)}» — اضغط «تحقق واستعرض»`};
  rd.readAsText(f,'utf-8');
}
async function wizReview(ids){
  const text=$(ids.text),note=$(ids.note);
  const raw=(text&&text.value.trim())||'';
  if(!raw){toast('الصق بيانات أول');return}
  const parsed=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(l=>Importer.splitLine(l));
  const hd=Importer.guessHeader(parsed.slice(0,6));
  const mapObj=hd?hd.map:null;
  const headerIdx=hd?hd.headerIdx:-1;
  const cands=parsed.filter((r,ri)=>ri!==headerIdx&&!/الاسم|الاسم الكامل|name/i.test(r.cells[0]||'')).map(r=>cellToCandidate(r.cells,mapObj)).filter(Boolean);
  if(!cands.length){toast('ما قدرنا نفهم الجدول — تأكد فيه عمود اسم على الأقل');return}
  if(note)note.textContent=`قرأنا ${cands.length} سجل${hd?' مع تعريف الأعمدة تلقائياً':''} — راجع الجدول قبل الحفظ`;
  wizRows=await Importer.diffCandidates(cands);
  renderWizardPreview(ids.scope);
}
function cellToCandidate(cells,mapObj){
  const c={name:'',phones:[],emails:[],linkedins:[],year:'',major:'',company:'',role:'',notes:[]};
  const seen=new Set();
  if(mapObj&&Object.keys(mapObj).length&&cells.length>1){
    cells.forEach((v,i)=>{
      const f=mapObj[i];if(!f||!String(v).trim())return;
      const r=Importer.cleanValue(f,v);
      if(f==='phone'){const p=phoneCanonical(v);if(!p&&r.note)c.notes.push(r.note);if(p)seen.add('phone|'+p);if(p)c.phones.push(p);return}
      if(f==='email'){const em=cleanContact('email',v);if(em&&em.ok)c.emails.push(em.value);if(r&&r.suggest&&!c.suggest)c.suggest=r.suggest;if((!em||!em.ok)&&r.note)c.notes.push(r.note);return}
      if(f==='linkedin'){const l=linkedinCanonical(v);if(!l&&r.note)c.notes.push(r.note);if(l)seen.add('linkedin|'+l);if(l)c.linkedins.push(l);return}
      if(f==='name'){c.name=c.name?c.name+' '+r.value:r.value;return}
      c[f]=String(r.value||'').trim();
    });
  }else{
    const f=Importer.extractFields(cells.join(' '));
    c.name=f.name;c.phones=f.phones;c.emails=f.emails;c.linkedins=f.linkedins;c.year=f.year;
  }
  return (c.name||c.phones.length||c.emails.length||c.linkedins.length)?c:null;
}
const WIZ_ACT={add:'إضافة',update:'تحديث',merge:'دمج',unchanged:'بدون تغيير',blocked:'محجوب',bad:'غير صالح'};
function renderWizardPreview(scope){
  const prev=$(WIZ_IDS[scope].preview);if(!prev)return;
  prev.innerHTML=`
    <div style="display:flex;gap:10px;flex-wrap:wrap;padding:12px;border-radius:12px;background:rgba(139,92,246,.08);margin-top:10px">
      <span><b class="num">${wizRows.length}</b> سجل</span>
      ${Object.keys(WIZ_ACT).filter(k=>wizRows.some(r=>r.result===k)).map(k=>`<span>${WIZ_ACT[k]}: <b class="num">${wizRows.filter(r=>r.result===k).length}</b></span>`).join('')}
    </div>
    <div class="tbl-wrap keep"><table><thead><tr><th>الاسم</th><th>الجوال</th><th>الإيميل</th><th>لينكد إن</th><th>دفعة</th><th>التخصص</th><th>الجهة</th><th>الإجراء</th><th>ملاحظات</th><th></th></tr></thead><tbody>
      ${wizRows.map((r,i)=>`<tr class="${r.result==='blocked'||r.result==='bad'?'row-warn':''}">
        <td class="c-edit"><input data-wi="${i}" data-wfld="name" value="${esc(r.c.name||'')}" aria-label="الاسم"></td>
        <td class="c-edit"><input dir="ltr" data-wi="${i}" data-wfld="phones" value="${esc(r.c.phones.join('، '))}" aria-label="الجوال"></td>
        <td class="c-edit"><input dir="ltr" data-wi="${i}" data-wfld="emails" value="${esc(r.c.emails.join('، '))}" aria-label="الإيميل"></td>
        <td class="c-edit"><input dir="ltr" data-wi="${i}" data-wfld="linkedins" value="${esc(r.c.linkedins.join('، '))}" aria-label="لينكد إن"></td>
        <td class="c-edit"><input class="num" data-wi="${i}" data-wfld="year" value="${esc(String(r.c.year||''))}" aria-label="الدفعة"></td>
        <td class="c-edit"><input data-wi="${i}" data-wfld="major" value="${esc(r.c.major||'')}" aria-label="التخصص"></td>
        <td class="c-edit"><input data-wi="${i}" data-wfld="company" value="${esc(r.c.company||'')}" aria-label="الجهة"></td>
        <td>${r.result==='unchanged'?'<span class="sub">بدون تغيير</span>':`<button class="fchip" data-wact="${i}">${WIZ_ACT[r.result]} ${ic('down')}</button>`}</td>
        <td class="sub">${esc(r.notes.join(' · '))}</td>
        <td><button class="icon-btn" data-wrm="${i}" aria-label="إزالة السجل من الدفعة">${ic('trash')}</button></td>
      </tr>`).join('')}
    </tbody></table></div>
    <p class="sub" style="margin-top:6px">تقدر تعدل أي خلية قبل التطبيق — الجوال/الإيميل/لينكد إن مفصولة بفاصلة.</p>
    <div class="dact-row" style="margin-top:10px">
      <button class="btn primary" data-wiz-apply="1">${ic('check')}تطبيق التغييرات</button>
      <button class="btn" data-wiz-x="1">إلغاء</button>
    </div>`;
  prev.querySelector('[data-wiz-apply]').onclick=()=>applyWizard(scope);
  prev.querySelector('[data-wiz-x]').onclick=()=>{wizRows=null;prev.innerHTML=''};
  prev.querySelectorAll('[data-wrm]').forEach(b=>b.onclick=()=>{wizRows.splice(+b.dataset.wrm,1);renderWizardPreview(scope)});
  prev.querySelectorAll('[data-wact]').forEach(b=>b.onclick=()=>{
    const r=wizRows[+b.dataset.wact];
    const cycle=r.result==='add'?['add','blocked','add']:r.result==='merge'?['merge','update','merge']:r.result==='blocked'?['blocked','add','blocked']:r.result==='update'?['update','unchanged','update']:['unchanged','add','unchanged'];
    r.result=cycle[(cycle.indexOf(r.result)+1)%cycle.length];
    r.c._action=r.result==='add'?'add':r.result==='update'?'update':r.result==='merge'?'merge':r.c._action;
    renderWizardPreview(scope);
  });
}
function wizCellInput(target){
  const i=+target.dataset.wi,f=target.dataset.wfld;
  if(isNaN(i)||!wizRows||!wizRows[i])return;
  const r=wizRows[i];const v=target.value.trim();
  if(f==='name')r.c.name=v;
  else if(f==='year')r.c.year=v.replace(/[^\d]/g,'').slice(0,4);
  else if(f==='major'||f==='company')r.c[f]=v;
  else if(f==='phones')r.c.phones=v?v.split(/[,،;؛]+/).map(x=>phoneCanonical(x.trim())).filter(Boolean):[];
  else if(f==='emails')r.c.emails=v?v.split(/[,،;؛]+/).map(x=>cleanContact('email',x)).filter(e=>e&&e.ok).map(e=>e.value):[];
  else if(f==='linkedins')r.c.linkedins=v?v.split(/[,،;\s؛]+/).map(x=>linkedinCanonical(x.trim())).filter(Boolean):[];
}
async function applyWizard(scope){
  const bad=wizRows.filter(r=>r.result==='bad').length;
  const batch=Importer.commitImport(wizRows);
  wizRows=null;
  $(WIZ_IDS[scope].preview).innerHTML='';
  const w=$('wiz');if(w)w.open=false;
  const c=batch.counts;
  const parts=[c.added&&`أضفنا ${c.added}`,c.updated&&`حدّثنا ${c.updated}`,c.merge&&`دمجنا ${c.merge}`,c.unchanged&&`${c.unchanged} بدون تغيير`,c.blocked&&`${c.blocked} محجوب`].filter(Boolean).join('، ');
  toast('انتهى الاستيراد: '+parts+(bad?` — تجاهلنا ${bad} ${bad===1?'سجلاً غير صالح':'سجلات غير صالحة'}`:''),{label:'استرجاع الدفعة',fn:()=>Repo.batchUndo(batch.id)});
  switchTab('grads');
  clearFilters();renderAll();
}
let wizRows=null;

