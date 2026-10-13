# Gravity Tale — ステージ分割版

本を裏返すと重力が反転する、2ページ見開きの絵本ゲームです。
**ステージごとにファイルを分けてある**ので、一人が1ファイルを担当して作れます。
ステージの追加・並べ替え・他の人の作品との統合も、かんたんにできます。

---

## 1. 遊び方（動かし方）

`index.html` を**ダブルクリックしてブラウザで開く**だけです。
（サーバーは不要。ネットがなくてもフォントが変わるだけで遊べます。）

操作：← → 移動／↑・W ジャンプ／F・Space 重力反転／キャラに近づいて ▲・画面タップ・Enter で話す

---

## 2. ファイル構成

```
gravity_tale/
├─ index.html        ← これを開くと遊べる。読み込むファイルの一覧もここ
├─ engine.js         ← ゲームの土台（物理・会話・描画など）。基本さわらない
├─ playlist.js       ← ★ステージの並び順・ページ一覧・初期状態。ここで全体を決める
├─ README.md         ← この説明
└─ stages/           ← ★ステージ1つにつき1ファイル。各自ここを担当する
   ├─ 00_opening.js        序 ── 森（マリと出会う / 会話ステージ）
   ├─ 01_komichi1.js       森の小道①（アクションステージ）
   ├─ 02_komichi2.js       森の小道②（壁を重力反転で越える）
   ├─ 03_cliff.js          崖
   ├─ 04_house_peek.js     赤ずきんの家・窓のぞき（+窓の中の描画）
   ├─ 05_path1.js          森の道①
   ├─ 06_path2.js          森の道②
   ├─ 07_meet_hood.js      赤ずきんと道連れに（会話）
   ├─ 08_wolf_talk.js      狼（会話・分岐：危険を告げるか）
   ├─ 09_crossroads.js     分かれ道（会話・分岐：近道か遠回りか）
   └─ 10_grannys_house.js  おばあさんの家（到着→ボス戦／QTE→結末。特別な仕掛け）
```

- **ステージには2種類あります**
  - `play` … 右に進み、**右ページの右端**まで行くとページがめくれてクリア（横スクロール型）
  - `story` … ステージ上のキャラに**話しかけて**ストーリーを進め、終わったら右端へ歩いてクリア

---

## 3. ステージの直し方（よくある編集）

各ステージファイルの中は、だいたいこの2つです。

### 地形（足場・箱・敵）
```js
GT.defineStage('komichi1', {
  platforms:[
    // page は 'left'（左ページ）か 'right'（右ページ）
    // kind は 'ledge'（床の足場）か 'ceilingLedge'（天井の足場）
    {page:'left', x:120, y:360, w:120, h:20, kind:'ledge'},
    {page:'right',x:600, y:120, w:30,  h:170, kind:'ledge'}, // 縦長にすれば「壁」になる
  ],
  boxes:[ {x:700, y:400, w:32, h:32} ],               // 落として敵やボスに当てられる箱
  enemies:[ {page:'right', x:700, y:442, w:26, h:22, dir:-1} ], // 左右に歩く敵
});
```
座標は 900×480 の見開き。中央の綴じ目（SPINE）が x=450。左ページ=0〜450、右ページ=450〜900。

### セリフ・進行
```js
GT.registerScene({
  id:'komichi1', type:'play', stage:'komichi1', clear:'exit',
  label:'森の小道 ①',                                  // 画面上部に出る見出し
  intro:{s:'',c:'narr',t:'右へ進もう。'},               // 開始時のナレーション（省略可）
});
```
会話の1行は `{s:'話者名', c:'色の種類', t:'セリフ'}`。
`c` は `narr`(地の文) / `mari` / `hood`(赤ずきん) / `wolf` / `mother` / `granny` が使えます。

story ステージは `npcs:[{who, name, page, x, lines:[...], choices:[...], onEnd}]` を書きます。
- `who` は見た目：`'mari'` / `'hood'` / `'wolf'`
- `lines` があるキャラが「話しかけられる」キャラです
- `choices` を付けると分岐（下記）

---

## 4. ステージを「増やす」手順

1. `stages/` に新しいファイルを作る（既存ファイルをコピーすると早い）。
   中で `GT.defineStage('新id', {...})` と `GT.registerScene({id:'新id', ...})` を書く。
2. `index.html` の `<script src="stages/...">` の並びに、**1行コピーして**新ファイルを足す。
3. `playlist.js` の `GT.playlist` の好きな位置に、`'新id'` を1つ足す。

これだけで、その位置にステージが挟まります。**並べ替え**は `GT.playlist` の順番を入れ替えるだけです。

---

## 5. みんなの作品を「統合する」手順

1. それぞれが作った `stages/○○.js` を、1つの `stages/` に集める。
2. `index.html` に、集めたファイルの `<script>` 行をすべて並べる。
3. `playlist.js` の `GT.playlist` に、流したい順で id を並べる。

> **注意：id がかぶらないように。** 同じ `'wolf_talk'` が2つあると上書きされます。
> かぶりそうなら接頭辞を付ける（例：`ep2_wolf_talk`）と安全です。
> `GT.fillPage('key',...)` で使う本のページ key と、`playlist.js` の `GT.definePages` も合わせてください。

---

## 6. もっと凝った仕掛けを足したい人へ

ボス戦・QTE・窓のぞき映像のような「特別な仕掛け」は、`engine.js` を書き換えずに
**登録（register）するだけ**で足せます（例は `10_grannys_house.js` / `04_house_peek.js`）。

| したいこと | 使う関数 |
|---|---|
| 新しいシーンの種類（例：boss） | `GT.registerSceneType(type, fn)` |
| 条件で分岐する特別シーン | `GT.registerDynamic(name, fn)` + シーンに `dynamic:'name'` |
| 毎フレームの独自処理（敵のAIなど） | `GT.registerUpdate(fn)` |
| その mode 専用の更新（QTEなど） | `GT.registerModeUpdate(mode, fn)` |
| 独自の描画（キャラ・エフェクト） | `GT.registerDraw(fn, 'world'|'overlay')` |
| 会話の合図で何か起こす | `GT.registerAct(name, fn)` + セリフに `act:'name'` |
| シーン開始時のリセット | `GT.registerSceneReset(fn)` |
| 反転キーを横取り（QTE成功判定など） | `GT.registerFlipIntercept(fn)` |

動作確認用：`GT.dbg()` `GT.getNpcs()` `GT.getBoss()` `GT.activeNpc` で中身を覗けます。

---

## 7. 手描きイラストを使いたいとき

キャラや背景を手描きの絵に差し替えられます（Canvas の `drawImage`）。
透明背景のPNGを用意できたら、`engine.js` の `drawPlayer` / `drawNpc`、
`04_house_peek.js` の窓の中の人物を、画像描画に置き換えます。
左右の向き・重力反転の上下反転・伸び縮みは今の仕組みのまま使えます。
画像ができたらチャットに添付してください。組み込みます。
