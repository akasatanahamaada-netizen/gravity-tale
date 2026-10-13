/* ============================================================================
   ステージ：第一話 ── 森の道 ①  id = 'path1'
   種類：play
   担当：
   ========================================================================== */

GT.defineStage('path1', {
  platforms:[
    {page:'left', x:80,  y:380, w:90,  h:20, kind:'ledge'},
    {page:'left', x:210, y:300, w:90,  h:20, kind:'ledge'},
    {page:'left', x:340, y:210, w:100, h:20, kind:'ledge'},
    {page:'right',x:520, y:120, w:140, h:20, kind:'ceilingLedge'},
    {page:'right',x:720, y:320, w:120, h:20, kind:'ledge'},
  ],
  boxes:[],
  enemies:[{page:'right', x:640, y:GT.H-GT.EDGE-22, w:26, h:22, dir:-1}],
});

GT.registerScene({
  id:'path1', type:'play', stage:'path1', clear:'exit', label:'第一話 ── 森の道 ①',
  intro:{s:'',c:'narr',t:'赤ずきんのあとを追って、森の道を進む。右の端をめざそう。'},
});
