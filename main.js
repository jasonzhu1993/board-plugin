import { bitable, dashboard, DashboardState } from './sdk/index.mjs';
const TABLE_ID='tblRwLlFsupGE6JQ';
const boot=document.getElementById('boot');
function txt(v){return Array.isArray(v)?v.map(x=>x&&x.text||'').join(''):(v==null?'':String(v));}
function decode(texts){const map=new Map();for(const t of texts){const mm=/^(\d{4})\|/.exec(t||'');if(mm&&!map.has(mm[1]))map.set(mm[1],t.slice(5));}
  const keys=[...map.keys()].sort();if(!keys.length)throw new Error('未找到看板数据');const P=JSON.parse(keys.map(k=>map.get(k)).join(''));if(!P||!P.D||!P.D.K)throw new Error('看板数据不完整');return P;}
async function loadViaDashboard(){const d=await dashboard.getData();const t=[];d.forEach(r=>r.forEach(x=>{if(x&&typeof x.text==='string')t.push(x.text);if(x&&typeof x.value==='string')t.push(x.value);}));return decode(t);}
async function loadViaBitable(){const tb=await bitable.base.getTableById(TABLE_ID);const fs=await tb.getFieldMetaList();const fC=fs.find(f=>f.name==='内容').id;let rows=[],pt;
  do{const r=await tb.getRecords({pageSize:5000,pageToken:pt});rows=rows.concat(r.records);pt=r.hasMore?r.pageToken:undefined;}while(pt);
  return decode(rows.map(r=>txt(r.fields[fC])));}
async function start(){
  let P,how,errs=[];
  for(const [n,f] of [['dashboard',loadViaDashboard],['bitable',loadViaBitable]]){try{P=await f();how=n;break;}catch(e){errs.push(n+': '+(e&&e.message||e));}}
  if(!P){boot.textContent='数据读取失败：'+errs.join(' / ');return;}
  window.__how=how;
  boot_(P);
  const st=dashboard.state;
  if(st===DashboardState.Create||st===DashboardState.Config){
    const cfg=document.getElementById('cfg');cfg.style.display='block';
    document.getElementById('save').onclick=async()=>{
      try{
        const t=await bitable.base.getTableById(TABLE_ID);const fs=await t.getFieldMetaList();const fi=n=>fs.find(f=>f.name===n).id;
        await dashboard.saveConfig({customConfig:{v:1},dataConditions:[{tableId:t.id,groups:[{fieldId:fi('序号')},{fieldId:fi('内容')}],series:'COUNTA'}]});
        document.getElementById('cfgmsg').textContent='已保存';
      }catch(e){document.getElementById('cfgmsg').textContent='保存失败：'+e.message}
    };
  }
  try{await dashboard.setRendered();}catch(e){}
}

