/* ================= Constants ================= */
const STATUS={
  new:{label:'لم يُتواصل بعد'},
  sending:{label:'قيد الإرسال'},
  wait:{label:'بانتظار الرد'},
  yes:{label:'وافق'},
  booked:{label:'تم تحديد موعد'},
  done:{label:'تمت'},
  no:{label:'اعتذر'}
};
const ORDER=['new','sending','wait','yes','booked','done','no'];
const MANUAL_STATUSES=['new','wait','yes','no'];
const MEMBERS=['جود','ريم','عبدالله','رزان','فيصل'];
const CHANNEL_AR={whatsapp:'واتساب',gmail:'Gmail',linkedin:'LinkedIn'};
const TL_KIND={
  invitation_sending:'send',invitation_sent:'check',invitation_cancelled:'x',auto_reverted:'reset',
  reminder_sent:'bell',reply_logged:'check',status_changed:'info',owner_assigned:'user',
  session_scheduled:'cal',session_done:'check',session_cancelled:'x',note_added:'edit',
  imported:'download',migration:'reset',merged:'users',do_not_contact:'lock',restored:'reset',
  purged:'trash',contact_deadline:'clock'
};
const TEMPLATE_META={
  initial:{label:'دعوة أولية',vars:['الاسم','الجهة','المسؤول','النادي','اسم الفعالية','مدة الجلسة']},
  linkedin:{label:'دعوة لينكد إن (قصيرة)',vars:['الاسم','المسؤول','النادي','اسم الفعالية','مدة الجلسة']},
  reminder:{label:'تذكير',vars:['الاسم','المسؤول','النادي','اسم الفعالية']},
  booking:{label:'تأكيد موعد',vars:['الاسم','التاريخ','الوقت','المدة','اسم الفعالية','موضوع الجلسة','المسؤول','مكان/رابط']},
  thanks:{label:'شكر بعد الجلسة',vars:['الاسم','المسؤول','النادي','موضوع الجلسة']}
};
const DEFAULT_SETTINGS={warnFriday:true,hoursWindow:['16:00','22:00'],pendingTimeoutHours:24,reminderMax:2,reminderCooldownDays:3,trashRetentionDays:30,undoDepth:20};
const KEY='ftc-grads-v2', UIKEY='ftc-grads-v2-ui', OLDKEY='ftc-grads-proto-v2', VERKEY='ftc-grads-v2-ver';
const IS_TEST=new URLSearchParams(location.search).get('test')==='1';
const IS_DEV=new URLSearchParams(location.search).get('dev')==='1';

/* ================= Template defaults (C2) ================= */
const DEFAULT_TEMPLATE_BODIES={
initial:`السلام عليكم {الاسم}،
معك {المسؤول} من {النادي} في جامعة الملك سعود.

نتشرف باستضافتك في «{اسم الفعالية}»: جلسة قصيرة تشارك فيها أعضاء النادي تجربتك من الجامعة إلى {الجهة}. المدة من {مدة الجلسة}.

المطلوب منك بس:
١. تأكيد رغبتك بالمشاركة
٢. موعدين يناسبونك خلال الأسبوعين الجايين
٣. عنوان مبدئي للجلسة

شاكرين لك وبانتظار ردك.`,
linkedin:`السلام عليكم {الاسم}، معك {المسؤول} من {النادي} — نبي نستضيفك في «{اسم الفعالية}» جلسة قصيرة تشارك فيها تجربتك من الجامعة للسوق. المطلوب بس تأكيد المشاركة وموعدين يناسبونك وعنوان مبدئي. تحت أمرك!`,
reminder:`السلام عليكم {الاسم}، معك {المسؤول} من {النادي} — تفتكر دعوتنا لجلسة «{اسم الفعالية}»؟ بنسعد لو تشارك معنا، وإذا الوقت ما يناسبك تمام عادي، بس علمنا. ملفك عنّاد.`,
booking:`تم تأكيد موعدك معنا يوم {التاريخ} الساعة {الوقت}. الجلسة {المدة} ضمن «{اسم الفعالية}»{موضوع الجلسة}.
 لو صار شيء نعلمك قبل الموعد بأي تغيير أو متأخر بفاصل بسيط. ننتظرك!`,
thanks:`الله يعطيك العافية {الاسم} على الجلسة المميزة ووقتك مع أعضاء {النادي} في «{موضوع الجلسة}». رأيك الحين بجزء من تخطيطنا للجلسات الجاية. دايم واتفضل بأي مساعدة ازرها لك!`
};
function freshTemplates(){
  const t={};
  for(const k of Object.keys(TEMPLATE_META))t[k]={versions:[{body:DEFAULT_TEMPLATE_BODIES[k],editedBy:'FTC',editedAt:nowISO()}]};
  return t;
}

