/* ============================================================================
   ステージ：序 ── 森の小道 ②  id = 'komichi2'
   種類：play　道をふさぐ壁を、重力反転で天井づたいに越える
   担当：
   ========================================================================== */

GT.defineStage('komichi2', {
  platforms:[
    {page:'left', x:140, y:330, w:120, h:20, kind:'ledge'},
    {page:'right',x:600, y:GT.H-GT.EDGE-170, w:30, h:170, kind:'ledge'},  // 床から生える壁
    {page:'right',x:720, y:300, w:110, h:20, kind:'ledge'},
  ],
  boxes:[], enemies:[],
});

GT.registerScene({
  id:'komichi2', type:'play', stage:'komichi2', clear:'exit', label:'序 ── 森の小道 ②',
  intro:{s:'',c:'narr',t:'道をふさぐ壁。本を裏返して重力を変え、天井づたいに越えよう。'},
});