/* ---------- 时间范围：只重算工时类数字，结构/结论不变 ---------- */
const r1=x=>x==null?null:Math.round(x*10)/10;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
function isoDays(P){const y=(P.ver||'2026').slice(0,4);return P.D.days.map(d=>{const[m,dd]=d.split('/');return `${y}-${m.padStart(2,'0')}-${dd.padStart(2,'0')}`})}
function addD(s,n){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function monday(s){const d=new Date(s+'T12:00:00Z');return addD(s,-((d.getUTCDay()+6)%7))}
function derive(P0,S){
  const D0=P0.D;if(S.length===D0.days.length)return P0;
  const pa=p=>r1(mean(S.map(i=>p.ds[i]).filter(x=>x!=null&&x>=1)));
  const uniq=new Map();
  const L=D0.L.map(l=>{
    const ppl=l.ppl.map(p=>{const q={...p,avg:pa(p),ds:S.map(i=>p.ds[i])};if(q.avg!=null)uniq.set(q.n,q);return q});
    return{...l,ppl}});
  const fm={};['PD','DEV','QC','UI'].forEach(g=>{const v=[...uniq.values()].filter(p=>p.g===g).map(p=>p.avg);fm[g]=r1(mean(v))});
  const L2=L.map((l,li)=>{const act=l.ppl.filter(p=>p.avg!=null);
    const fl={};Object.keys(l.fl||{}).forEach(g=>{const a=act.filter(p=>p.g===g);if(!a.length)return;const v=r1(mean(a.map(p=>p.avg)));
      fl[g]={avg:v,n:a.length,hi:a.filter(p=>p.c>0&&p.avg>10).length,lo:a.filter(p=>p.c>0&&p.avg<8).length,d:r1(v-fm[g])}});
    const daily=S.map(i=>r1(mean(D0.L[li].ppl.map(p=>p.ds[i]).filter(x=>x!=null&&x>=1))));
    return{...l,avg:r1(mean(act.map(p=>p.avg))),na:act.length,hi:act.filter(p=>p.c>0&&p.avg>10).length,lo:act.filter(p=>p.c>0&&p.avg<8).length,fl,daily}});
  const K={...D0.K,avg:r1(mean([...uniq.values()].map(p=>p.avg))),fm};
  return{...P0,D:{...D0,K,L:L2,days:S.map(i=>D0.days[i])}};
}
let P0,RG={p:'all'};
function boot_(P){P0=P;const ds=isoDays(P);RG.a=ds[0];RG.b=ds.at(-1);
  const rg=document.getElementById('rg'),ra=document.getElementById('ra'),rb=document.getElementById('rb');
  ra.min=rb.min=ds[0];ra.max=rb.max=ds.at(-1);
  rg.onclick=e=>{const b=e.target.closest('button');if(!b)return;const p=b.dataset.p,last=ds.at(-1);let a=RG.a,z=RG.b;
    if(p==='all'){a=ds[0];z=last}else if(p==='d1'){a=z=last}else if(p==='d3'){a=addD(last,-2);z=last}
    else if(p==='tw'){a=monday(P.ver||last);z=addD(a,6)}else if(p==='lw'){a=addD(monday(P.ver||last),-7);z=addD(a,6)}
    setRange(p,a,z)};
  [ra,rb].forEach(x=>x.onchange=()=>{let a=ra.value,z=rb.value;if(a&&z){if(a>z)[a,z]=[z,a];setRange('cu',a,z)}});
  setRange('all',ds[0],ds.at(-1));
  boot.style.display='none';document.getElementById('app').style.display='block';
}
function setRange(p,a,z){const ds=isoDays(P0);const S=ds.map((d,i)=>d>=a&&d<=z?i:-1).filter(i=>i>=0);
  const rg=document.getElementById('rg'),msg=document.getElementById('rmsg');
  rg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.p===p));rg.classList.toggle('cust',p==='cu');
  document.getElementById('ra').value=a;document.getElementById('rb').value=z;
  const f=s=>s.slice(5).replace('-','/');
  if(!S.length){msg.textContent=`${f(a)}–${f(z)} 没有数据（现有 ${P0.D.days[0]}–${P0.D.days.at(-1)}），仍显示上一次选择`;return}
  msg.textContent=S.length<ds.length?`当前范围 ${P0.D.days[S[0]]}–${P0.D.days[S.at(-1)]}（${S.length} 天）`:'';
  RG={p,a,z};
  document.getElementById('cap').textContent=`口径：PMO 资源池（业务线人员表，按人力系数）× APP 使用时长 · 数据 ${(P0.ver||'').slice(0,4)}/${P0.D.days[S[0]]}–${P0.D.days[S.at(-1)]}（${S.length} 个工作日）· 每日自动更新 · 不含人力、财务`;
  const keep=window.sel;render(derive(P0,S));if(keep!=null&&keep>=0){window.sel=keep}
  if(document.getElementById('m1').classList.contains('on')){tb();dd()}
}

