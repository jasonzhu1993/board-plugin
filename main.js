import { bitable, dashboard, DashboardState } from './sdk/index.mjs';
const TABLE_ID='tblRwLlFsupGE6JQ';
const boot=document.getElementById('boot');
function txt(v){return Array.isArray(v)?v.map(x=>x&&x.text||'').join(''):(v==null?'':String(v));}
async function loadViaBitable(){
  const t=await bitable.base.getTableById(TABLE_ID);
  const fs=await t.getFieldMetaList();const fi=n=>fs.find(f=>f.name===n).id;
  const fSeq=fi('序号'),fC=fi('内容');let rows=[],pt;
  do{const r=await t.getRecords({pageSize:5000,pageToken:pt});rows=rows.concat(r.records);pt=r.hasMore?r.pageToken:undefined;}while(pt);
  rows.sort((a,b)=>Number(txt(a.fields[fSeq]))-Number(txt(b.fields[fSeq])));
  return {json:rows.map(r=>txt(r.fields[fC])).join(''),tableId:t.id,fSeq,fC};
}
async function loadViaDashboard(){
  const d=await dashboard.getData();
  const rows=d.slice(1).map(r=>[Number(r[0].value??r[0].text),r[1].text??r[1].value]);
  rows.sort((a,b)=>a[0]-b[0]);return {json:rows.map(r=>r[1]).join('')};
}
async function start(){
  let res,how;
  try{res=await loadViaBitable();how='bitable';}catch(e1){
    try{res=await loadViaDashboard();how='dashboard';}catch(e2){boot.textContent='数据读取失败：'+e1.message+' / '+e2.message;throw e2;}}
  const P=JSON.parse(res.json);
  window.__how=how;
  render(P);
  boot.style.display='none';document.getElementById('app').style.display='block';
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
function render(P){

const D=P.D;const K=D.K,GN={PD:'产品',DEV:'研发',QC:'测试',UI:'设计'},GC={PD:'#3370ff',DEV:'#7f3bf5',QC:'#ffb000',UI:'#ff7d00'};
document.getElementById('upd').textContent='更新于 2026-11-20 · 下次自动更新 明日 09:00';
const kp=[['业务线',K.lines,'PMO 资源池口径'],['人力系数',K.coef,K.people+' 人'],['产研比','1 : '+K.rd,'产品 : 研发'],['测开比','1 : '+K.rq,'测试 : 研发'],['人均日活跃',K.avg+'h','扣除疑似 AI 工时'],['需关注业务线','<span style="color:#d83931">'+K.red+'</span> <span style="font-size:15px;color:#8f959e">/</span> <span style="color:#c58a00">'+K.amber+'</span>','🔴 卡点/不足 · 🟡 富余/配比'],['疑似 AI 工时',K.suspool+' 人','0–8 点连续≥3h 单一应用']];
document.getElementById('kpis').innerHTML=kp.map(x=>`<div class="card kpi"><div class="l">${x[0]}</div><div class="v">${x[1]}</div><div class="s">${x[2]}</div></div>`).join('');
const hc=(f,g)=>{if(!f)return '<span class="muted">—</span>';const d=f.d,bg=d>=1?'#fbd0ce':d>=0.5?'#fde8d4':d<=-1?'#d6ecff':d<=-0.5?'#e8f3ff':'#f2f3f5';return `<span class="hc" style="background:${bg}" title="${GN[g]} ${f.n} 人 · 全公司${GN[g]} ${K.fm[g]}h · 高负荷 ${f.hi} · 低负荷 ${f.lo}">${f.avg}</span><span class="muted" style="font-size:10px"> ${f.n}人</span>`};
const chips=s=>s.map(x=>`<span class="chip c${x[0]}">${x[0]}</span>`).join('');
let sel=D.L.findIndex(l=>l.st=='red');
function tb(){document.getElementById('tb').innerHTML=D.L.map((l,i)=>`<tr class="row ${i==sel?'sel':''}" onclick="sel=${i};tb();dd();openM()"><td><span class="dot ${l.st}"></span><b>${l.name.replace('（资管&跨所&三方托管）','（资管/跨所）')}</b></td><td class="num">${l.n}</td><td class="num">${l.coef}</td><td class="num"><span class="hc" style="background:${l.rdf?'#fdf0d8':'transparent'}" title="产研比 = 产品:研发（人力系数）· 参考 1:3–1:5 · 全公司 1:${K.rd}${l.infra?' · 底层线，产品少属正常':''}">${l.rd?'1:'+l.rd:'—'}</span></td><td class="num"><span class="hc" style="background:${l.rqf?'#fdf0d8':'transparent'}" title="测开比 = 测试:研发（人力系数）· 参考 1:3–1:5（金融类偏 1:3）· 全公司 1:${K.rq}">${l.rq?'1:'+l.rq:'—'}</span></td><td class="num">${l.avg}</td><td class="num">${l.hi}<span class="muted"> / ${Math.round(l.hi/l.na*100)}%</span></td><td class="num">${l.lo}<span class="muted"> / ${Math.round(l.lo/l.na*100)}%</span></td>${['PD','DEV','QC','UI'].map(g=>`<td>${hc(l.fl[g],g)}</td>`).join('')}<td style="line-height:1.55;font-size:12.5px">${l.sig.length?chips(l.sig)+'<div style="margin-top:3px">'+l.ai+'</div>':''}</td></tr>`).join('')}
function dd(){const l=D.L[sel];document.getElementById('ddt').innerHTML=l.name+' <span style="font-weight:400;color:#8f959e;font-size:13px">人数 '+l.n+' · 系数 '+l.coef+' · 日均 '+l.avg+'h</span>';
const tot=Object.values(l.c).reduce((a,b)=>a+b,0);
const bar=Object.entries(l.c).filter(e=>e[1]>0).map(([g,v])=>`<i style="width:${v/tot*100}%;background:${GC[g]}"></i>`).join('');
const fx=['PD','DEV','QC','UI'].filter(g=>l.fl[g]).map(g=>{const f=l.fl[g],mx=13,mn=7,w=v=>Math.max(0,(v-mn)/(mx-mn)*100);return `<div style="display:flex;align-items:center;gap:8px;margin:6px 0"><span style="width:34px">${GN[g]}</span><div style="flex:1;position:relative;height:16px;background:#f2f3f5;border-radius:4px"><div style="height:16px;border-radius:4px;width:${w(f.avg)}%;background:${f.d>=0.8?'#f54a45':f.d<=-0.6?'#4e83fd':'#8fb4ff'}"></div><div title="全公司${GN[g]}均值" style="position:absolute;top:-3px;left:${w(K.fm[g])}%;width:2px;height:22px;background:#1f2329"></div></div><span class="num" style="width:150px">${f.avg}h <span class="muted">（${f.d>=0?'+':''}${f.d}，${f.n}人）</span></span></div>`}).join('');
const days=D.days,mx=Math.max(...l.daily,10.5),mn=8;
const tr=`<svg width="100%" height="120" viewBox="0 0 420 120">${l.daily.map((v,i)=>{const hgt=Math.max(2,(v-mn)/(mx-mn)*80);return `<rect x="${40+i*95}" y="${95-hgt}" width="44" height="${hgt}" rx="3" fill="#3370ff"/><text x="${62+i*95}" y="${90-hgt}" font-size="11" text-anchor="middle">${v}</text><text x="${62+i*95}" y="112" font-size="11" fill="#8f959e" text-anchor="middle">${days[i]}</text>`}).join('')}<line x1="30" x2="420" y1="${95-(K.avg-mn)/(mx-mn)*80}" y2="${95-(K.avg-mn)/(mx-mn)*80}" stroke="#bbbfc4" stroke-dasharray="4"/><text x="415" y="${91-(K.avg-mn)/(mx-mn)*80}" font-size="10" fill="#8f959e" text-anchor="end">全公司 ${K.avg}h</text></svg>`;
const sub=Object.entries(l.sub),smax=Math.max(...sub.map(s=>s[1]));
const ab=l.ppl.filter(p=>p.avg&&(p.avg>10||p.avg<8)||p.sus>0).slice(0,14);
document.getElementById('dd').innerHTML=`<div class="grid2"><div class="card"><b>信号与依据</b>${l.sig.length?l.sig.map(s=>`<div style="margin:8px 0"><span class="chip c${s[0]}">${s[0]}</span> ${s[1]}</div>`).join(''):'<div class="muted" style="margin-top:8px">配比与负荷均在正常范围</div>'}
<div style="margin-top:14px"><b>职能构成（人力系数）</b><div class="bar" style="margin-top:8px">${bar}</div><div class="lg">${Object.entries(l.c).filter(e=>e[1]>0).map(([g,v])=>`<i style="background:${GC[g]}"></i>${GN[g]} ${v}`).join('')}<span style="margin-left:10px">产研比 ${l.rd?'1:'+l.rd:'—'}（全公司 1:${K.rd}）· 测开比 ${l.rq?'1:'+l.rq:'—'}（全公司 1:${K.rq}）</span></div></div>
<div style="margin-top:14px"><b>各职能负荷 vs 全公司同职能</b><span class="muted" style="font-size:11px">（黑线 = 全公司均值）</span>${fx}</div></div>
<div class="card"><b>每日人均活跃时长</b>${tr}<div style="margin-top:6px"><b>二级业务线（人力系数）</b>${sub.map(([s,v])=>`<div style="display:flex;align-items:center;gap:6px;margin:4px 0;font-size:12px"><span style="width:110px;overflow:hidden;white-space:nowrap">${s}</span><span style="flex:1;background:#f2f3f5;height:8px;border-radius:4px"><i style="display:block;height:8px;border-radius:4px;background:#14c0ff;width:${v/smax*100}%"></i></span><span class="num" style="width:34px;text-align:right">${v}</span></div>`).join('')}</div></div></div>
<div class="card" style="margin-top:12px"><b>需关注人员</b><span class="muted" style="font-size:11px">（点击任意一行查看个人情况）</span>${pgrp('高负荷（日均 >10h）',l.ppl.filter(p=>p.c>0&&p.avg>10),'c卡点')}${pgrp('低负荷（日均 <8h）',l.ppl.filter(p=>p.c>0&&p.avg&&p.avg<8).sort((a,b)=>a.avg-b.avg),'c富余')}${pgrp('疑似 AI 工时（0–8 点连续 ≥3h 单一应用）',l.ppl.filter(p=>p.sus>0),'c配比')}</div>`}
function pgrp(t,a,c){if(!a.length)return `<div class="gt">${t} <span>0 人</span></div>`;window._P=window._P||{};a.forEach(p=>_P[p.n]=p);return `<div class="gt"><span class="chip ${c}">${t.split('（')[0]}</span>${t.slice(t.indexOf('（'))} <span>${a.length} 人</span></div><table><tr><th>人员</th><th>职能</th><th>二级线</th><th>系数</th><th>日均 h</th><th>11/16–11/19</th><th>备注</th></tr>${a.map(p=>`<tr class="row" onclick='openP(${JSON.stringify(p.n)})'><td><span class="pn">${p.n}</span></td><td>${p.f}</td><td>${p.l2||'—'}</td><td class="num">${p.c}</td><td class="num">${p.avg??'—'}</td><td class="num muted">${p.ds.map(x=>x==null?'—':x).join(' / ')}</td><td class="muted" style="font-size:11.5px">${p.sus>0?p.susd:(p.note||'')}</td></tr>`).join('')}</table>`}
function openM(){document.getElementById('mk').classList.add('on');document.getElementById('m1').classList.add('on');document.getElementById('m1').scrollTop=0}
function closeAll(){['mk','m1','m2'].forEach(i=>document.getElementById(i).classList.remove('on'))}
function closeP(){document.getElementById('m2').classList.remove('on')}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.getElementById('m2').classList.contains('on'))closeP();else closeAll()}});
function openP(n){const p=_P[n],l=D.L[sel];const st=p.avg>10?'<span class="chip c卡点">高负荷</span>':p.avg&&p.avg<8?'<span class="chip c富余">低负荷</span>':'<span class="chip" style="background:#e3f6e9;color:#2ea121">正常</span>';
const vals=p.ds,mx=Math.max(...vals.map(x=>x||0),11)+0.5,mn=Math.min(6,...vals.filter(x=>x).map(x=>x-0.5)),Y=v=>110-(v-mn)/(mx-mn)*95,X=i=>50+i*100;
const pts=vals.map((v,i)=>v?[X(i),Y(v),v]:null).filter(Boolean);
const bars=`<polyline fill="none" stroke="#3370ff" stroke-width="2.5" points="${pts.map(q=>q[0]+','+q[1]).join(' ')}"/>`+vals.map((v,i)=>{const col=v>10?'#f54a45':v&&v<8?'#4e83fd':'#34c724';return (v?`<circle cx="${X(i)}" cy="${Y(v)}" r="5" fill="#fff" stroke="${col}" stroke-width="2.5"/><text x="${X(i)}" y="${Y(v)-10}" font-size="11" text-anchor="middle">${v}</text>`:'')+`<text x="${X(i)}" y="128" font-size="11" fill="#8f959e" text-anchor="middle">${D.days[i]}</text>`}).join('');
const l10=Y(10),l8=Y(8);
document.getElementById('pt').innerHTML=p.n+' '+st;
document.getElementById('pd').innerHTML=`<div class="grid2"><div class="card"><b>基本信息</b><table style="margin-top:6px"><tr><td class="muted" style="white-space:nowrap;width:90px">业务线</td><td>${l.name} · ${p.l2||'—'}</td></tr><tr><td class="muted" style="white-space:nowrap">职能</td><td>${p.f}</td></tr><tr><td class="muted" style="white-space:nowrap">人力系数</td><td>${p.c}</td></tr><tr><td class="muted" style="white-space:nowrap">日均工时</td><td><b>${p.avg??'—'}h</b>（全公司同职能 ${K.fm[p.g]}h）</td></tr><tr><td class="muted" style="white-space:nowrap">常用应用</td><td style="font-size:12px">${p.top||'—'}</td></tr>${p.sus>0?`<tr><td class="muted" style="white-space:nowrap">疑似 AI 工时</td><td style="font-size:12px">${p.sus}h · ${p.susd}（已扣除）</td></tr>`:''}${p.note?`<tr><td class="muted" style="white-space:nowrap">资源池备注</td><td>${p.note}</td></tr>`:''}</table></div>
<div class="card"><b>每日工时</b><svg width="100%" height="135" viewBox="0 0 400 135"><line x1="20" x2="400" y1="${l10}" y2="${l10}" stroke="#f54a45" stroke-dasharray="4" opacity=".5"/><line x1="20" x2="400" y1="${l8}" y2="${l8}" stroke="#4e83fd" stroke-dasharray="4" opacity=".5"/>${bars}</svg><div class="lg">红虚线 10h · 蓝虚线 8h</div></div></div>
<div class="card" style="margin-top:12px"><b>BP 跟进记录</b><span class="muted" style="font-size:11px">（预留：BP 助理填写后自动同步到这里）</span><div class="fb" style="margin-top:8px">暂无跟进记录</div></div>`;
document.getElementById('m2').classList.add('on')}
document.getElementById('sug').innerHTML=D.SUG.map(s=>`<tr><td><span class="chip c${s.t}">${s.t}</span></td><td>${s.line.replace('（资管&跨所&三方托管）','（资管/跨所）')}</td><td>${s.s}</td><td>${s.a}</td></tr>`).join('');
document.getElementById('ai').innerHTML=P.AI.map(x=>`<div class="ac" style="border-color:${x[3]}"><div class="t">${x[0]}</div><div class="b">${x[1]}</div><div class="s">→ ${x[2]}</div></div>`).join('');
tb();dd();

Object.assign(window,{tb,dd,openM,closeAll,closeP,openP,pgrp});
Object.defineProperty(window,'sel',{get:()=>sel,set:v=>{sel=v}});
}
start().catch(e=>{boot.textContent='加载失败：'+(e&&e.message||e)});
