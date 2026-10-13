/* ============================================================================
   ステージ：第一話 ── 森の道 ②  id = 'path2'
   種類：play　床の壁→天井へ、天井の壁→床へ、のつづら折り（右ページで2回反転）
   担当：
   ========================================================================== */

GT.defineStage('path2', {
  platforms:[
    {page:'left', x:140, y:340, w:110, h:20, kind:'ledge'},
    {page:'right',x:540, y:GT.H-GT.EDGE-170, w:28, h:170, kind:'ledge'},  // 床の壁
    {page:'right',x:720, y:GT.EDGE,          w:28, h:170, kind:'ledge'},  // 天井の壁
  ],
  boxes:[],
  enemies:[{page:'right', x:820, y:GT.H-GT.EDGE-22, w:24, h:22, dir:-1}],
});

GT.registerScene({
  id:'path2', type:'play', stage:'path2', clear:'exit', label:'第一話 ── 森の道 ②',
});