function render(P){

const D=P.D;const K=D.K,GN={PD:'产品',DEV:'研发',QC:'测试',UI:'设计'},GC={PD:'#5b8cff',DEV:'#8b6bff',QC:'#ffb84a',UI:'#ff8a4c'};
const BP=P.BP||{};
document.getElementById('upd').textContent='更新于 '+(P.ver||'')+' · 下次自动更新 明日 09:00';
const kp=[['业务线',K.lines,'PMO 资源池口径'],['人力系数',K.coef,K.people+' 人'],['产研比','1 : '+K.rd,'产品 : 研发'],['测开比','1 : '+K.rq,'测试 : 研发'],['人均日活跃',K.avg+'h','扣除疑似 AI 工时'],['需关注业务线','<span style="color:#ff6b66">'+K.red+'</span> <span style="font-size:15px;color:#6c768b">/</span> <span style="color:#ffb84a">'+K.amber+'</span>','🔴 卡点/不足 · 🟡 富余/配比'],['疑似 AI 工时',K.suspool+' 人','0–8 点连续≥3h 单一应用']];
document.getElementById('kpis').innerHTML=kp.map(x=>`<div class="card kpi"><div class="l">${x[0]}</div><div class="v">${x[1]}</div><div class="s">${x[2]}</div></div>`).join('');
const hc=(f,g)=>{if(!f)return '<span class="muted">—</span>';const d=f.d,bg=d>=1?'rgba(255,93,88,.38)':d>=0.5?'rgba(255,145,60,.24)':d<=-1?'rgba(78,131,253,.38)':d<=-0.5?'rgba(78,131,253,.2)':'rgba(255,255,255,.05)';return `<span class="hc" style="background:${bg}" title="${GN[g]} ${f.n} 人 · 全公司${GN[g]} ${K.fm[g]}h · 高负荷 ${f.hi} · 低负荷 ${f.lo}">${f.avg}</span><span class="muted" style="font-size:10px"> ${f.n}人</span>`};
const chips=s=>s.map(x=>`<span class="chip c${x[0]}">${x[0]}</span>`).join('');
let sel=window.sel!=null&&window.sel>=0?window.sel:D.L.findIndex(l=>l.st=='red');
const pct=(a,b)=>b?Math.round(a/b*100):0;
function tb(){document.getElementById('tb').innerHTML=D.L.map((l,i)=>`<tr class="row ${i==sel?'sel':''}" onclick="sel=${i};tb();dd();openM()"><td><span class="dot ${l.st}"></span><b>${l.name.replace('（资管&跨所&三方托管）','（资管/跨所）')}</b></td><td class="num">${l.n}</td><td class="num">${l.coef}</td><td class="num"><span class="hc" style="background:${l.rdf?'rgba(255,184,74,.2)':'transparent'}" title="产研比 = 产品:研发（人力系数）· 参考 1:3–1:5 · 全公司 1:${K.rd}${l.infra?' · 底层线，产品少属正常':''}">${l.rd?'1:'+l.rd:'—'}</span></td><td class="num"><span class="hc" style="background:${l.rqf?'rgba(255,184,74,.2)':'transparent'}" title="测开比 = 测试:研发（人力系数）· 参考 1:3–1:5（金融类偏 1:3）· 全公司 1:${K.rq}">${l.rq?'1:'+l.rq:'—'}</span></td><td class="num">${l.avg??'—'}</td><td class="num">${l.hi}<span class="muted"> / ${pct(l.hi,l.na)}%</span></td><td class="num">${l.lo}<span class="muted"> / ${pct(l.lo,l.na)}%</span></td>${['PD','DEV','QC','UI'].map(g=>`<td>${hc(l.fl[g],g)}</td>`).join('')}<td style="line-height:1.55;font-size:12.5px">${l.sig.length?chips(l.sig)+'<div style="margin-top:3px;color:#c3cad8">'+l.ai+'</div>':''}</td></tr>`).join('')}
function dd(){const l=D.L[sel];document.getElementById('ddt').innerHTML=l.name+' <span style="font-weight:400;color:#6c768b;font-size:13px">人数 '+l.n+' · 系数 '+l.coef+' · 日均 '+(l.avg??'—')+'h</span>';
const tot=Object.values(l.c).reduce((a,b)=>a+b,0);
const bar=Object.entries(l.c).filter(e=>e[1]>0).map(([g,v])=>`<i style="width:${v/tot*100}%;background:${GC[g]}"></i>`).join('');
const fx=['PD','DEV','QC','UI'].filter(g=>l.fl[g]).map(g=>{const f=l.fl[g],mx=13,mn=7,w=v=>Math.max(0,(v-mn)/(mx-mn)*100);return `<div style="display:flex;align-items:center;gap:8px;margin:6px 0"><span style="width:34px">${GN[g]}</span><div style="flex:1;position:relative;height:16px;background:rgba(255,255,255,.05);border-radius:4px"><div style="height:16px;border-radius:4px;width:${w(f.avg)}%;background:${f.d>=0.8?'#ff5d58':f.d<=-0.6?'#4e83fd':'linear-gradient(90deg,#3f63c9,#6f8fff)'}"></div><div title="全公司${GN[g]}均值" style="position:absolute;top:-3px;left:${w(K.fm[g])}%;width:2px;height:22px;background:#e6eaf2"></div></div><span class="num" style="width:150px">${f.avg}h <span class="muted">（${f.d>=0?'+':''}${f.d}，${f.n}人）</span></span></div>`}).join('');
const days=D.days,vv=l.daily.filter(v=>v!=null),mx=Math.max(...vv,10.5),mn=8,n=days.length,step=Math.min(95,360/Math.max(1,n)),bw=Math.min(44,step*.55);
const tr=`<svg width="100%" height="120" viewBox="0 0 420 120">${l.daily.map((v,i)=>{if(v==null)return '';const hgt=Math.max(2,(v-mn)/(mx-mn)*80),x=40+i*step;return `<rect x="${x}" y="${95-hgt}" width="${bw}" height="${hgt}" rx="3" fill="url(#gb)"/><text x="${x+bw/2}" y="${90-hgt}" font-size="11" text-anchor="middle">${v}</text><text class="m" x="${x+bw/2}" y="112" font-size="11" text-anchor="middle">${days[i]}</text>`}).join('')}<defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b6bff"/><stop offset="1" stop-color="#5b8cff"/></linearGradient></defs><line x1="30" x2="420" y1="${95-(K.avg-mn)/(mx-mn)*80}" y2="${95-(K.avg-mn)/(mx-mn)*80}" stroke="#6c768b" stroke-dasharray="4"/><text class="m" x="415" y="${91-(K.avg-mn)/(mx-mn)*80}" font-size="10" text-anchor="end">全公司 ${K.avg}h</text></svg>`;
const sub=Object.entries(l.sub),smax=Math.max(...sub.map(s=>s[1]));
document.getElementById('dd').innerHTML=`<div class="grid2"><div class="card"><b>信号与依据</b>${l.sig.length?l.sig.map(s=>`<div style="margin:8px 0"><span class="chip c${s[0]}">${s[0]}</span> ${s[1]}</div>`).join(''):'<div class="muted" style="margin-top:8px">配比与负荷均在正常范围</div>'}
<div style="margin-top:14px"><b>职能构成（人力系数）</b><div class="bar" style="margin-top:8px">${bar}</div><div class="lg">${Object.entries(l.c).filter(e=>e[1]>0).map(([g,v])=>`<i style="background:${GC[g]}"></i>${GN[g]} ${v}`).join('')}<span style="margin-left:10px">产研比 ${l.rd?'1:'+l.rd:'—'}（全公司 1:${K.rd}）· 测开比 ${l.rq?'1:'+l.rq:'—'}（全公司 1:${K.rq}）</span></div></div>
<div style="margin-top:14px"><b>各职能负荷 vs 全公司同职能</b><span class="muted" style="font-size:11px">（白线 = 全公司均值）</span>${fx}</div></div>
<div class="card"><b>每日人均活跃时长</b>${tr}<div style="margin-top:6px"><b>二级业务线（人力系数）</b>${sub.map(([s,v])=>`<div style="display:flex;align-items:center;gap:6px;margin:4px 0;font-size:12px"><span style="width:110px;overflow:hidden;white-space:nowrap">${s}</span><span style="flex:1;background:rgba(255,255,255,.05);height:8px;border-radius:4px"><i style="display:block;height:8px;border-radius:4px;background:linear-gradient(90deg,#14c0ff,#5b8cff);width:${v/smax*100}%"></i></span><span class="num" style="width:34px;text-align:right">${v}</span></div>`).join('')}</div></div></div>
<div class="card" style="margin-top:12px"><b>需关注人员</b><span class="muted" style="font-size:11px">（点击任意一行查看个人情况）</span>${pgrp('高负荷（日均 >10h）',l.ppl.filter(p=>p.c>0&&p.avg>10),'c卡点')}${pgrp('低负荷（日均 <8h）',l.ppl.filter(p=>p.c>0&&p.avg&&p.avg<8).sort((a,b)=>a.avg-b.avg),'c富余')}${pgrp('疑似 AI 工时（0–8 点连续 ≥3h 单一应用）',l.ppl.filter(p=>p.sus>0),'c配比')}</div>`}
function pgrp(t,a,c){if(!a.length)return `<div class="gt">${t} <span>0 人</span></div>`;window._P=window._P||{};a.forEach(p=>_P[p.n]=p);return `<div class="gt"><span class="chip ${c}">${t.split('（')[0]}</span>${t.slice(t.indexOf('（'))} <span>${a.length} 人</span></div><div class="tw s"><table><tr><th>人员</th><th>职能</th><th>二级线</th><th>系数</th><th>日均 h</th><th>${D.days[0]}–${D.days.at(-1)}</th><th>备注</th></tr>${a.map(p=>`<tr class="row" onclick='openP(${JSON.stringify(p.n)})'><td><span class="pn">${p.n}</span></td><td>${p.f}</td><td>${p.l2||'—'}</td><td class="num">${p.c}</td><td class="num">${p.avg??'—'}</td><td class="num muted">${p.ds.map(x=>x==null?'—':x).join(' / ')}</td><td class="muted" style="font-size:11.5px">${p.sus>0?p.susd:(p.note||'')}</td></tr>`).join('')}</table></div>`}
function openM(){document.getElementById('mk').classList.add('on');document.getElementById('m1').classList.add('on');document.getElementById('m1').scrollTop=0}
function closeAll(){['mk','m1','m2'].forEach(i=>document.getElementById(i).classList.remove('on'))}
function closeP(){document.getElementById('m2').classList.remove('on')}
function bpHtml(n){const rs=BP[n]||[];if(!rs.length)return '<div class="fb" style="margin-top:8px">暂无跟进记录</div>';
  const col={'重点关注':'#ff5d58','持续关注':'#ffb84a','已关闭':'#3ddc84'};
  return `<div class="tl">${rs.map(r=>`<div class="it" style="--c:${col[r[2]]||'#5b8cff'}"><div class="h"><b>${r[0]}</b><span class="chip" style="background:${(col[r[2]]||'#5b8cff')}22;color:${col[r[2]]||'#8fb0ff'}">${r[2]||'—'}</span><span class="muted">${r[1]} · 当周日均 ${r[3]||'—'}h · 高负荷/低饱和 ${r[4]||'—'} 次</span></div>${r[5]?`<div class="n">${r[5]}</div>`:''}${r[6]?`<div class="r">结论：${r[6]}</div>`:''}</div>`).join('')}</div>`}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.getElementById('m2').classList.contains('on'))closeP();else closeAll()}});
