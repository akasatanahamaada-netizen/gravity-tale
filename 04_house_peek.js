/* ============================================================================
   ステージ：序 ── 赤ずきんの家（窓からのぞく）  id = 'house_peek'
   種類：story　マリに話しかけると、窓ごしにお使いの場面が見られる
   担当：
   ----------------------------------------------------------------------------
   このステージ専用の「窓のぞき映像」の描画も、このファイルが持っています。
   セリフ中の act 合図で映像を出し入れします：
     act:'peek-on'      … 窓の映像を開く
     act:'give-basket'  … かごを持たせる
     act:'peek-off'     … 窓の映像を閉じる
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H;

// 窓のぞき映像の状態
const peek={ on:false, alpha:0, basket:false, speaker:'', last:performance.now() };

// 会話の act 合図で映像を操作
GT.registerAct('peek-on',    ()=>{ peek.on=true; peek.basket=false; });
GT.registerAct('peek-off',   ()=>{ peek.on=false; });
GT.registerAct('give-basket',()=>{ peek.basket=true; });
// 誰がしゃべっているか（口パク用）
GT.registerLineHook(line=>{ peek.speaker=line.c||''; });
// シーンが切り替わったら必ず閉じる
GT.registerSceneReset(()=>{ peek.on=false; });

// --- 地形（story用） -------------------------------------------------------
GT.defineStage('house_peek', {
  platforms:[
    {page:'left', x:120, y:360, w:120, h:20, kind:'ledge'},
    {page:'right',x:660, y:330, w:130, h:20, kind:'ledge'},
  ],
  boxes:[], enemies:[],
});

// --- シーン ----------------------------------------------------------------
GT.registerScene({
  id:'house_peek', type:'story', stage:'house_peek', label:'序 ── 赤ずきんの家',
  intro:[
    {s:'',c:'narr',t:'崖を越えると、森のはずれに小さな家が見えた。煙突から、細い煙がのぼっている。'},
    {s:'',c:'narr',t:'家のそばに、マリが立っている。'},
  ],
  npcs:[
    { who:'mari', name:'マリ', page:'right', x:640, lines:[
      {s:'マリ',c:'mari',t:'……そう。どこまでも落ちたりしないよ。'},
      {s:'マリ',c:'mari',t:'ここ、本の中だから。ページより外には、いけないの。'},
      {s:'マリ',c:'mari',t:'――で、ここ。赤い頭巾の子が住んでる家。'},
      {s:'マリ',c:'mari',t:'話しかける前に、まず見ておいたほうがいいよ。……こっち。'},
      {s:'',c:'narr',t:'マリが、家の脇の窓を指さす。少年は背伸びして、そっと中をのぞいた。',act:'peek-on'},
      {s:'',c:'narr',t:'暖かい明かりの下に、赤い頭巾の少女と、その母親らしい女の人がいる。'},
      {s:'母親',c:'mother',t:'赤ずきん、おばあちゃんが具合を悪くしているの。お見舞いに行ってくれる？'},
      {s:'赤ずきん',c:'hood',t:'おばあちゃんが？　うん、行く！'},
      {s:'母親',c:'mother',t:'このガレットとバターの壺を、持っていってあげて。',act:'give-basket'},
      {s:'母親',c:'mother',t:'おばあちゃんのお家は、風車小屋を過ぎた先の、村のいちばん端よ。道は、わかるわね？'},
      {s:'赤ずきん',c:'hood',t:'うん、わかる。いつも通る道だもの。'},
      {s:'母親',c:'mother',t:'森では、道からそれてはだめよ。知らない人に話しかけられても、あまり立ち止まらないこと。'},
      {s:'赤ずきん',c:'hood',t:'はーい。いってきます！'},
      {s:'',c:'narr',t:'少女はかごを抱えて、戸口へ駆けていく。母親は、その背中をじっと見送っていた。'},
      {s:'母親',c:'mother',t:'……気をつけてね。'},
      {s:'',c:'narr',t:'少年は、そっと窓から離れた。',act:'peek-off'},
      {s:'マリ',c:'mari',t:'見えた？　これが、このお話のはじまり。'},
      {s:'マリ',c:'mari',t:'……お母さんは、ちゃんと言ったよ。道からそれちゃだめ、って。'},
      {s:'',c:'narr',t:'手の中の本が、かすかに温かい。虫食いのページに、一行だけ、文字が浮かんでいた。'},
    ], onEnd:()=>{ GT.fillPage('window','——窓の向こうで、母親が赤ずきんにお使いを頼んでいた。ガレットとバターの壺を、おばあさんのもとへ。'); } }
  ],
});

/* ---------- 窓ごしの映像（最前面に描く） ---------- */
function dot(x,y,r,color){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=color; ctx.fill(); }

