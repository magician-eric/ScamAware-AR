# Scenario03 既有語音與字幕

本目錄保存 Scenario03 的 18 組正式錄音；每組均有中文、英文、日文版本，共 54 支 MP3。
既有 audio binary 是唯一語音來源，請勿重新編碼、重新命名、移動或複製。字幕來源為
`webapp/src/data/scenario03Dialogues.js`，下列逐字稿與字幕內容一致。

## 檔名規則

- 中文：`filename.mp3`
- 英文：`filename_en.mp3`
- 日文：`filename_jp.mp3`（使用 `_jp`，不使用 `_ja`）

所有語言版本均放在同一角色資料夾（`police/` 或 `prosecutor/`）。
一支錄音可拆成多個 subtitle beats，但同一 audio block 的 beats 串接後，必須與下列正式稿逐字一致。

## 錄音清單

| # | 對白 id | 中文檔案 | 英文檔案 | 日文檔案 |
| ---: | --- | --- | --- | --- |
| 1 | `police_intro` | `police/police_intro.mp3` | `police/police_intro_en.mp3` | `police/police_intro_jp.mp3` |
| 2 | `police_identity_question` | `police/police_identity_question.mp3` | `police/police_identity_question_en.mp3` | `police/police_identity_question_jp.mp3` |
| 3 | `police_identity_answer_a` | `police/police_identity_answer_a.mp3` | `police/police_identity_answer_a_en.mp3` | `police/police_identity_answer_a_jp.mp3` |
| 4 | `police_identity_answer_b` | `police/police_identity_answer_b.mp3` | `police/police_identity_answer_b_en.mp3` | `police/police_identity_answer_b_jp.mp3` |
| 5 | `police_data_leak` | `police/police_data_leak.mp3` | `police/police_data_leak_en.mp3` | `police/police_data_leak_jp.mp3` |
| 6 | `police_case_number` | `police/police_case_number.mp3` | `police/police_case_number_en.mp3` | `police/police_case_number_jp.mp3` |
| 7 | `police_add_line` | `police/police_add_line.mp3` | `police/police_add_line_en.mp3` | `police/police_add_line_jp.mp3` |
| 8 | `police_return` | `police/police_return.mp3` | `police/police_return_en.mp3` | `police/police_return_jp.mp3` |
| 9 | `police_online_check` | `police/police_online_check.mp3` | `police/police_online_check_en.mp3` | `police/police_online_check_jp.mp3` |
| 10 | `police_online_answer_a` | `police/police_online_answer_a.mp3` | `police/police_online_answer_a_en.mp3` | `police/police_online_answer_a_jp.mp3` |
| 11 | `police_online_answer_b` | `police/police_online_answer_b.mp3` | `police/police_online_answer_b_en.mp3` | `police/police_online_answer_b_jp.mp3` |
| 12 | `police_custody_handoff` | `police/police_custody_handoff.mp3` | `police/police_custody_handoff_en.mp3` | `police/police_custody_handoff_jp.mp3` |
| 13 | `prosecutor_intro` | `prosecutor/prosecutor_intro.mp3` | `prosecutor/prosecutor_intro_en.mp3` | `prosecutor/prosecutor_intro_jp.mp3` |
| 14 | `prosecutor_account_question` | `prosecutor/prosecutor_account_question.mp3` | `prosecutor/prosecutor_account_question_en.mp3` | `prosecutor/prosecutor_account_question_jp.mp3` |
| 15 | `prosecutor_account_answer_a` | `prosecutor/prosecutor_account_answer_a.mp3` | `prosecutor/prosecutor_account_answer_a_en.mp3` | `prosecutor/prosecutor_account_answer_a_jp.mp3` |
| 16 | `prosecutor_account_answer_b` | `prosecutor/prosecutor_account_answer_b.mp3` | `prosecutor/prosecutor_account_answer_b_en.mp3` | `prosecutor/prosecutor_account_answer_b_jp.mp3` |
| 17 | `prosecutor_pressure` | `prosecutor/prosecutor_pressure.mp3` | `prosecutor/prosecutor_pressure_en.mp3` | `prosecutor/prosecutor_pressure_jp.mp3` |
| 18 | `prosecutor_end` | `prosecutor/prosecutor_end.mp3` | `prosecutor/prosecutor_end_en.mp3` | `prosecutor/prosecutor_end_jp.mp3` |

## 正式錄音逐字稿

### 1. `police_intro`

**ZH (`police/police_intro.mp3`)**

> 您好，這裡是轄區警察局偵查隊。我是本案承辦員警。我們正在偵辦一起詐欺及洗錢案件。案件調查中，發現有一支門號與您的身分資料有關。現在需要向您確認幾件事情。

