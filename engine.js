/* ============================================================================
   Gravity Tale ── 共通エンジン (engine.js)
   ----------------------------------------------------------------------------
   ここは「ゲームの土台」です。物理・移動・会話・ページめくり・描画などの
   仕組みが入っています。ふつうステージを作るときは、このファイルは触りません。

   ステージ側（stages/ の各ファイル）からは、下の GT.* の関数を呼ぶだけで
   自分のステージを登録できます。主なものは：

     GT.defineStage(id, def)     … ステージの地形（足場・箱・敵）を登録
     GT.registerScene(scene)     … シーン（1画面ぶんの進行）を登録
     GT.definePages(list)        … 「本」に並ぶページ見出しを登録（まとめて）
     GT.fillPage(key, text)      … そのページに文章を書き込む（進行中に呼ぶ）

   拡張したい人向け（ボス戦などの特別な仕掛けを足すとき）：
     GT.registerSceneType(type, fn)  GT.registerDynamic(name, fn)
     GT.registerUpdate(fn)           GT.registerDraw(fn, phase)
     GT.registerAct(name, fn)        GT.registerLineHook(fn)
     GT.registerSceneReset(fn)       GT.registerFlipIntercept(fn)
     GT.registerModeUpdate(mode, fn) GT.physicsModes / GT.flipModes
   ========================================================================== */
