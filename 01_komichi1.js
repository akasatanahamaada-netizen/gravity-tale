/* ============================================================================
   ステージ：序 ── 森の小道 ①  id = 'komichi1'
   種類：play（右へ進んで、右ページの右端まで行くとクリア）
   担当：
   ----------------------------------------------------------------------------
   play ステージの作り方：
     ・clear:'exit'  … 右端まで歩き抜けるとクリア（横スクロール型）
     ・platforms     … 足場。page は 'left' / 'right'、kind は
                        'ledge'(床の足場) か 'ceilingLedge'(天井の足場)
     ・enemies       … 歩く敵（踏まれると往復。箱を落として倒せる）
     ・intro         … ステージ開始時に出るナレーション（省略可）
   ========================================================================== */

GT.defineStage('komichi1', {
  platforms:[
    {page:'left', x:120, y:360, w:120, h:20, kind:'ledge'},
    {page:'left', x:300, y:280, w:110, h:20, kind:'ledge'},
    {page:'right',x:520, y:330, w:120, h:20, kind:'ledge'},
  ],
  boxes:[],
  enemies:[{page:'right', x:700, y:GT.H-GT.EDGE-22, w:26, h:22, dir:-1}],
});

GT.registerScene({
  id:'komichi1', type:'play', stage:'komichi1', clear:'exit', label:'序 ── 森の小道 ①',
  intro:{s:'',c:'narr',t:'右へ進もう。ページのいちばん右の端まで行くと、ページがめくれて次へ進む。'},
});