**EN (`police/police_intro_en.mp3`)**

> This is the Criminal Investigation Division. I'm the detective handling your case. We're investigating a fraud case. A phone number linked to your identity has come up. I need to verify a few things with you.

**JP (`police/police_intro_jp.mp3`)**

> こちらは警察署刑事課です。担当捜査員です。詐欺事件を捜査しています。あなた名義の電話番号が確認されました。いくつか確認します。

### 2. `police_identity_question`

**ZH (`police/police_identity_question.mp3`)**

> 請您直接回答。這支門號是您本人申辦的嗎？您的身分證件曾經交給其他人使用嗎？

**EN (`police/police_identity_question_en.mp3`)**

> Answer directly. Did you register this phone number? Has anyone else ever used your ID?

**JP (`police/police_identity_question_jp.mp3`)**

> お答えください。この電話番号はご本人が契約しましたか。身分証を他人に渡したことはありますか。

### 3. `police_identity_answer_a`

**ZH (`police/police_identity_answer_a.mp3`)**

> 好，我了解。如果不是您本人申辦，就有可能是身分遭到冒用。我們會繼續確認。

**EN (`police/police_identity_answer_a_en.mp3`)**

> Understood. If you didn't register it, your identity may have been stolen. We'll verify it.

**JP (`police/police_identity_answer_a_jp.mp3`)**

> 承知しました。ご本人でなければ、身分証が悪用された可能性があります。確認を続けます。

### 4. `police_identity_answer_b`

**ZH (`police/police_identity_answer_b.mp3`)**

> 身分資料一旦外流，就可能被拿去申辦門號或銀行帳戶。這部分我們會一併確認。

**EN (`police/police_identity_answer_b_en.mp3`)**

> Stolen personal information is often used to open phone lines or bank accounts. We'll check that as well.

**JP (`police/police_identity_answer_b_jp.mp3`)**

> 個人情報が流出すると、携帯電話や銀行口座の契約に悪用されることがあります。この点も確認します。

### 5. `police_data_leak`

**ZH (`police/police_data_leak.mp3`)**

> 目前案件已經由檢察官指揮偵辦。現階段，您需要配合調查。至於是否涉及案件，還要依調查結果判定。

**EN (`police/police_data_leak_en.mp3`)**

> The case is now under a prosecutor's supervision. For now, you need to cooperate with the investigation. Your involvement will be determined after verification.

**JP (`police/police_data_leak_jp.mp3`)**

> この事件は現在、検察官の指揮で捜査しています。現時点では捜査への協力が必要です。関与の有無は調査後に判断します。

### 6. `police_case_number`

**ZH (`police/police_case_number.mp3`)**

> 我現在為您建立案件。案件編號已經傳送到您的手機。請不要向任何人透露案件內容。案件目前仍在偵辦中。

**EN (`police/police_case_number_en.mp3`)**

> Your case has been registered. The case number has been sent to your phone. Do not discuss this case with anyone. The investigation is still ongoing.

**JP (`police/police_case_number_jp.mp3`)**

> 事件を登録しました。事件番号を携帯電話へ送信しました。この件は誰にも話さないでください。現在も捜査中です。

### 7. `police_add_line`

**ZH (`police/police_add_line.mp3`)**

> 現在請您加我的通訊軟體。後續資料會直接傳給您。不要掛電話。

**EN (`police/police_add_line_en.mp3`)**

> Add me on the messaging app now. I’ll send you the case documents there. Stay on the line.

**JP (`police/police_add_line_jp.mp3`)**

> 今から私をメッセージアプリに追加してください。資料を送ります。電話は切らないでください。

### 8. `police_return`

**ZH (`police/police_return.mp3`)**

> 好，資料已經傳送。請打開確認。上面的姓名和證件號碼，是您的資料嗎？

**EN (`police/police_return_en.mp3`)**

> The documents have been sent. Open them now. Is the name and ID number yours?

**JP (`police/police_return_jp.mp3`)**

> 資料を送信しました。今すぐ開いてください。記載されている氏名と身分証番号は、あなたのものですか。

### 9. `police_online_check`

**ZH (`police/police_online_check.mp3`)**

> 接下來要進行線上筆錄。請找一個沒有人打擾的地方。不要讓其他人聽到。

**EN (`police/police_online_check_en.mp3`)**

> We’re starting the interview now. Go somewhere private. No one else should hear this call.

**JP (`police/police_online_check_jp.mp3`)**

> これから事情聴取を行います。誰にも邪魔されない場所へ移動してください。ほかの人に聞かせないでください。

### 10. `police_online_answer_a`