(function(){
"use strict";

const GT = (window.GT = window.GT || {});

/* ---- 画面・定数 ---------------------------------------------------------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height, SPINE = W/2;
const EDGE = 16;
const GRAVITY=2200, ACCEL=3400, FRICTION=3000, MAX_SPEED=300, JUMP_SPEED=720;
const ENEMY_SPEED=90;
const TALK_RANGE=74;                 // この距離まで近づくと「はなす」が出る
const FLIP_DUR=0.95;                 // ページめくり演出の長さ(秒)

GT.canvas=canvas; GT.ctx=ctx; GT.W=W; GT.H=H; GT.SPINE=SPINE; GT.EDGE=EDGE;
GT.GRAVITY=GRAVITY; GT.ENEMY_SPEED=ENEMY_SPEED;

/* ---- 共有する状態（ステージ/拡張側からも読み書きする） ------------------ */
GT.gravity   = {left:1, right:1};
GT.player    = {x:60,y:H-EDGE-34,w:26,h:34,vx:0,vy:0,onGround:false,facing:1,squash:1};
GT.platforms = [];
GT.boxes     = [];
GT.enemies   = [];
GT.goal      = null;
GT.mode      = 'talk';               // 'play' / 'boss' / 'qte' / 'idle' など
GT.scene     = null;
GT.sceneIndex= 0;
GT.SCENES    = [];
GT.invincible= 0;
GT.hurtFlash = 0;
GT.flags     = {};                   // ストーリー分岐のフラグ（ステージ側が自由に使う）

const player_start = {x:60,y:H-EDGE-34};

/* ---- 登録テーブル（各ステージ・拡張がここに積む） ------------------------ */
GT.STAGE_DEFS      = {};             // id -> 地形定義
GT.sceneRegistry   = {};             // id -> シーン定義
GT.playlist        = [];             // シーンidの並び順（playlist.js が設定）
GT.pageRecord      = [];             // 本のページ一覧

const sceneTypeHandlers = {};        // type -> fn(scene)
const dynamicHandlers   = {};        // name -> fn(scene)
const updatePasses      = [];        // fn(dt) 物理モード中に毎フレーム
const modeUpdaters      = {};        // mode -> fn(dt) そのモード専用の更新
const drawWorld         = [];        // fn() プレイヤーより後ろに描く
const drawOverlay       = [];        // fn() 画面の最前面に描く
const actHooks          = {};        // name -> fn()  会話行の act 合図
const lineHooks         = [];        // fn(line)      会話行が表示される度
const sceneResets       = [];        // fn()          シーン開始時に呼ぶ
const flipIntercepts    = [];        // fn()->bool    反転キーを横取りする

GT.physicsModes = new Set(['play']); // この mode のとき物理を動かす
GT.flipModes    = new Set(['play']); // この mode のとき本を裏返せる

GT.defineStage        = (id,def)=>{ GT.STAGE_DEFS[id]=def; };
GT.registerScene      = (s)=>{ if(s&&s.id) GT.sceneRegistry[s.id]=s; };
GT.definePages        = (list)=>{ GT.pageRecord = list.map(p=>({key:p.key,title:p.title,filled:false,text:''})); };
GT.fillPage           = (key,text)=>{ const p=GT.pageRecord.find(p=>p.key===key); if(p){p.filled=true;p.text=text;} };
GT.registerSceneType  = (t,fn)=>{ sceneTypeHandlers[t]=fn; };
GT.registerDynamic    = (n,fn)=>{ dynamicHandlers[n]=fn; };
GT.registerUpdate     = (fn)=>{ updatePasses.push(fn); };
GT.registerModeUpdate = (m,fn)=>{ modeUpdaters[m]=fn; };
GT.registerDraw       = (fn,phase)=>{ (phase==='overlay'?drawOverlay:drawWorld).push(fn); };
GT.registerAct        = (n,fn)=>{ actHooks[n]=fn; };
GT.registerLineHook   = (fn)=>{ lineHooks.push(fn); };
GT.registerSceneReset = (fn)=>{ sceneResets.push(fn); };
GT.registerFlipIntercept = (fn)=>{ flipIntercepts.push(fn); };

/* ---- 本のへりに置く不可視の壁（ページの外に出ないようにする） ------------ */
const edges=[
  {page:'left', x:0,       y:0,       w:SPINE, h:EDGE, kind:'ceilingEdge'},
  {page:'left', x:0,       y:H-EDGE,  w:SPINE, h:EDGE, kind:'floorEdge'},
  {page:'left', x:0,       y:0,       w:EDGE,  h:H,    kind:'wallEdge'},
  {page:'right',x:SPINE,   y:0,       w:SPINE, h:EDGE, kind:'ceilingEdge'},
  {page:'right',x:SPINE,   y:H-EDGE,  w:SPINE, h:EDGE, kind:'floorEdge'},
  {page:'right',x:W-EDGE,  y:0,       w:EDGE,  h:H,    kind:'wallEdge'},
];

/* ---- 紙のテクスチャ ------------------------------------------------------ */
const paper=document.createElement('canvas'); paper.width=W; paper.height=H;
(function(){
  const p=paper.getContext('2d');
  const grad=p.createLinearGradient(0,0,0,H); grad.addColorStop(0,'#efe4c8'); grad.addColorStop(1,'#e2d3ab');
  p.fillStyle=grad; p.fillRect(0,0,W,H);
  for(let i=0;i<2200;i++){ const x=Math.random()*W,y=Math.random()*H,a=Math.random()*0.05;
    p.fillStyle=Math.random()>0.5?`rgba(120,100,60,${a})`:`rgba(255,250,230,${a})`; p.fillRect(x,y,1.4,1.4); }
  const vg=p.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.9);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(58,50,38,0.25)');
  p.fillStyle=vg; p.fillRect(0,0,W,H);
})();

/* ---- エンジン内部の状態 -------------------------------------------------- */
let goalPulse=0;
let stageExit=false;                 // 右端まで歩いて抜けるとクリアになるステージか
let flipping=false, flipT=0, flipSwapped=false;
let pageNo=1;                        // 何ページ目まで進んだか
let storyStage=false, npcs=[], activeNpc=null, storyTalking=false, prevJump=false;
let storyExitReady=false;            // 話し終えて、右端へ歩けば次へ進める状態か
const flashPage={left:0,right:0};
const keys={};

/* ---- ステージ読み込み ---------------------------------------------------- */
GT.loadStageDef = function(def, opt){
  opt=opt||{};
  def=def||{};
  stageExit=!!opt.exit;
  storyStage=false; npcs=[]; activeNpc=null; storyTalking=false; storyExitReady=false;
  GT.gravity={left:1,right:1};
  const baseEdges = stageExit ? edges.filter(e=>!(e.page==='right'&&e.kind==='wallEdge')) : edges;
  GT.platforms = baseEdges.concat((def.platforms||[]).map(p=>({...p})));
  GT.boxes = (def.boxes||[]).map(b=>({x:b.x,y:b.y,w:b.w,h:b.h,vx:0,vy:0,onGround:false,squash:1}));
  GT.enemies = (def.enemies||[]).map(e=>({page:e.page,x:e.x,y:e.y,w:e.w,h:e.h,dir:e.dir,
    minX:e.page==='left'?EDGE:SPINE, maxX:e.page==='left'?SPINE:(W-EDGE),
    vy:0,onGround:false,alive:true,squash:1,deathT:0}));
  GT.goal = (def.goal && !stageExit)?{...def.goal}:null;
  const pl=GT.player;
  pl.x=player_start.x; pl.y=player_start.y; pl.vx=0; pl.vy=0; pl.squash=1;
  flashPage.left=0; flashPage.right=0; updateHud();
};

/* ---- ちいさなユーティリティ（拡張側からも使う） ------------------------- */
GT.pageOf        = e => (e.x+e.w/2)<SPINE ? 'left' : 'right';
GT.currentPage   = () => (GT.player.x+GT.player.w/2)<SPINE ? 'left' : 'right';
GT.pagePlatforms = page => GT.platforms.filter(p=>p.page===page);
GT.rectsOverlap  = (a,b)=> a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;

/* ---- 入力 ---------------------------------------------------------------- */
window.addEventListener('keydown',e=>{ keys[e.key]=true;
  if(e.key==='f'||e.key==='F'||e.code==='Space'){ onFlipKey(); e.preventDefault(); } });
window.addEventListener('keyup',e=>keys[e.key]=false);

function flipCurrentPage(){ const p=GT.currentPage(); GT.gravity[p]*=-1; flashPage[p]=1; updateHud(); }
function onFlipKey(){
  if(flipping) return;
  for(const f of flipIntercepts){ if(f()) return; }     // QTE などが横取り
  if(GT.flipModes.has(GT.mode)){ flipCurrentPage(); }
}
GT.onFlipKey = onFlipKey;

function updateHud(){
  document.getElementById('hudLeft').textContent='← 左：'+(GT.gravity.left===1?'通常':'反転');
  document.getElementById('hudRight').textContent='右：'+(GT.gravity.right===1?'通常':'反転')+' →';
}
function setHudStage(t){ document.getElementById('hudStage').textContent=t; }
GT.setHudStage=setHudStage;

function bindHold(id,on,off){ const el=document.getElementById(id);
  el.addEventListener('pointerdown',e=>{e.preventDefault();on();});
  el.addEventListener('pointerup',e=>off&&off());
  el.addEventListener('pointerleave',e=>off&&off()); }
bindHold('btnLeft',()=>keys['ArrowLeft']=true,()=>keys['ArrowLeft']=false);
bindHold('btnRight',()=>keys['ArrowRight']=true,()=>keys['ArrowRight']=false);
bindHold('btnJump',()=>keys['ArrowUp']=true,()=>keys['ArrowUp']=false);
document.getElementById('btnFlip').addEventListener('pointerdown',e=>{e.preventDefault();onFlipKey();});

/* ---- シーン進行 ---------------------------------------------------------- */
function startScene(idx){
  GT.sceneIndex=idx; GT.scene=GT.SCENES[idx]; const scene=GT.scene; if(!scene) return;
  for(const r of sceneResets) r();                      // 例：窓のぞき映像を閉じる
  if(scene.dynamic && dynamicHandlers[scene.dynamic]){ dynamicHandlers[scene.dynamic](scene); return; }
  if(sceneTypeHandlers[scene.type]){ sceneTypeHandlers[scene.type](scene); return; }
  if(scene.type==='talk'){
    if(scene.stage) GT.loadStageDef(GT.STAGE_DEFS[scene.stage]); GT.mode='idle';
    setHudStage(scene.label||'');
    beginDialogue(scene.lines||[], scene.choices, ()=>{ if(scene.onEnd) scene.onEnd(); advanceScene(); });
  } else if(scene.type==='play'){
    GT.loadStageDef(GT.STAGE_DEFS[scene.stage], {exit: scene.clear==='exit'});
    setHudStage((scene.label||'')+'　·　p.'+pageNo);
    if(scene.intro){ GT.mode='idle'; beginDialogue([scene.intro],null,()=>{ hideDialogue(); GT.mode='play'; }); }
    else { GT.mode='play'; }
  } else if(scene.type==='story'){
    GT.loadStageDef(GT.STAGE_DEFS[scene.stage], {exit:false});
    storyStage=true; setupNpcs(scene.npcs);
    setHudStage((scene.label||'')+'　·　p.'+pageNo);
    const intro = scene.intro ? (Array.isArray(scene.intro)?scene.intro:[scene.intro]) : null;
    if(intro){ GT.mode='idle'; beginDialogue(intro,null,()=>{ hideDialogue(); GT.mode='play'; }); }
    else { GT.mode='play'; }
  } else {
    // 未知のタイプ：とりあえず会話だけ流す
    GT.mode='idle'; beginDialogue(scene.lines||[], scene.choices, ()=>advanceScene());
  }
}
function advanceScene(){ startScene(GT.sceneIndex+1); }
function injectSceneAfterCurrent(sc){ GT.SCENES.splice(GT.sceneIndex+1,0,sc); }
GT.startScene=startScene; GT.advanceScene=advanceScene; GT.injectSceneAfterCurrent=injectSceneAfterCurrent;

/* ---- ステージ上のキャラ（NPC）に話しかけて進むしくみ --------------------- */
GT.getNpcs=()=>npcs;   // 動作確認用に公開
GT.dbg=()=>({storyStage,storyTalking,flipping,stageExit,storyExitReady});
function setupNpcs(defs){
  npcs=(defs||[]).map(d=>({
    who:d.who, name:d.name||'', page:d.page||'right', x:d.x, w:d.w||32, h:d.h||40,
    lines:d.lines||null, choices:d.choices||null, onEnd:d.onEnd||null,
    talkable:!!(d.lines), talked:false
  }));
  activeNpc=null; storyTalking=false;
}
function tryTalk(){
  if(!storyStage || storyTalking || flipping) return;
  const n=activeNpc; if(!n || !n.lines) return;
  storyTalking=true; GT.player.vx=0;
  beginDialogue(n.lines, n.choices, ()=>{
    storyTalking=false; hideDialogue();
    if(n.onEnd) n.onEnd();
    n.talked=true;
    // 自動ではめくらない。右端まで自分で歩いたら次ページへ。
    stageExit=true; storyExitReady=true;
    GT.platforms = GT.platforms.filter(p=>!(p.page==='right'&&p.kind==='wallEdge'));
  });
}

/* ---- ページめくり演出 ---------------------------------------------------- */
function startPageFlip(){
  if(flipping) return;
  flipping=true; flipT=0; flipSwapped=false;
  GT.player.vx=0; GT.player.vy=0;
}
GT.startPageFlip=startPageFlip;

/* ========================================================================== */
/*  会話エンジン                                                              */
/* ========================================================================== */
const dlg=document.getElementById('dlg');
const dlgSpeaker=document.getElementById('dlgSpeaker');
const dlgLine=document.getElementById('dlgLine');
const dlgChoices=document.getElementById('dlgChoices');
const dlgHint=document.getElementById('dlgHint');
let dq=[], dChoices=null, dOnComplete=null;
let typing=false, typeTarget='', typeI=0, typeAcc=0;
let choicesShown=false;

function beginDialogue(lines,choices,onComplete){
  dq=(lines||[]).slice(); dChoices=choices||null; dOnComplete=onComplete||null;
  choicesShown=false;
  dlg.classList.add('show'); dlgChoices.innerHTML=''; nextLine();
}
function nextLine(){
  dlgChoices.innerHTML='';
  if(dq.length===0){ if(dChoices){ showChoices(dChoices); return; } dlgHint.style.display='none'; finishDialogue(); return; }
  const line=dq.shift();
  for(const h of lineHooks) h(line);
  if(line.act && actHooks[line.act]) actHooks[line.act]();
  dlgSpeaker.className='speaker '+(line.c||''); dlgSpeaker.textContent=line.s||'';
  typing=true; typeTarget=line.t||''; typeI=0; typeAcc=0; dlgLine.textContent=''; dlgHint.style.display='block';
}
function showChoices(choices){
  choicesShown=true;
  dlgSpeaker.textContent=''; dlgLine.textContent=''; dlgHint.style.display='none'; dlgChoices.innerHTML='';
  choices.forEach(ch=>{
    const b=document.createElement('button'); b.className='choice'; b.textContent=ch.label;
    b.addEventListener('click',()=>{ if(ch.set) ch.set(); dChoices=null; choicesShown=false;
      const resolvedAfter = typeof ch.after==='function' ? ch.after() : ch.after;
      dq = resolvedAfter ? resolvedAfter.slice() : []; if(dq.length){ nextLine(); } else { finishDialogue(); } });
    dlgChoices.appendChild(b);
  });
}
function finishDialogue(){ const cb=dOnComplete; dOnComplete=null; if(cb) cb(); }
function hideDialogue(){ dlg.classList.remove('show'); }
function tryAdvanceDialogue(){
  if(!dlg.classList.contains('show')) return false;
  if(choicesShown) return false;
  if(typing){ dlgLine.textContent=typeTarget; typing=false; return true; }
  nextLine(); return true;
}
GT.beginDialogue=beginDialogue; GT.hideDialogue=hideDialogue;

canvas.addEventListener('pointerdown',e=>{
  if(dlg.classList.contains('show')){ e.preventDefault(); tryAdvanceDialogue(); return; }
  if(activeNpc && !storyTalking && !flipping){ e.preventDefault(); tryTalk(); }
});
dlg.addEventListener('pointerdown',e=>{
  if(e.target.closest('.choice')) return;
  e.preventDefault(); tryAdvanceDialogue();
});
window.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key==='z'||e.key==='Z')){
    if(dlg.classList.contains('show')){ e.preventDefault(); tryAdvanceDialogue(); }
    else if(activeNpc && !storyTalking && !flipping){ e.preventDefault(); tryTalk(); }
  }
});

