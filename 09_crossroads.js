/* ============================================================================
   ステージ：第一話 ── 分かれ道  id = 'crossroads'
   種類：story　近道か遠回りかを選ぶ（flags.route）
   担当：
   ----------------------------------------------------------------------------
   ここで選んだ flags.route（'shortcut' / 'detour'）が結末を分けます。
     近道(shortcut)  … 狼を追い、おばあさんを助けられる可能性がある
     遠回り(detour)  … 安全だが遅く、着いたときにはおばあさんは…
   ========================================================================== */

GT.defineStage('crossroads', {
  platforms:[
    {page:'left', x:120, y:360, w:120, h:20, kind:'ledge'},
    {page:'right',x:660, y:330, w:130, h:20, kind:'ledge'},
  ],
  boxes:[], enemies:[],
});

GT.registerScene({
  id:'crossroads', type:'story', stage:'crossroads', label:'第一話 ── 分かれ道',
  intro:{s:'',c:'narr',t:'森の分かれ道。赤ずきんが、少年を待っている。'},
  npcs:[
    { who:'hood', name:'赤ずきん', page:'right', x:620, lines:[
      {s:'',c:'narr',t:'近道は、狼が向かったかもしれない。遠回りは、確実だが遅い。'},
      {s:'赤ずきん',c:'hood',t:'近道、行く？'},
    ], choices:[
      { label:'近道を行く（狼を追う）', set:()=>{GT.flags.route='shortcut';}, after:[
        {s:'',c:'narr',t:'少年は赤ずきんと別れ、近道を駆けた。狼より先に、おばあさんの家へ。'} ]},
      { label:'遠回りを行く（赤ずきんと一緒に）', set:()=>{GT.flags.route='detour';}, after:[
        {s:'',c:'narr',t:'二人は安全な遠回りを選んだ。だが、その分だけ時間がかかる。'} ]},
    ] }
  ],
});
