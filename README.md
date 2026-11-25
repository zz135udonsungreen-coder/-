# ぴったりメーター

動くメーターを止めてIBDPの科目スコアとTOK・EE評価を決め、合格基準を確認するゲームです。

## 遊び方

1. 最初にユーザー名を登録します。ユーザー名はこのブラウザー内に保存され、プレイ記録はSupabase設定後に共有ランキングへ保存されます。
2. 「スタート」を押し、動くメーターを「ストップ！」で止めます。
3. Group1〜Group3はHL、Group4〜Group6はSLです。6科目の値は1〜7点で、HLの方が速く、HLとSLは色分けされています。
4. 続けてTOKとEEの評価をA〜Eから決めます。全8つのメーターを終えると結果発表画面に切り替わり、記録がランキングに追加されます。もう一度遊ぶ場合は、結果発表の「もう一度挑戦」を押します。
5. 結果発表の「結果を共有」から、対応ブラウザーでは共有シートを開けます。非対応ブラウザーでは共有用テキストをクリップボードにコピーします（HTTPS接続が必要です）。

ランキングは点数の高い順に、共有ランキングの上位100件を表示します。ユーザー名と端末内のプレイ記録はブラウザーごとに保存されます。共有ランキングに接続するには、以下のSupabase設定が必要です。設定すると、その端末に保存済みの記録も初回同期時に共有されます。

## 端末間ランキングの設定

1. Supabaseでプロジェクトを作成します。
2. SupabaseのSQL Editorで次のSQLを実行します。

```sql
create table public.game_records (
  id text primary key,
  player_name text not null check (char_length(btrim(player_name)) between 1 and 20),
  subject_scores integer[] not null
    check (cardinality(subject_scores) = 6 and subject_scores <@ array[1, 2, 3, 4, 5, 6, 7]),
  tok_grade text not null check (tok_grade in ('A', 'B', 'C', 'D', 'E')),
  ee_grade text not null check (ee_grade in ('A', 'B', 'C', 'D', 'E')),
  total integer not null check (total between 6 and 45),
  passed boolean not null,
  completed_at timestamptz not null
);

alter table public.game_records enable row level security;

create policy "Anyone can view game records"
  on public.game_records for select to anon using (true);

create policy "Anyone can submit game records"
  on public.game_records for insert to anon
  with check (
    char_length(btrim(player_name)) between 1 and 20
    and cardinality(subject_scores) = 6
    and subject_scores <@ array[1, 2, 3, 4, 5, 6, 7]
    and tok_grade in ('A', 'B', 'C', 'D', 'E')
    and ee_grade in ('A', 'B', 'C', 'D', 'E')
    and total between 6 and 45
  );
```

3. SupabaseのProject URLと公開用キー（publishable key、またはlegacy anon key）を[index.html](./index.html)冒頭の `window.SUPABASE_CONFIG` に設定します。`service_role`キーやsecret keyはブラウザーに設定しないでください。

このランキングは全利用者が閲覧・投稿できる公開ランキングです。ユーザー名だけでは本人確認できず、偽名や不正な記録投稿を完全には防止できません。

## 合格判定

- 科目点とTOK・EEのコアポイントの合計が24点以上
- TOKまたはEEにE評価がない
- すべての科目が2点以上
- 2点の科目が2つ以下、3点以下の科目が3つ以下
- HL合計が12点以上、SL合計が9点以上

TOK・EEコアポイント（行がTOK、列がEE）:

| TOK / EE | A | B | C | D | E |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | 3 | 3 | 2 | 2 | 0 |
| B | 3 | 2 | 2 | 1 | 0 |
| C | 2 | 2 | 1 | 0 | 0 |
| D | 2 | 1 | 0 | 0 | 0 |
| E | 0 | 0 | 0 | 0 | 0 |

E評価を含む場合、合計コアポイントにかかわらず不合格です。

## 起動方法

記録を保存するため、ローカルサーバー経由での起動をおすすめします。リポジトリのルートで次を実行します。

```sh
python3 -m http.server 8000
```

その後、`http://localhost:8000` を開いてください。
`index.html` を直接開く場合、ブラウザーによっては記録を保存できないことがあります。