/* ================= demo seed ================= */
function seedData(){
  const T=riyadhToday();
  const ev={id:'e1',name:'جلسة خريج',startedAt:addDays(T,-5),closedAt:null,status:'open'};
  const E=v=>({type:'email',value:v}),L=v=>({type:'linkedin',value:v}),P=v=>({type:'phone',value:v});
  const grads=[
    {id:'g1',name:'نورة الشهري',year:2023,major:'هندسة البرمجيات',contacts:[E('nora.alshehri@gmail.com')],company:'سدايا',role:'مهندسة تعلم آلة',status:'booked',ago:3,owner:'جود'},
    {id:'g2',name:'محمد العتيبي',year:2021,major:'علوم الحاسب',contacts:[L('m-alotaibi-dev')],company:'أرامكو السعودية',role:'مطوّر برمجيات',status:'wait',ago:5,owner:'ريم'},
    {id:'g3',name:'محمد العتيبي',year:2024,major:'هندسة البرمجيات',contacts:[P('0551234870')],company:'stc',role:'محلل بيانات',status:'new',ago:null,owner:null},
    {id:'g4',name:'ريما الدوسري',year:2022,major:'نظم المعلومات',contacts:[E('rema.dossary@gmail.com'),L('rema-aldossary')],company:'علم',role:'مديرة منتج',status:'booked',ago:6,owner:'جود'},
    {id:'g5',name:'عبدالرحمن الغامدي',year:2020,major:'علوم الحاسب',contacts:[L('abdulrahman-ghamdi')],company:'نيوم',role:'مهندس حوسبة سحابية',status:'no',ago:9,owner:'عبدالله'},
    {id:'g6',name:'سارة القحطاني',year:2025,major:'علوم الحاسب',contacts:[E('sara.qht25@gmail.com')],company:'تمارا',role:'مطوّرة واجهات',status:'wait',ago:1,owner:'رزان'},
    {id:'g7',name:'سارة القحطاني',year:2019,major:'تقنية المعلومات',contacts:[P('0509876612')],company:'الهيئة الوطنية للأمن السيبراني',role:'أخصائية أمن سيبراني',status:'yes',ago:2,owner:'رزان'},
    {id:'g8',name:'فهد الحربي',year:2023,major:'هندسة الحاسب',contacts:[P('0534410098')],company:'لوسِد موتورز',role:'مهندس أنظمة مدمجة',status:'new',ago:null,owner:null},
    {id:'g9',name:'لمى المطيري',year:2024,major:'علوم الحاسب',contacts:[L('lama-almutairi')],company:'ثمانية',role:'مهندسة بيانات',status:'wait',ago:4,owner:'جود'},
    {id:'g10',name:'خالد الزهراني',year:2021,major:'هندسة البرمجيات',contacts:[E('khalid.zahrani.dev@gmail.com')],company:'جاهز',role:'مطوّر أنظمة خلفية',status:'booked',ago:8,owner:'فيصل'},
    {id:'g11',name:'هيفاء العنزي',year:2022,major:'نظم المعلومات',contacts:[L('haifa-alanazi')],company:'KPMG',role:'مستشارة تحوّل رقمي',status:'no',ago:7,owner:'ريم'},
    {id:'g12',name:'يوسف السبيعي',year:2025,major:'علوم الحاسب',contacts:[P('0567002319')],company:'سطر (شركة ناشئة)',role:'مؤسس مشارك',status:'new',ago:null,owner:null},
    {id:'g13',name:'أمل الشمري',year:2020,major:'تقنية المعلومات',contacts:[E('amal.shammari@gmail.com')],company:'البنك الأهلي السعودي',role:'مهندسة DevOps',status:'new',ago:null,owner:'جود'},
    {id:'g14',name:'تركي البقمي',year:2023,major:'علوم الحاسب',contacts:[L('turki-albuqami'),P('0543218876')],company:'سدايا',role:'باحث ذكاء اصطناعي',status:'wait',ago:2,owner:'عبدالله'},
    {id:'g15',name:'دانة الرشيد',year:2026,major:'هندسة البرمجيات',contacts:[E('dana.alrasheed@gmail.com')],company:'كريم',role:'مطوّرة تطبيقات جوال',status:'new',ago:null,owner:null},
    {id:'g16',name:'بندر القرني',year:2019,major:'هندسة الحاسب',contacts:[P('0558890034')],company:'سابك',role:'مهندس أتمتة',status:'booked',ago:12,owner:'فيصل'},
    {id:'g17',name:'جواهر الأحمدي',year:2024,major:'نظم المعلومات',contacts:[L('jawaher-alahmadi')],company:'روشن',role:'محللة أعمال',status:'new',ago:null,owner:null},
    {id:'g18',name:'سلطان المالكي',year:2022,major:'علوم الحاسب',contacts:[E('sultan.malki@gmail.com')],company:'مايكروسوفت',role:'مهندس برمجيات',status:'no',ago:10,owner:'جود'},
    {id:'g19',name:'رهف الجهني',year:2025,major:'علوم الحاسب',contacts:[P('0591127745')],company:'الهيئة الوطنية للأمن السيبراني',role:'محللة مركز عمليات أمنية',status:'wait',ago:0,owner:'رزان'},
    {id:'g20',name:'ماجد الشهراني',year:2020,major:'هندسة البرمجيات',contacts:[L('majed-alshahrani')],company:'stc pay',role:'قائد فريق هندسي',status:'yes',ago:4,owner:'عبدالله'},
    {id:'g21',name:'شهد العمري',year:2023,major:'تقنية المعلومات',contacts:[E('shahad.alomari@gmail.com')],company:'علم',role:'مصممة تجربة مستخدم',status:'new',ago:null,owner:null},
    {id:'g22',name:'نواف الحارثي',year:2021,major:'علوم الحاسب',contacts:[P('0502231190')],company:'Savvy Games',role:'مطوّر ألعاب',status:'new',ago:null,owner:'فيصل'},
    {id:'g23',name:'غادة السهلي',year:2026,major:'علوم الحاسب',contacts:[L('ghada-alsahli')],company:'كاوست',role:'باحثة ماجستير',status:'yes',ago:1,owner:'ريم'},
    {id:'g24',name:'عمر باوزير',year:2022,major:'هندسة الحاسب',contacts:[E('omar.bawazir@gmail.com'),P('0533345521')],company:'كوالكوم',role:'مهندس عتاد',status:'wait',ago:6,owner:'جود'}
  ].map(g=>({id:g.id,name:g.name,year:g.year,major:g.major,contacts:g.contacts,company:g.company,role:g.role,
    doNotContact:false,createdFrom:'seed',createdAt:nowISO(),deletedAt:null,mergedInto:null}));
  const states={};
  grads.forEach(g=>{states[g.id+'|'+ev.id]={gradId:g.id,eventId:ev.id,status:g.status,last:g.ago==null?null:addDays(T,-g.ago),owner:g.owner}});
  const sessions=[
    {id:'s1',gradId:'g1',eventId:ev.id,date:addDays(T,1),start:'19:00',dur:60,topic:'تعلّم الآلة من المختبر إلى الإنتاج',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null},
    {id:'s2',gradId:'g4',eventId:ev.id,date:addDays(T,4),start:'18:00',dur:45,topic:'كيف تصير مدير منتج بعد التخرج',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null},
    {id:'s3',gradId:'g10',eventId:ev.id,date:addDays(T,9),start:'20:00',dur:60,topic:'بناء أنظمة تتحمل ملايين الطلبات',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null},
    {id:'s4',gradId:'g16',eventId:ev.id,date:addDays(T,-3),start:'19:30',dur:60,topic:'الأتمتة الصناعية والبرمجة',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null}
  ];
  /* demo coherence: confirmed initial invitations for non-new grads */
  const invitations=[];
  const CH={phone:'whatsapp',email:'gmail',linkedin:'linkedin'};
  grads.forEach(g=>{
    const st=states[g.id+'|'+ev.id];
    if(st.status!=='new'){
      const c=g.contacts[0]||null;
      invitations.push({id:uid('i'),gradId:g.id,eventId:ev.id,kind:'initial',channel:c?CH[c.type]:'whatsapp',
        senderId:st.owner||'جود',createdAt:addDays(T,-3)+'T19:00:00.000Z',confirmedAt:addDays(T,-3)+'T19:30:00.000Z',
        status:'confirmed',prevState:null});
    }
  });
  return {members:MEMBERS.map(m=>({id:m,name:m})),events:[ev],grads,states,invitations,timeline:[],
    sessions,templates:freshTemplates(),importBatches:[],suppressions:[],settings:{...DEFAULT_SETTINGS}};
}