**ZH (`police/police_online_answer_a.mp3`)**

> 可以。現在戴上耳機。確認周圍沒有人，再回答我的問題。

**EN (`police/police_online_answer_a_en.mp3`)**

> Good. Put on your earphones. Make sure no one is nearby, then answer my questions.

**JP (`police/police_online_answer_a_jp.mp3`)**

> わかりました。イヤホンを着けてください。周囲に誰もいないことを確認してから答えてください。

### 11. `police_online_answer_b`

**ZH (`police/police_online_answer_b.mp3`)**

> 不行。這是偵查中的案件。請立刻移動到可以單獨通話的地方。

**EN (`police/police_online_answer_b_en.mp3`)**

> No. This is an active investigation. Move somewhere private now.

**JP (`police/police_online_answer_b_jp.mp3`)**

> だめです。現在捜査中の事件です。すぐに一人で話せる場所へ移動してください。

### 12. `police_custody_handoff`

**ZH (`police/police_custody_handoff.mp3`)**

> 現在案件由檢察官接手。接下來，他問什麼，您就回答什麼。不要隱瞞，也不要打斷。

**EN (`police/police_custody_handoff_en.mp3`)**

> The prosecutor is taking over now. Answer every question directly. Do not hide anything. Do not interrupt.

**JP (`police/police_custody_handoff_jp.mp3`)**

> これから検察官に代わります。質問にはそのまま答えてください。隠さないでください。途中で話を遮らないでください。

### 13. `prosecutor_intro`

**ZH (`prosecutor/prosecutor_intro.mp3`)**

> 我是本案承辦檢察官。現在由我接手訊問。請直接回答我的問題。

**EN (`prosecutor/prosecutor_intro_en.mp3`)**

> I'm the prosecutor assigned to this case. I'm taking over now. Answer my questions directly.

**JP (`prosecutor/prosecutor_intro_jp.mp3`)**

> 本件担当の検察官です。これから私が確認します。質問にだけ答えてください。

### 14. `prosecutor_account_question`

**ZH (`prosecutor/prosecutor_account_question.mp3`)**

> 名下共有幾個銀行帳戶？一個一個回答。不要遺漏。

**EN (`prosecutor/prosecutor_account_question_en.mp3`)**

> How many bank accounts do you have? List them one by one. Don't leave any out.

**JP (`prosecutor/prosecutor_account_question_jp.mp3`)**

> 銀行口座はいくつありますか。一つずつ答えてください。漏れなく答えてください。

### 15. `prosecutor_account_answer_a`

**ZH (`prosecutor/prosecutor_account_answer_a.mp3`)**

> 我知道了。請保持通話。我正在查核資料。

**EN (`prosecutor/prosecutor_account_answer_a_en.mp3`)**

> Understood. Stay on the line. I'm verifying your records.

**JP (`prosecutor/prosecutor_account_answer_a_jp.mp3`)**

> わかりました。そのままお待ちください。内容を確認します。

### 16. `prosecutor_account_answer_b`

**ZH (`prosecutor/prosecutor_account_answer_b.mp3`)**

> 您的回答和目前資料不一致。請重新回答。不要隱瞞。

**EN (`prosecutor/prosecutor_account_answer_b_en.mp3`)**

> Your answer doesn't match our records. Answer again. Don't hide anything.

**JP (`prosecutor/prosecutor_account_answer_b_jp.mp3`)**

> あなたの回答は記録と一致しません。もう一度答えてください。隠さないでください。

### 17. `prosecutor_pressure`

**ZH (`prosecutor/prosecutor_pressure.mp3`)**

> 我現在正式告知您。本案涉及詐欺及洗錢犯罪。如果無法證明資金來源，您將依法接受後續調查。請配合。

**EN (`prosecutor/prosecutor_pressure_en.mp3`)**

> I'm informing you officially. This case involves fraud and money laundering. If you can't explain the source of the funds, you'll remain under investigation. Cooperate.

**JP (`prosecutor/prosecutor_pressure_jp.mp3`)**

> 正式にお伝えします。本件は詐欺および資金洗浄事件です。資金の出所を説明できない場合は、引き続き調査の対象となります。捜査に協力してください。

### 18. `prosecutor_end`

**ZH (`prosecutor/prosecutor_end.mp3`)**

> 接下來請依照指示處理。沒有我的同意，不要中斷通話。現在開始執行。

**EN (`prosecutor/prosecutor_end_en.mp3`)**

> Follow my instructions from this point forward. Do not end this call without my permission. Begin now.

**JP (`prosecutor/prosecutor_end_jp.mp3`)**

> これからは私の指示に従ってください。許可なく電話を切らないでください。それでは始めます。