function openP(n){const p=_P[n],l=D.L[sel];const st=p.avg>10?'<span class="chip c卡点">高负荷</span>':p.avg&&p.avg<8?'<span class="chip c富余">低负荷</span>':'<span class="chip" style="background:rgba(61,220,132,.13);color:#5fe39b">正常</span>';
const vals=p.ds,nn=vals.length,mx=Math.max(...vals.map(x=>x||0),11)+0.5,mn=Math.min(6,...vals.filter(x=>x).map(x=>x-0.5)),Y=v=>110-(v-mn)/(mx-mn)*95,X=i=>nn<=1?200:50+i*(300/(nn-1));
const pts=vals.map((v,i)=>v?[X(i),Y(v),v]:null).filter(Boolean);
const bars=`<polyline fill="none" stroke="url(#gl)" stroke-width="2.5" points="${pts.map(q=>q[0]+','+q[1]).join(' ')}"/>`+vals.map((v,i)=>{const col=v>10?'#ff5d58':v&&v<8?'#4e83fd':'#3ddc84';return (v?`<circle cx="${X(i)}" cy="${Y(v)}" r="5" fill="#0e1422" stroke="${col}" stroke-width="2.5"/><text x="${X(i)}" y="${Y(v)-10}" font-size="11" text-anchor="middle">${v}</text>`:'')+`<text class="m" x="${X(i)}" y="128" font-size="11" text-anchor="middle">${D.days[i]}</text>`}).join('');
const l10=Y(10),l8=Y(8);
document.getElementById('pt').innerHTML=p.n+' '+st;
document.getElementById('pd').innerHTML=`<div class="grid2"><div class="card"><b>基本信息</b><table style="margin-top:6px"><tr><td class="muted" style="white-space:nowrap;width:90px">业务线</td><td>${l.name} · ${p.l2||'—'}</td></tr><tr><td class="muted" style="white-space:nowrap">职能</td><td>${p.f}</td></tr><tr><td class="muted" style="white-space:nowrap">人力系数</td><td>${p.c}</td></tr><tr><td class="muted" style="white-space:nowrap">日均工时</td><td><b>${p.avg??'—'}h</b>（全公司同职能 ${K.fm[p.g]}h）</td></tr><tr><td class="muted" style="white-space:nowrap">常用应用</td><td style="font-size:12px">${p.top||'—'}</td></tr>${p.sus>0?`<tr><td class="muted" style="white-space:nowrap">疑似 AI 工时</td><td style="font-size:12px">${p.sus}h · ${p.susd}（已扣除）</td></tr>`:''}${p.note?`<tr><td class="muted" style="white-space:nowrap">资源池备注</td><td>${p.note}</td></tr>`:''}</table></div>
<div class="card"><b>每日工时</b><svg width="100%" height="135" viewBox="0 0 400 135"><defs><linearGradient id="gl"><stop offset="0" stop-color="#5b8cff"/><stop offset="1" stop-color="#8b6bff"/></linearGradient></defs><line x1="20" x2="400" y1="${l10}" y2="${l10}" stroke="#ff5d58" stroke-dasharray="4" opacity=".55"/><line x1="20" x2="400" y1="${l8}" y2="${l8}" stroke="#4e83fd" stroke-dasharray="4" opacity=".55"/>${bars}</svg><div class="lg">红虚线 10h · 蓝虚线 8h</div></div></div>
<div class="card" style="margin-top:12px"><b>BP 跟进记录</b><span class="muted" style="font-size:11px">（来自 BP 助理每周跟进表，按 PMO 人员匹配，最新在上）</span>${bpHtml(p.n)}</div>`;
document.getElementById('m2').classList.add('on')}
document.getElementById('sug').innerHTML=D.SUG.map(s=>`<tr><td><span class="chip c${s.t}">${s.t}</span></td><td>${s.line.replace('（资管&跨所&三方托管）','（资管/跨所）')}</td><td>${s.s}</td><td>${s.a}</td></tr>`).join('');
document.getElementById('ai').innerHTML=P.AI.map(x=>`<div class="ac" style="border-left-color:${x[3]}"><div class="t">${x[0]}</div><div class="b">${x[1].replace(/color:#d83931/g,'color:#ff6b66').replace(/color:#c58a00/g,'color:#ffb84a')}</div><div class="s">→ ${x[2]}</div></div>`).join('');
window._P={};D.L.forEach(x=>x.ppl.forEach(p=>{if(!_P[p.n])_P[p.n]=p}));
tb();dd();

Object.assign(window,{tb,dd,openM,closeAll,closeP,openP,pgrp});
Object.defineProperty(window,'sel',{configurable:true,get:()=>sel,set:v=>{sel=v}});
}
if(window.__DEMO__)boot_(window.__DEMO__);else start().catch(e=>{boot.textContent='加载失败：'+(e&&e.message||e)});