/* タイプライター表示 */
function typeTick(dt){
  if(!typing) return; typeAcc+=dt; const cps=42;
  while(typeAcc>1/cps && typeI<typeTarget.length){ typeAcc-=1/cps; typeI++; }
  dlgLine.textContent=typeTarget.slice(0,typeI); if(typeI>=typeTarget.length) typing=false;
}
let ttLast=performance.now();
function typeLoop(now){ const dt=(now-ttLast)/1000; ttLast=now; typeTick(dt); requestAnimationFrame(typeLoop); }

/* ========================================================================== */
/*  物理                                                                      */
/* ========================================================================== */
let lastTime=performance.now();
function loop(now){ let dt=(now-lastTime)/1000; dt=Math.min(dt,1/30); lastTime=now; update(dt); render(); requestAnimationFrame(loop); }

function update(dt){
  const player=GT.player, gravity=GT.gravity, boxes=GT.boxes, enemies=GT.enemies;
  goalPulse+=dt;
  flashPage.left=Math.max(0,flashPage.left-dt*2.2);
  flashPage.right=Math.max(0,flashPage.right-dt*2.2);
  GT.hurtFlash=Math.max(0,GT.hurtFlash-dt*2.5);
  GT.invincible=Math.max(0,GT.invincible-dt);

  if(flipping){
    flipT+=dt;
    if(!flipSwapped && flipT>=FLIP_DUR*0.5){ flipSwapped=true; pageNo++; advanceScene(); }
    if(flipT>=FLIP_DUR){ flipping=false; }
    return;
  }

  if(modeUpdaters[GT.mode]){ modeUpdaters[GT.mode](dt); return; }
  if(!GT.physicsModes.has(GT.mode)) return;
  if(storyTalking) return;

  if(storyStage){
    activeNpc=null; let best=1e9;
    const pcx=player.x+player.w/2, pcy=player.y+player.h/2;
    for(const n of npcs){ if(!n.talkable||n.talked) continue;
      const nx=n.x+n.w/2, ny=(H-EDGE)-n.h/2;
      const d=Math.hypot(pcx-nx, pcy-ny);
      if(d<TALK_RANGE && d<best){ best=d; activeNpc=n; }
    }
  } else activeNpc=null;
  GT.activeNpc=activeNpc;   // 動作確認用に公開

  const page=GT.currentPage(); const g=gravity[page];
  const left=keys['ArrowLeft']||keys['a']||keys['A'];
  const right=keys['ArrowRight']||keys['d']||keys['D'];
  if(left&&!right){ player.vx-=ACCEL*dt; player.facing=-1; }
  else if(right&&!left){ player.vx+=ACCEL*dt; player.facing=1; }
  else{ const d=FRICTION*dt; if(Math.abs(player.vx)<=d) player.vx=0; else player.vx-=Math.sign(player.vx)*d; }
  player.vx=Math.max(-MAX_SPEED,Math.min(MAX_SPEED,player.vx));

  player.vy+=GRAVITY*g*dt;
  const jump=keys['ArrowUp']||keys['w']||keys['W'];
  const jumpEdge = jump && !prevJump; prevJump=jump;
  if(activeNpc && jumpEdge){ tryTalk(); }
  else if(jump&&player.onGround){ player.vy=-JUMP_SPEED*g; player.onGround=false; }

  for(const box of boxes){
    const bg=gravity[GT.pageOf(box)]; box.vy+=GRAVITY*bg*dt;
    const d=FRICTION*dt; if(Math.abs(box.vx)<=d) box.vx=0; else box.vx-=Math.sign(box.vx)*d;
    box.vx=Math.max(-MAX_SPEED,Math.min(MAX_SPEED,box.vx));
  }

  const prevX=player.x; player.x+=player.vx*dt; const dx=player.x-prevX;
  if(dx!==0){ for(const box of boxes){ if(GT.rectsOverlap(player,box)){ box.x+=dx; box.vx=player.vx; } } }
  for(const box of boxes) resolveBodyCollisions(box,'x',GT.pagePlatforms(GT.pageOf(box)));
  resolveBodyCollisions(player,'x',GT.pagePlatforms(page).concat(boxes));

  for(const en of enemies){
    if(!en.alive){ en.deathT+=dt; en.squash+=(1-en.squash)*Math.min(1,dt*4); continue; }
    const active=(en.page===GT.currentPage()); const eg=gravity[en.page];
    if(active){ en.x+=en.dir*ENEMY_SPEED*dt;
      if(en.x<en.minX){ en.x=en.minX; en.dir=1; }
      if(en.x+en.w>en.maxX){ en.x=en.maxX-en.w; en.dir=-1; } }
    en.vy+=GRAVITY*eg*dt; en.y+=en.vy*dt; en.onGround=false;
    resolveBodyCollisions(en,'y',GT.pagePlatforms(en.page)); en.squash+=(1-en.squash)*Math.min(1,dt*10);
  }

  for(const box of boxes){
    box.y+=box.vy*dt; box.onGround=false;
    resolveBodyCollisions(box,'y',GT.pagePlatforms(GT.pageOf(box))); box.squash+=(1-box.squash)*Math.min(1,dt*10);
    for(const en of enemies){
      if(!en.alive||en.page!==GT.pageOf(box)) continue; const eg=gravity[en.page];
      if(GT.rectsOverlap(box,en)&&box.vy*eg>150){ en.alive=false; en.squash=0.18; en.vy=0; en.deathT=0;
        box.y=(eg===1)?en.y-box.h:en.y+en.h; box.vy=0; box.onGround=true; box.squash=1.3; }
    }
  }

  player.y+=player.vy*dt; player.onGround=false;
  resolveBodyCollisions(player,'y',GT.pagePlatforms(page).concat(boxes));

  if(GT.invincible<=0){ for(const en of enemies){ if(en.alive&&GT.rectsOverlap(player,en)){ GT.respawnPlayer(); break; } } }

  for(const fn of updatePasses) fn(dt);     // ボス戦など拡張の更新

  if(GT.goal&&GT.rectsOverlap(player,GT.goal)){ startPageFlip(); }
  if(GT.mode==='play'&&stageExit&&!flipping&&(player.x+player.w/2)>=W-8){ startPageFlip(); }

  player.x=Math.max(-40,Math.min(W+40,player.x));
  player.y=Math.max(-400,Math.min(H+400,player.y));
  player.squash+=(1-player.squash)*Math.min(1,dt*10);
}

