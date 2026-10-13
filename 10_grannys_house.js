/* ============================================================================
   ステージ：第一話 ── おばあさんの家（結末）  id = 'arrive' / 'ending'
   種類：talk(到着) → boss or qte(injectで差し込み) → end(結末)
   担当：
   ----------------------------------------------------------------------------
   このファイルは、この話の「特別な仕掛け」をまとめて持っています：
     ・狼とのボス戦（spawnWolf / updateWolf / 箱で攻撃）
     ・QTE（1.6秒以内に本を裏返す）
     ・到着シーン arriveHouse（分岐で boss か qte を差し込む）
     ・結末 result（flags.route / flags.saved から文章を決める）

   ふつうのステージ作りでは、ここまで触る必要はありません。
   新しいボスや仕掛けを足したい人は、ここを参考にしてください。
   仕組み：GT.registerSceneType / registerDynamic / registerUpdate /
          registerDraw / registerModeUpdate / registerFlipIntercept
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H, EDGE=GT.EDGE, SPINE=GT.SPINE;

// ボス戦では mode='boss' のあいだ、物理と反転を有効にする
GT.physicsModes.add('boss');
GT.flipModes.add('boss');

// --- おばあさんの家の地形（到着/QTE/ボス戦で共通して使う） ----------------
GT.defineStage('wolf_boss', {
  label:'第一話 ── おばあさんの家',
  platforms:[
    {page:'left', x:120, y:340, w:120, h:20, kind:'ledge'},
    {page:'left', x:250, y:90,  w:170, h:20, kind:'ceilingLedge'},
    {page:'right',x:520, y:300, w:120, h:20, kind:'ledge'},
    {page:'right',x:700, y:150, w:130, h:20, kind:'ledge'},
    {page:'right',x:560, y:90,  w:150, h:20, kind:'ceilingLedge'},
  ],
  boxes:[{x:300,y:H-EDGE-34,w:34,h:34},{x:640,y:H-EDGE-34,w:34,h:34}],
  enemies:[],
});

/* ========================== 狼（ボス） ================================== */
let wolf=null;
GT.getBoss=()=>wolf;   // 現在の狼を取り出す（デバッグ・動作確認用）
function spawnWolf(advantaged){
  wolf={ x:SPINE+120, y:H-EDGE-52, w:44, h:36, dir:-1,
    hp:advantaged?2:3, maxhp:3, vy:0, vx:0, onGround:false, page:'right',
    stun:0, hitFlash:0, alive:true, deathT:0, squash:1, lungeCD:1.4 };
}
function damageWolf(source){
  if(!wolf||!wolf.alive) return;
  wolf.hp-=1; wolf.hitFlash=1; wolf.stun=0.7; wolf.squash=0.6;
  wolf.dir=(source&&source.x<wolf.x)?1:-1; wolf.vy=-260;
  if(wolf.hp<=0){ defeatWolf(); }
}
function defeatWolf(){
  wolf.alive=false; wolf.deathT=0; wolf.squash=0.2;
  const hollow=GT.scene&&GT.scene.hollow;
  setTimeout(()=>{ GT.flags.saved = hollow?false:true; GT.mode='idle'; GT.advanceScene(); },900);
}
function updateWolf(dt){
  const gravity=GT.gravity, player=GT.player;
  wolf.hitFlash=Math.max(0,wolf.hitFlash-dt*2.5); wolf.page=GT.pageOf(wolf);
  const wg=gravity[wolf.page];
  if(!wolf.alive){ wolf.deathT+=dt; return; }
  if(wolf.stun>0){ wolf.stun-=dt; }
  else{
    wolf.lungeCD-=dt; const dir=(player.x<wolf.x)?-1:1; wolf.dir=dir;
    wolf.x+=dir*(GT.ENEMY_SPEED*1.3)*dt;
    if(wolf.lungeCD<=0&&wolf.onGround){ wolf.vy=-520*wg; wolf.vx=dir*260; wolf.lungeCD=1.6; }
  }
  wolf.vy+=GT.GRAVITY*wg*dt; wolf.x+=(wolf.vx||0)*dt; wolf.vx=(wolf.vx||0)*0.9;
  wolf.y+=wolf.vy*dt; wolf.onGround=false;
  if(wolf.x<EDGE){ wolf.x=EDGE; } if(wolf.x+wolf.w>W-EDGE){ wolf.x=W-EDGE-wolf.w; }
  GT.resolveBodyCollisions(wolf,'y',GT.pagePlatforms(wolf.page));
  wolf.squash+=(1-wolf.squash)*Math.min(1,dt*8);
  if(GT.invincible<=0&&wolf.alive&&wolf.stun<=0&&GT.rectsOverlap(player,wolf)){ GT.respawnPlayer(); }
}

