/* ============================================================================
   Gravity Tale ── 第一話のマニフェスト (playlist.js)
   ----------------------------------------------------------------------------
   ★ ステージの並び順・本のページ・最初の状態は、このファイルだけで決まります。
     ステージを増やす / 並べ替える / 統合するときは、ここを直してください。

   【並べ替える】   GT.playlist の中の id の順番を入れ替えるだけ。
   【ステージを足す】 stages/ に新しいファイルを作って id を登録 →
                     index.html に <script> を1行足す →
                     この GT.playlist の好きな位置に id を1つ足す。
   【別の話を合体】   相手のステージ各ファイルと、相手の id を playlist に並べる。
                     id がかぶらないようにだけ注意（例：wolf_talk → ep2_wolf_talk）。
   ========================================================================== */

// 本（読み返し）に並ぶページ。stages 側の GT.fillPage(key,...) の key と合わせる。
GT.definePages([
  {key:'prologue', title:'序 ── 森で目覚める'},
  {key:'window',   title:'窓の向こう'},
  {key:'meet',     title:'赤い頭巾の少女'},
  {key:'wolf',     title:'森で出会った狼'},
  {key:'granny',   title:'おばあさんの家'},
  {key:'result',   title:'第一話の結末'},
]);

// 分岐フラグの初期値（各ステージの choices が書き換える）
GT.flags = { warnedHood:false, route:null, stoppedAtDoor:false, saved:null, grannyAlive:null };

// シーンの並び順（= ゲームの進行順）。id は各ステージファイルで登録したもの。
GT.playlist = [
  'opening',      // 序 ── 森（マリと出会う / story）
  'komichi1',     // 森の小道①（play）
  'komichi2',     // 森の小道②（play）
  'cliff',        // 崖（play）
  'house_peek',   // 赤ずきんの家・窓のぞき（story）
  'path1',        // 森の道①（play）
  'path2',        // 森の道②（play）
  'meet_hood',    // 赤ずきんと道連れに（story）
  'wolf_talk',    // 狼（story・分岐：危険を告げるか）
  'crossroads',   // 分かれ道（story・分岐：近道か遠回りか）
  'arrive',       // おばあさんの家に到着（分岐→ボス戦 or QTE）
  'ending',       // 結末
];