GT.respawnPlayer=function(){ const pl=GT.player;
  pl.x=player_start.x; pl.y=player_start.y; pl.vx=0; pl.vy=0; pl.squash=0.6; GT.hurtFlash=1; GT.invincible=1.0; };

function resolveBodyCollisions(body,axis,colliders){
  for(const plat of colliders){
    if(plat===body) continue; if(!GT.rectsOverlap(body,plat)) continue;
    if(axis==='x'){ if(body.vx>0) body.x=plat.x-body.w; else if(body.vx<0) body.x=plat.x+plat.w; body.vx=0; }
    else{
      const g = GT.gravity[GT.pageOf(body)];
      if(body.vy>0){ body.y=plat.y-body.h; body.vy=0; if(g===1){ body.onGround=true; body.squash=1.28; } }
      else if(body.vy<0){ body.y=plat.y+plat.h; body.vy=0; if(g===-1){ body.onGround=true; body.squash=1.28; } }
    }
  }
}
GT.resolveBodyCollisions=resolveBodyCollisions;

/* ========================================================================== */
/*  描画                                                                      */
/* ========================================================================== */
function roundRect(x,y,w,h,r){ ctx.beginPath(); roundRectPath(x,y,w,h,r); }
function roundRectPath(x,y,w,h,r){ ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
GT.roundRect=roundRect; GT.roundRectPath=roundRectPath;

function drawGravityIcon(cx,cy,dir,glow){
  ctx.save(); ctx.translate(cx,cy);
  if(glow>0){ ctx.shadowColor='rgba(176,141,87,0.9)'; ctx.shadowBlur=14*glow; }
  ctx.strokeStyle='#5a4a2e'; ctx.lineWidth=2.2; ctx.beginPath();
  if(dir===1){ ctx.moveTo(0,-8); ctx.lineTo(0,8); ctx.moveTo(-5,3); ctx.lineTo(0,8); ctx.lineTo(5,3); }
  else{ ctx.moveTo(0,8); ctx.lineTo(0,-8); ctx.moveTo(-5,-3); ctx.lineTo(0,-8); ctx.lineTo(5,-3); }
  ctx.stroke(); ctx.restore();
}
function drawPageEdges(){
  ctx.save(); const T=22;
  function eb(x,y,w,h,gx0,gy0,gx1,gy1,color){ const g=ctx.createLinearGradient(gx0,gy0,gx1,gy1); g.addColorStop(0,color); g.addColorStop(1,'rgba(58,50,38,0)'); ctx.fillStyle=g; ctx.fillRect(x,y,w,h); }
  eb(0,H-T,W,T,0,H,0,H-T,'rgba(87,100,74,0.5)');
  eb(0,0,W,T,0,0,0,T,'rgba(43,46,74,0.4)');
  eb(0,0,T,H,0,0,T,0,'rgba(176,141,87,0.35)');
  eb(W-T,0,T,H,W,0,W-T,0,'rgba(176,141,87,0.35)');
  ctx.strokeStyle='rgba(58,50,38,0.6)'; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(EDGE,EDGE); ctx.lineTo(SPINE,EDGE); ctx.moveTo(EDGE,H-EDGE); ctx.lineTo(SPINE,H-EDGE); ctx.moveTo(EDGE,EDGE); ctx.lineTo(EDGE,H-EDGE); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(SPINE,EDGE); ctx.lineTo(W-EDGE,EDGE); ctx.moveTo(SPINE,H-EDGE); ctx.lineTo(W-EDGE,H-EDGE); ctx.moveTo(W-EDGE,EDGE); ctx.lineTo(W-EDGE,H-EDGE); ctx.stroke();
  ctx.restore();
}
function drawPlayer(){
  const player=GT.player; const page=GT.currentPage(); const g=GT.gravity[page];
  ctx.save(); if(GT.invincible>0){ ctx.globalAlpha=(Math.floor(GT.invincible*16)%2===0)?0.4:1; }
  ctx.translate(player.x+player.w/2,player.y+player.h/2); ctx.scale(player.facing,g);
  const sx=player.squash, sy=2-player.squash; const hw=(player.w/2)*sx, hh=(player.h/2)*sy;
  ctx.beginPath(); ctx.fillStyle='#2b2e4a'; roundRectPath(-hw,-hh,hw*2,hh*2,9); ctx.fill();
  ctx.fillStyle='#b08d57'; ctx.beginPath(); ctx.moveTo(-4,-hh); ctx.lineTo(0,-hh-9); ctx.lineTo(4,-hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#e8dcc0'; ctx.beginPath(); ctx.arc(-5,-2,2.4,0,Math.PI*2); ctx.arc(5,-2,2.4,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawEnemy(en){
  const eg=GT.gravity[en.page]; ctx.save();
  const sx=en.squash, sy=2-en.squash; const hw=(en.w/2)*sx, hh=(en.h/2)*sy;
  ctx.translate(en.x+en.w/2,en.y+en.h/2); ctx.scale(en.dir>=0?1:-1,eg);
  if(!en.alive){ ctx.globalAlpha=Math.max(0.25,1-en.deathT*0.6); ctx.beginPath(); roundRectPath(-hw*1.3,-hh*0.35,hw*2.6,hh*0.7,5); ctx.fillStyle='#4a4e6d'; ctx.fill(); ctx.restore(); return; }
  ctx.beginPath(); roundRectPath(-hw,-hh,hw*2,hh*2,7); ctx.fillStyle='#3a2f2a'; ctx.fill();
  ctx.fillStyle='#3a2f2a'; ctx.beginPath(); ctx.moveTo(hw-6,-hh); ctx.lineTo(hw-2,-hh-8); ctx.lineTo(hw+2,-hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#c9503f'; ctx.beginPath(); ctx.arc(hw-8,-2,2.2,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawGoal(){
  const goal=GT.goal; if(!goal) return; const g=GT.gravity[goal.page]; const pulse=0.5+0.5*Math.sin(goalPulse*3);
  ctx.save(); ctx.translate(goal.x+goal.w/2,goal.y+goal.h/2); ctx.scale(1,g);
  ctx.shadowColor='rgba(176,141,87,0.9)'; ctx.shadowBlur=10+6*pulse;
  const hw=goal.w/2,hh=goal.h/2; ctx.beginPath();
  ctx.moveTo(-hw,-hh); ctx.lineTo(hw,-hh); ctx.lineTo(hw,hh); ctx.lineTo(0,hh-6); ctx.lineTo(-hw,hh); ctx.closePath();
  ctx.fillStyle='#b08d57'; ctx.fill(); ctx.strokeStyle='rgba(58,50,38,0.6)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.restore();
}
function drawBox(box){
  ctx.save(); const sx=box.squash, sy=2-box.squash; const hw=(box.w/2)*sx, hh=(box.h/2)*sy;
  ctx.translate(box.x+box.w/2,box.y+box.h/2);
  ctx.beginPath(); roundRectPath(-hw,-hh,hw*2,hh*2,6); ctx.fillStyle='#8b5e63'; ctx.fill();
  ctx.strokeStyle='rgba(43,46,74,0.35)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.strokeStyle='rgba(232,220,192,0.5)'; ctx.lineWidth=2; ctx.beginPath();
  ctx.moveTo(-hw+4,-hh+4); ctx.lineTo(hw-4,hh-4); ctx.moveTo(hw-4,-hh+4); ctx.lineTo(-hw+4,hh-4); ctx.stroke();
  ctx.restore();
}
/* ステージ上のキャラ（NPC） */
function drawNpc(n){
  const footY=H-EDGE;
  const bob=Math.sin(goalPulse*2.2 + n.x*0.05)*2.2;
  const cx=n.x+n.w/2;
  const face=(GT.player.x<n.x)?-1:1;
  ctx.save();
  if(n.who==='wolf'){
    const bw=n.w+8, bh=n.h*0.62, cy=footY-bh/2-6+bob;
    ctx.translate(cx,cy); ctx.scale(face,1);
    ctx.fillStyle='#3a2f2a';
    ctx.fillRect(-bw/2+4,bh/2-2,6,10); ctx.fillRect(bw/2-10,bh/2-2,6,10);
    ctx.beginPath(); roundRectPath(-bw/2,-bh/2,bw,bh,8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bw/2-12,-bh/2); ctx.lineTo(bw/2-6,-bh/2-11); ctx.lineTo(bw/2,-bh/2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); roundRectPath(bw/2-8,-bh*0.12,bw*0.38,bh*0.34,4); ctx.fillStyle='#2c231f'; ctx.fill();
    ctx.fillStyle='#c9503f'; ctx.beginPath(); ctx.arc(bw/2-12,-bh*0.14,2.6,0,Math.PI*2); ctx.fill();
  } else {
    const hw=n.w/2, hh=n.h/2, cy=footY-hh+bob;
    ctx.translate(cx,cy);
    const col=(n.who==='mari')?'#4a4e6d':'#2b2e4a';
    ctx.beginPath(); roundRectPath(-hw,-hh,n.w,n.h,9); ctx.fillStyle=col; ctx.fill();
    if(n.who==='hood'){
      ctx.fillStyle='#b8423f';
      ctx.beginPath(); ctx.moveTo(-hw,-hh*0.1); ctx.lineTo(hw,-hh*0.1); ctx.lineTo(hw*0.7,hh*0.9); ctx.lineTo(-hw*0.7,hh*0.9); ctx.closePath(); ctx.globalAlpha=0.92; ctx.fill(); ctx.globalAlpha=1;
      ctx.beginPath(); ctx.arc(0,-hh,hw*0.95,Math.PI,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-hw*0.9*face,-hh*1.0); ctx.lineTo(-hw*1.7*face,-hh*0.7); ctx.lineTo(-hw*0.9*face,-hh*0.55); ctx.closePath(); ctx.fill();
    } else if(n.who==='mari'){
      ctx.fillStyle='#a9b0d6'; ctx.beginPath(); ctx.moveTo(-4,-hh); ctx.lineTo(0,-hh-9); ctx.lineTo(4,-hh); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle='#e8dcc0'; ctx.beginPath();
    ctx.arc(-5*face,-hh*0.35,2.4,0,Math.PI*2); ctx.arc(5*face,-hh*0.35,2.4,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
  if(n.name){ ctx.save(); ctx.font="600 11px 'Zen Old Mincho',serif"; ctx.textAlign='center';
    ctx.fillStyle='rgba(74,70,60,0.85)'; ctx.fillText(n.name, cx, footY-n.h-12+bob); ctx.restore(); }
  if(n===activeNpc && !storyTalking){
    const p=0.5+0.5*Math.sin(goalPulse*5);
    ctx.save(); ctx.textAlign='center'; ctx.globalAlpha=0.65+0.35*p;
    ctx.fillStyle='#b08d57'; ctx.font="700 13px 'Zen Old Mincho',serif";
    ctx.fillText('▲ はなす', cx, footY-n.h-28+bob);
    ctx.restore();
  }
}

function render(){
  const gravity=GT.gravity;
  ctx.clearRect(0,0,W,H); ctx.drawImage(paper,0,0);
  ctx.fillStyle='rgba(87,100,74,0.05)'; ctx.fillRect(0,0,SPINE,H);
  ctx.fillStyle='rgba(139,94,99,0.05)'; ctx.fillRect(SPINE,0,SPINE,H);
  if(gravity.left===-1){ ctx.fillStyle='rgba(43,46,74,0.06)'; ctx.fillRect(0,0,SPINE,H); }
  if(gravity.right===-1){ ctx.fillStyle='rgba(43,46,74,0.06)'; ctx.fillRect(SPINE,0,SPINE,H); }
  const sg=ctx.createLinearGradient(SPINE-16,0,SPINE+16,0);
  sg.addColorStop(0,'rgba(58,50,38,0)'); sg.addColorStop(0.5,'rgba(58,50,38,0.35)'); sg.addColorStop(1,'rgba(58,50,38,0)');
  ctx.fillStyle=sg; ctx.fillRect(SPINE-16,0,32,H);
  drawPageEdges();
  for(const plat of GT.platforms){
    if(plat.kind!=='ledge'&&plat.kind!=='ceilingLedge') continue;
    const inv=gravity[plat.page]===-1;
    ctx.save(); roundRect(plat.x,plat.y,plat.w,plat.h,9); ctx.fillStyle='#6b5b46'; ctx.fill();
    ctx.fillStyle='rgba(232,220,192,0.28)';
    if(!inv) ctx.fillRect(plat.x+4,plat.y+2,plat.w-8,3); else ctx.fillRect(plat.x+4,plat.y+plat.h-5,plat.w-8,3);
    ctx.restore();
  }
  drawGravityIcon(SPINE/2,20,gravity.left,flashPage.left);
  drawGravityIcon(SPINE+SPINE/2,20,gravity.right,flashPage.right);
  drawGoal();
  for(const box of GT.boxes) drawBox(box);
  for(const en of GT.enemies) drawEnemy(en);
  if(storyStage) for(const n of npcs) drawNpc(n);
  if(storyStage && storyExitReady && !flipping && !storyTalking){
    const p=0.5+0.5*Math.sin(goalPulse*4);
    ctx.save(); ctx.textAlign='right'; ctx.globalAlpha=0.55+0.45*p;
    ctx.fillStyle='#b08d57'; ctx.font="700 16px 'Zen Old Mincho',serif";
    ctx.fillText('右の端へ →', W-26, H/2);
    ctx.restore();
  }
  for(const fn of drawWorld) fn();          // ボスなど（プレイヤーより後ろ）
  drawPlayer();
  if(GT.hurtFlash>0){ ctx.fillStyle=`rgba(139,20,20,${GT.hurtFlash*0.35})`; ctx.fillRect(0,0,W,H); }
  if(flipping) drawFlip();
  for(const fn of drawOverlay) fn();         // 窓のぞきなど（最前面）
}

/* ページめくり演出 */
function drawFlip(){
  const p=Math.min(1,flipT/FLIP_DUR);
  const ang=p*Math.PI; const c=Math.cos(ang);
  const half=SPINE*Math.abs(c); const dim=Math.sin(p*Math.PI);
  ctx.save();
  ctx.fillStyle=`rgba(28,22,14,${0.30*dim})`; ctx.fillRect(0,0,W,H);
  const edgeX = (c>=0) ? SPINE+half : SPINE-half;
  const bend = 14*(1-Math.abs(c));
  ctx.beginPath();
  ctx.moveTo(SPINE,EDGE);
  ctx.bezierCurveTo((SPINE+edgeX)/2, EDGE-bend, (SPINE+edgeX)/2, EDGE-bend, edgeX, EDGE+bend*0.6);
  ctx.lineTo(edgeX,H-EDGE-bend*0.6);
  ctx.bezierCurveTo((SPINE+edgeX)/2, H-EDGE+bend, (SPINE+edgeX)/2, H-EDGE+bend, SPINE, H-EDGE);
  ctx.closePath();
  const grd=ctx.createLinearGradient(SPINE,0,edgeX,0);
  grd.addColorStop(0,'#d7c69c'); grd.addColorStop(0.5,'#efe4c8'); grd.addColorStop(1,'#cbb88f');
  ctx.fillStyle=grd; ctx.fill();
  const sh=ctx.createLinearGradient(SPINE,0,edgeX,0);
  sh.addColorStop(0,'rgba(58,45,30,0.30)'); sh.addColorStop(0.35,'rgba(58,45,30,0)');
  ctx.fillStyle=sh; ctx.fill();
  ctx.strokeStyle='rgba(255,250,235,0.55)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(edgeX,EDGE+bend*0.6); ctx.lineTo(edgeX,H-EDGE-bend*0.6); ctx.stroke();
  ctx.globalAlpha=dim; ctx.fillStyle='rgba(74,70,60,0.95)';
  ctx.font="600 20px 'Zen Old Mincho', serif"; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('ページをめくる…', W/2, H-38);
  ctx.restore();
}

/* ========================================================================== */
/*  本モーダル（読み返し）                                                    */
/* ========================================================================== */
const bookModal=document.getElementById('bookModal');
function openBookModal(){
  const list=document.getElementById('pageList'); list.innerHTML='';
  GT.pageRecord.forEach(p=>{
    const div=document.createElement('div'); div.className='page-entry'+(p.filled?'':' empty');
    const worm=p.filled?'':'<span class="wormhole">◌ ◌ ◌ ◌ ◌ ◌</span>';
    div.innerHTML=`<div class="title">${p.title}</div><div class="body">${ p.filled?escapeHtml(p.text):'（虫食い ── まだ埋まっていない）<br>'+worm }</div>`;
    list.appendChild(div);
  });
  bookModal.classList.add('show');
}
function escapeHtml(s){ return s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
GT.openBookModal=openBookModal;
document.getElementById('openBook').addEventListener('click',openBookModal);
document.getElementById('closeBook').addEventListener('click',()=>bookModal.classList.remove('show'));
bookModal.addEventListener('click',e=>{ if(e.target===bookModal) bookModal.classList.remove('show'); });

/* ========================================================================== */
/*  起動（全ステージとplaylistが読み込まれた後に自動で走る）                  */
/* ========================================================================== */
GT.boot=function(){
  // playlist の id 順に、登録済みシーンを並べて SCENES を作る
  GT.SCENES = GT.playlist.map(id=>{
    const s=GT.sceneRegistry[id];
    if(!s) console.warn('[Gravity Tale] playlist のID「'+id+'」に対応するシーンが登録されていません');
    return s;
  }).filter(Boolean);
  startScene(0);
  requestAnimationFrame(loop);
  requestAnimationFrame(typeLoop);
};
document.addEventListener('DOMContentLoaded',()=>GT.boot());

})();