// 毎フレーム：落ちてくる箱が狼に当たればダメージ。そのあと狼を動かす。
GT.registerUpdate(dt=>{
  if(GT.mode!=='boss'||!wolf) return;
  if(wolf.alive){
    const wg=GT.gravity[wolf.page];
    for(const box of GT.boxes){
      if(GT.rectsOverlap(box,wolf)&&box.vy*wg>140&&wolf.stun<=0){ damageWolf(box); box.vy=-box.vy*0.3; box.squash=1.3; }
    }
  }
  updateWolf(dt);
});

// 狼の描画（プレイヤーより後ろ）
function drawWolf(){
  if(!wolf) return; const wg=GT.gravity[wolf.page]; ctx.save();
  const sx=wolf.squash, sy=2-wolf.squash; const hw=(wolf.w/2)*sx, hh=(wolf.h/2)*sy;
  ctx.translate(wolf.x+wolf.w/2,wolf.y+wolf.h/2); ctx.scale(wolf.dir>=0?1:-1,wg);
  if(!wolf.alive){ ctx.globalAlpha=Math.max(0.2,1-wolf.deathT*0.5); ctx.beginPath(); GT.roundRectPath(-hw*1.35,-hh*0.4,hw*2.7,hh*0.8,6); ctx.fillStyle='#3a2f2a'; ctx.fill(); ctx.restore(); return; }
  ctx.beginPath(); GT.roundRectPath(-hw,-hh,hw*2,hh*2,8); ctx.fillStyle=wolf.hitFlash>0?'#8b3a2f':'#3a2f2a'; ctx.fill();
  ctx.beginPath(); GT.roundRectPath(hw-4,-hh*0.2,hw*0.5,hh*0.5,4); ctx.fillStyle='#2c231f'; ctx.fill();
  ctx.fillStyle='#3a2f2a'; ctx.beginPath(); ctx.moveTo(hw-10,-hh); ctx.lineTo(hw-4,-hh-11); ctx.lineTo(hw+2,-hh); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-hw+2,-hh); ctx.lineTo(-hw+8,-hh-11); ctx.lineTo(-hw+14,-hh); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#c9503f'; ctx.beginPath(); ctx.arc(hw-9,-3,2.6,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.save();
  for(let i=0;i<wolf.maxhp;i++){ ctx.fillStyle=i<wolf.hp?'#c9503f':'rgba(90,74,46,0.4)'; ctx.beginPath(); ctx.arc(wolf.x+8+i*12,wolf.y-12,4,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}
GT.registerDraw(()=>{ if(GT.mode==='boss') drawWolf(); },'world');

// ボス戦シーン（injectSceneAfterCurrent で差し込まれる {type:'boss',...}）
GT.registerSceneType('boss', scene=>{
  GT.loadStageDef(GT.STAGE_DEFS['wolf_boss']); spawnWolf(scene.advantaged); GT.mode='idle';
  GT.setHudStage('第一話 ── 狼との戦い');
  GT.beginDialogue(scene.intro||[],null,()=>{ GT.hideDialogue(); GT.mode='boss'; });
});

/* ============================ QTE ====================================== */
let qteActive=false, qteTimer=0, qteWindow=0;

GT.registerSceneType('qte', ()=>{
  GT.loadStageDef(GT.STAGE_DEFS['wolf_boss']); GT.mode='idle'; qteActive=false;
  GT.setHudStage('第一話 ── ！');
  const lines=[
    {s:'狼',c:'wolf',t:'（おばあさんの声で）ガレットとバターの壺は戸棚に。そして、わたしのそばにおいで。'},
    {s:'赤ずきん',c:'hood',t:'まあ、おばあちゃん、なんて大きな腕なの。'},
    {s:'狼',c:'wolf',t:'おまえをよく抱きしめるためだよ。'},
    {s:'赤ずきん',c:'hood',t:'なんて大きな耳なの。'},
    {s:'狼',c:'wolf',t:'よく聞こえるようにだよ。'},
    {s:'赤ずきん',c:'hood',t:'なんて大きな目なの。'},
    {s:'狼',c:'wolf',t:'よく見えるようにだよ。'},
    {s:'赤ずきん',c:'hood',t:'なんて大きな歯なの。'},
    {s:'狼',c:'wolf',t:'……おまえを食べるためだよ！'},
  ];
  GT.beginDialogue(lines,null,()=>{
    GT.hideDialogue(); qteActive=true;
    qteWindow=1.6; qteTimer=0; GT.mode='qte';
    document.getElementById('qte').classList.add('show');
    document.getElementById('qteBig').textContent='狼が跳ねた！';
  });
});
// QTE 中の時間切れ判定
GT.registerModeUpdate('qte', dt=>{ if(!qteActive) return; qteTimer+=dt; if(qteTimer>=qteWindow){ resolveQTE(false); } });
// QTE 中は、反転キー＝成功
GT.registerFlipIntercept(()=>{ if(qteActive){ resolveQTE(true); return true; } return false; });
// QTEボタン
document.getElementById('qteBtn').addEventListener('pointerdown',e=>{ e.preventDefault(); if(qteActive) resolveQTE(true); });

function resolveQTE(success){
  if(!qteActive) return; qteActive=false;
  document.getElementById('qte').classList.remove('show');
  if(success){
    GT.beginDialogue([
      {s:'',c:'narr',t:'間に合った。少年は本を裏返し、狼の軌道を逸らして赤ずきんを引き離した。'},
    ], null, ()=>{
      GT.injectSceneAfterCurrent({type:'boss',advantaged:false,intro:[
        {s:'',c:'narr',t:'狼が牙をむく。本を裏返し、家具を落として反撃しろ。'} ]});
      GT.advanceScene();
    });
  } else {
    GT.flags.saved=false;
    GT.beginDialogue([
      {s:'',c:'narr',t:'――間に合わなかった。'},
      {s:'',c:'narr',t:'画面が暗転する。音が、止む。'},
    ], null, ()=>{
      GT.injectSceneAfterCurrent({type:'boss',advantaged:false,hollow:true,intro:[
        {s:'',c:'narr',t:'明るくなると、部屋には誰もいない。ベッドに、赤い頭巾だけが残されていた。'} ]});
      GT.advanceScene();
    });
  }
}

/* ========================= 到着（分岐の要） ============================= */
GT.registerDynamic('arriveHouse', ()=>{
  GT.loadStageDef(GT.STAGE_DEFS['wolf_boss']); GT.mode='idle';
  GT.setHudStage('第一話 ── おばあさんの家');
  if(GT.flags.route==='shortcut'){
    GT.beginDialogue([
      {s:'',c:'narr',t:'少年は先回りした。戸を開けると――寝間着姿の狼が、まさに牙をむこうとしていた。'},
      {s:'おばあさん',c:'granny',t:'ひ……！　だ、誰か……！'},
      {s:'',c:'narr',t:'狼が、こちらを振り向く。間に合った。'},
    ], null, ()=>{
      GT.injectSceneAfterCurrent({type:'boss',advantaged:true,intro:[
        {s:'',c:'narr',t:'本を裏返し、天井から家具を落として狼を追い詰めろ。'} ]});
      GT.advanceScene();
    });
    return;
  }
  GT.beginDialogue([
    {s:'',c:'narr',t:'家が見える。戸が閉まっている。'},
    {s:'赤ずきん',c:'hood',t:'（戸を叩く）おばあちゃん、わたしよ。'},
    {s:'狼',c:'wolf',t:'（中から、しわがれ声で）掛け金を引いて、戸を開けてちょうだい。'},
    {s:'',c:'narr',t:'赤ずきんが、掛け金に手を伸ばす。'},
  ], [
    { label:'赤ずきんを止める',
      set:()=>{ GT.flags.stoppedAtDoor = GT.flags.warnedHood; },
      after: ()=> GT.flags.warnedHood ? [
        {s:'',c:'narr',t:'少年が手を掴む。'},
        {s:'赤ずきん',c:'hood',t:'……どうしたの？'},
        {s:'',c:'narr',t:'少年が戸を指し、首を振る。'},
        {s:'赤ずきん',c:'hood',t:'……分かった。'},
        {s:'',c:'narr',t:'少年が先に、そっと中をうかがう。ベッドに、寝間着の狼が横たわっていた。奇襲できる。'},
      ] : [
        {s:'',c:'narr',t:'少年が手を伸ばす。だが、赤ずきんはもう掛け金を引いていた。'},
        {s:'赤ずきん',c:'hood',t:'……？　おばあちゃん、待たせちゃ悪いもの。'},
        {s:'',c:'narr',t:'止める間もなく、赤ずきんは先に中へ入っていく。'},
      ]
    },
    { label:'何もしない', set:()=>{GT.flags.stoppedAtDoor=false;}, after:[
      {s:'',c:'narr',t:'赤ずきんが掛け金を引き、中へ入っていく。少年もあとに続いた。'},
    ]},
  ], ()=>{
    if(GT.flags.stoppedAtDoor){
      GT.injectSceneAfterCurrent({type:'boss',advantaged:true,intro:[
        {s:'',c:'narr',t:'眠ったふりの狼へ、先に踏み込め。本を裏返し、家具を落とせ。'} ]});
      GT.advanceScene();
    } else {
      GT.injectSceneAfterCurrent({type:'qte'});
      GT.advanceScene();
    }
  });
});

/* ============================ 結末 ===================================== */
GT.registerDynamic('result', ()=>{
  GT.mode='idle';
  GT.setHudStage('第一話・完');
  const flags=GT.flags;
  const hoodSaved = flags.saved!==false;
  const grannySaved = (flags.route==='shortcut') && hoodSaved;   // おばあさんが助かるのは近道のときだけ
  flags.grannyAlive = grannySaved;

  let lines;
  if(hoodSaved){
    if(flags.route==='shortcut'){
      lines=[
        {s:'おばあさん',c:'granny',t:'ああ、助かった……。あんた、いったい何者だい。'},
        {s:'',c:'narr',t:'そこへ、赤ずきんが息を切らして駆けこんでくる。'},
        {s:'赤ずきん',c:'hood',t:'おばあちゃん！　……あ、あなたも。もしかして、助けてくれたの？'},
        {s:'',c:'narr',t:'少年は何も言わない。ただ、頷く。'},
        {s:'赤ずきん',c:'hood',t:'……森って、本当は怖いところなのね。'},
        {s:'',c:'narr',t:'——少年は、間に合った。赤頭巾も、おばあさんも、家に帰った。'},
      ];
    } else {
      lines=[
        {s:'赤ずきん',c:'hood',t:'……ありがとう。あなたが来てなかったら、わたし……'},
        {s:'',c:'narr',t:'少年は何も言わない。ただ、頷く。'},
        {s:'',c:'narr',t:'赤ずきんが、空っぽのベッドを見つめる。'},
        {s:'赤ずきん',c:'hood',t:'……おばあちゃんは？　ねえ、おばあちゃんは、どこ……？'},
        {s:'',c:'narr',t:'少年は、答えられなかった。'},
        {s:'',c:'narr',t:'——少年は、赤頭巾だけを、間に合わせた。'},
      ];
    }
  } else {
    lines=[
      {s:'',c:'narr',t:'狼は倒れた。だが、赤ずきんも、おばあさんも、もう戻らない。'},
      {s:'',c:'narr',t:'ベッドの上の赤い頭巾だけが、静かにそこにあった。'},
      {s:'',c:'narr',t:'——少年は、間に合わなかった。'},
    ];
  }

  GT.fillPage('granny', grannySaved
    ? '——おばあさんは無事だった。少年が、狼より先に家へ着いたから。'
    : (flags.route==='shortcut'
        ? '——おばあさんを救えなかった。'
        : '——家に着いたとき、おばあさんはすでに狼の腹の中だった。'));
  const hoodLine = hoodSaved ? '赤ずきん：救えた' : '赤ずきん：救えなかった';
  const grannyLine = grannySaved ? 'おばあさん：救えた' : 'おばあさん：救えなかった';
  let resultText;
  if(hoodSaved && grannySaved) resultText = '——少年は、間に合った。二人とも、家に帰った。';
  else if(hoodSaved && !grannySaved) resultText = '——少年は、赤頭巾だけを、間に合わせた。';
  else resultText = '——少年は、間に合わなかった。';
  GT.fillPage('result', resultText + '\n（' + hoodLine + '／' + grannyLine + '）');

  GT.beginDialogue(lines,null,()=>{
    GT.hideDialogue();
    GT.beginDialogue([
      {s:'マリ',c:'mari',t:'……ちゃんと、埋めてきた？'},
      {s:'',c:'narr',t:'（📖「本を開く」から、これまでのページを読み返せる。第二話は、また今度。）'},
    ], null, ()=>{ GT.hideDialogue(); GT.mode='idle'; GT.openBookModal(); });
  });
});

// --- 到着・結末のシーン登録（並び順は playlist.js） ------------------------
GT.registerScene({ id:'arrive', type:'talk', stage:'wolf_boss', label:'第一話 ── おばあさんの家', dynamic:'arriveHouse' });
GT.registerScene({ id:'ending', type:'end',  label:'第一話・完', dynamic:'result' });

})();