/* ================= legacy migration (non-destructive) ================= */
function migrateLegacy(S){
  const T=riyadhToday();
  const ev={id:'e1',name:(S.event&&S.event.name)||'جلسة خريج',startedAt:(S.event&&S.event.started)||T,closedAt:null,status:'open'};
  const grads=(S.grads||[]).map(g=>({
    id:g.id,name:g.name,year:+g.year||2024,major:g.major||'',company:g.company||'',role:g.role||'',
    contacts:(g.contacts||[]).map(c=>{const cl=cleanContact(c.type,c.value);return cl&&cl.ok?{type:c.type,value:cl.value}:{type:c.type,value:c.value}}),
    doNotContact:false,createdFrom:'seed',createdAt:nowISO(),deletedAt:null,mergedInto:null}));
  const states={};const timeline=[];
  grads.forEach(g=>{
    const st={gradId:g.id,eventId:ev.id,status:STATUS[g.status]?g.status:'new',last:g.last||null,owner:g.owner||null};
    states[g.id+'|'+ev.id]=st;
    if(st.status!=='new'||st.last)timeline.push({id:uid('t'),gradId:g.id,eventId:ev.id,ts:nowISO(),kind:'migration',actorId:'جود',text:'تم نقل الحالة من النموذج السابق',refId:null});
  });
  const sessions=(S.sessions||[]).map(s=>({id:s.id,gradId:s.gradId,eventId:ev.id,date:s.date,start:s.start,dur:s.dur||60,topic:s.topic||'',slidesUrl:'',recordingUrl:'',notes:'',doneAt:null,deletedAt:null}));
  return {members:MEMBERS.map(m=>({id:m,name:m})),events:[ev],grads,states,invitations:[],timeline,sessions,
    templates:freshTemplates(),importBatches:[],suppressions:[],settings:{...DEFAULT_SETTINGS}};
}

