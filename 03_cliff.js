/* ============================================================================
   ステージ：序 ── 崖  id = 'cliff'
   種類：play　高くそびえる崖を、重力反転で天井づたいに越える
   担当：
   ========================================================================== */

GT.defineStage('cliff', {
  platforms:[
    {page:'left', x:160, y:350, w:120, h:20, kind:'ledge'},
    {page:'right',x:540, y:GT.H-GT.EDGE-190, w:30, h:190, kind:'ledge'},  // 崖
    {page:'right',x:700, y:300, w:120, h:20, kind:'ledge'},
  ],
  boxes:[], enemies:[],
});

GT.registerScene({
  id:'cliff', type:'play', stage:'cliff', clear:'exit', label:'序 ── 崖',
  intro:{s:'',c:'narr',t:'行く手をふさぐ、高い崖。本を裏返して、天井づたいに越え、右の端へ。'},
});