function drawBasket(cx,cy){
  ctx.save(); ctx.translate(cx,cy);
  ctx.strokeStyle='#6b4a2b'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.arc(0,-6,11,Math.PI,0); ctx.stroke();
  ctx.fillStyle='#e8dcc0'; ctx.beginPath(); ctx.ellipse(0,-4,14,5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#d7b35c'; ctx.fillRect(2,-15,9,10);
  ctx.fillStyle='#b8823f'; ctx.beginPath(); ctx.ellipse(-6,-8,7,3,-0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-15,-4); ctx.lineTo(15,-4); ctx.lineTo(11,10); ctx.lineTo(-11,10); ctx.closePath();
  ctx.fillStyle='#8b6a43'; ctx.fill();
  ctx.strokeStyle='rgba(58,40,22,0.45)'; ctx.lineWidth=1; ctx.beginPath();
  for(let i=-9;i<=9;i+=6){ ctx.moveTo(i,-4); ctx.lineTo(i*0.75,10); } ctx.stroke();
  ctx.restore();
}
function drawPerson(x,footY,h,o){
  const bw=h*0.44, bh=h*0.56, hr=h*0.14, f=o.facing;
  const dressBottom=footY-h*0.08;
  const by=dressBottom-bh-o.bob;
  const hy=by-hr*0.85;
  ctx.save();
  for(const dx of [-0.2,0.2]){
    ctx.beginPath(); ctx.ellipse(x+bw*dx,footY-2,h*0.08,h*0.035,0,0,Math.PI*2); ctx.fillStyle='#3a2f2a'; ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(x-bw*0.32,by); ctx.lineTo(x+bw*0.32,by);
  ctx.lineTo(x+bw*0.5,dressBottom); ctx.lineTo(x-bw*0.5,dressBottom); ctx.closePath();
  ctx.fillStyle=o.dress; ctx.fill();
  if(o.apron){
    ctx.beginPath(); ctx.moveTo(x-bw*0.2,by+bh*0.25); ctx.lineTo(x+bw*0.2,by+bh*0.25);
    ctx.lineTo(x+bw*0.3,dressBottom); ctx.lineTo(x-bw*0.3,dressBottom); ctx.closePath();
    ctx.fillStyle=o.apron; ctx.fill();
  }
  if(o.cape){
    ctx.beginPath(); ctx.moveTo(x-bw*0.42,by+bh*0.04); ctx.quadraticCurveTo(x,by-bh*0.12,x+bw*0.42,by+bh*0.04);
    ctx.lineTo(x+bw*0.5,by+bh*0.5); ctx.lineTo(x-bw*0.5,by+bh*0.5); ctx.closePath();
    ctx.fillStyle=o.cape; ctx.fill();
  }
  if(o.hood){
    dot(x,hy,hr*1.32,o.hood);
    ctx.beginPath(); ctx.moveTo(x-f*hr*0.9,hy-hr*0.9); ctx.lineTo(x-f*hr*1.9,hy-hr*0.6); ctx.lineTo(x-f*hr*1.1,hy-hr*0.1);
    ctx.closePath(); ctx.fillStyle=o.hood; ctx.fill();
  }
  dot(x+f*hr*0.12,hy+hr*0.05,hr*(o.hood?0.86:1),'#ecd0a8');
  if(o.hair){
    ctx.beginPath(); ctx.arc(x,hy-hr*0.1,hr*1.04,Math.PI,0); ctx.closePath(); ctx.fillStyle=o.hair; ctx.fill();
    dot(x-f*hr*0.9,hy-hr*0.7,hr*0.45,o.hair);
  }
  const ex=x+f*hr*0.12;
  dot(ex+f*hr*0.15,hy,hr*0.09,'#2b2e4a'); dot(ex+f*hr*0.55,hy,hr*0.09,'#2b2e4a');
  if(o.talk){
    ctx.beginPath(); ctx.ellipse(ex+f*hr*0.4,hy+hr*0.45,hr*0.14,hr*(0.08+0.1*Math.abs(Math.sin(o.t*14))),0,0,Math.PI*2);
    ctx.fillStyle='#7a3b32'; ctx.fill();
  } else {
    ctx.strokeStyle='#7a3b32'; ctx.lineWidth=1.4; ctx.beginPath();
    ctx.moveTo(ex+f*hr*0.25,hy+hr*0.45); ctx.lineTo(ex+f*hr*0.6,hy+hr*0.45); ctx.stroke();
  }
  ctx.restore();
}
function drawPeekView(){
  const now=performance.now(); const dt=Math.min(0.1,(now-peek.last)/1000); peek.last=now;
  peek.alpha += ((peek.on?1:0)-peek.alpha)*Math.min(1,dt*6);
  if(!peek.on && peek.alpha<0.01){ peek.alpha=0; return; }
  const t=now/1000;
  ctx.save(); ctx.globalAlpha=peek.alpha;
  ctx.fillStyle='rgba(24,20,14,0.98)'; ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(450,165,40,450,165,330);
  glow.addColorStop(0,'rgba(255,205,120,0.30)'); glow.addColorStop(1,'rgba(255,205,120,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.beginPath(); ctx.rect(264,42,372,242); ctx.clip();
  const wall=ctx.createRadialGradient(450,170,20,450,170,260);
  wall.addColorStop(0,'#f3dfae'); wall.addColorStop(1,'#c99d63');
  ctx.fillStyle=wall; ctx.fillRect(264,42,372,242);
  ctx.fillStyle='#5a4630'; ctx.fillRect(264,42,372,14);
  ctx.strokeStyle='#57644a'; ctx.lineWidth=2; ctx.beginPath();
  for(let i=0;i<5;i++){ ctx.moveTo(326+i*3,56); ctx.lineTo(322+i*5,88); } ctx.stroke();
  ctx.fillStyle='#6b5b46'; ctx.fillRect(290,122,72,6);
  [['#b08d57',296],['#8b5e63',318],['#57644a',340]].forEach(([c,x])=>{ ctx.fillStyle=c; ctx.fillRect(x,106,14,16); });
  ctx.beginPath(); ctx.moveTo(566,268); ctx.lineTo(566,214); ctx.arc(586,214,20,Math.PI,0); ctx.lineTo(606,268); ctx.closePath();
  ctx.fillStyle='#4a3a28'; ctx.fill();
  const fl=1+0.12*Math.sin(t*9)+0.08*Math.sin(t*15);
  const hg=ctx.createRadialGradient(586,240,6,586,240,130);
  hg.addColorStop(0,'rgba(255,160,60,0.35)'); hg.addColorStop(1,'rgba(255,160,60,0)');
  ctx.fillStyle=hg; ctx.fillRect(264,42,372,242);
  ctx.beginPath(); ctx.ellipse(586,254,10*fl,17*fl,0,0,Math.PI*2); ctx.fillStyle='#ffb347'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(586,258,5*fl,9*fl,0,0,Math.PI*2); ctx.fillStyle='#fff0b0'; ctx.fill();
  ctx.fillStyle='#9b7449'; ctx.fillRect(264,262,372,22);
  ctx.strokeStyle='rgba(58,40,22,0.35)'; ctx.lineWidth=1; ctx.beginPath();
  for(let x=290;x<636;x+=46){ ctx.moveTo(x,262); ctx.lineTo(x-6,284); } ctx.stroke();
  ctx.fillStyle='#8b6a43'; ctx.fillRect(404,234,92,8);
  ctx.fillRect(410,242,6,26); ctx.fillRect(484,242,6,26);
  if(!peek.basket){
    ctx.beginPath(); ctx.ellipse(428,231,14,4,0,0,Math.PI*2); ctx.fillStyle='#b8823f'; ctx.fill();
    ctx.fillStyle='#d7b35c'; ctx.fillRect(462,222,14,12); ctx.fillStyle='#8b6a43'; ctx.fillRect(461,220,16,4);
  }
  const sp=peek.speaker;
  const mBob=sp==='mother'?Math.abs(Math.sin(t*9))*2.5:Math.sin(t*2)*0.8;
  const hBob=sp==='hood'?Math.abs(Math.sin(t*9))*2.5:Math.sin(t*2+1)*0.8;
  drawPerson(360,268,120,{dress:'#6f7f5e',apron:'#e8dcc0',hair:'#6b4a3a',facing:1,bob:mBob,talk:sp==='mother',t});
  drawPerson(540,268,92,{dress:'#4a4e6d',cape:'#b8423f',hood:'#b8423f',facing:-1,bob:hBob,talk:sp==='hood',t});
  if(peek.basket) drawBasket(514,268-92*0.34-hBob);
  const cg=ctx.createLinearGradient(264,0,290,0);
  cg.addColorStop(0,'rgba(139,94,99,0.95)'); cg.addColorStop(1,'rgba(139,94,99,0.55)');
  ctx.fillStyle=cg; ctx.fillRect(264,42,26,242);
  const cg2=ctx.createLinearGradient(636,0,610,0);
  cg2.addColorStop(0,'rgba(139,94,99,0.95)'); cg2.addColorStop(1,'rgba(139,94,99,0.55)');
  ctx.fillStyle=cg2; ctx.fillRect(610,42,26,242);
  const vg=ctx.createRadialGradient(450,163,150,450,163,260);
  vg.addColorStop(0,'rgba(50,30,15,0)'); vg.addColorStop(1,'rgba(50,30,15,0.38)');
  ctx.fillStyle=vg; ctx.fillRect(264,42,372,242);
  ctx.fillStyle='rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.moveTo(300,42); ctx.lineTo(370,42); ctx.lineTo(264,150); ctx.lineTo(264,100); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.rect(250,28,400,270); ctx.rect(264,42,372,242);
  ctx.fillStyle='#3a2f2a'; ctx.fill('evenodd');
  ctx.fillRect(446,42,8,242);
  ctx.strokeStyle='rgba(232,220,192,0.14)'; ctx.lineWidth=1;
  ctx.strokeRect(264.5,42.5,371,241);
  ctx.fillStyle='#4a3f2c'; ctx.fillRect(236,296,428,16);
  ctx.fillStyle='rgba(232,220,192,0.18)'; ctx.fillRect(236,296,428,2);
  for(let i=0;i<8;i++){
    ctx.save(); ctx.translate(244+i*9,302+(i%2)*9); ctx.rotate(i*0.7);
    ctx.beginPath(); ctx.ellipse(0,0,7,3.6,0,0,Math.PI*2); ctx.fillStyle=i%2?'#46543b':'#57644a'; ctx.fill(); ctx.restore();
  }
  for(let i=0;i<6;i++){
    ctx.save(); ctx.translate(648-i*8,34+(i%2)*7); ctx.rotate(-i*0.8);
    ctx.beginPath(); ctx.ellipse(0,0,7,3.6,0,0,Math.PI*2); ctx.fillStyle=i%2?'#57644a':'#46543b'; ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
GT.registerDraw(drawPeekView,'overlay');
})();
