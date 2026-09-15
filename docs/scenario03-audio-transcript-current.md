# 情境三（假檢警）現有 18 支錄音逐字稿 — 中／英／日對照

**來源說明**：這份文件不是直接聽音檔轉出來的（環境網路限制，語音辨識模型下載不了，見下方「限制說明」），而是彙整自兩個一致的來源：
1. `webapp/public/assets/scenarios/scenario-03/audio/README.md` — 專案內原本就有的「最終錄音逐字稿」，文件明確寫「錄音人員請直接照這份逐字稿朗讀」「錄好之後不需要再調整字幕」。
2. `webapp/src/data/scenario03Dialogues.js` — 目前程式碼裡實際顯示在字幕上的文字。

兩邊文字逐句核對後**完全一致**（中/英/日 18 支全部核對過），所以這份逐字稿理論上就是這 54 個 mp3 檔案（18 支 × 3 語言）目前實際錄的內容。

**限制說明**：這份文件是「文件 + 程式碼」交叉核對的結果，不是我親耳聽音檔逐字轉出來的——這個環境的出網代理把 Azure Blob、Hugging Face、ggml.ggerganov.com、GitHub API 這幾個語音辨識模型的下載來源都擋了（全部回 403），沒辦法在這裡跑語音轉文字。如果需要百分之百逐字覆核音檔本身，建議實際播放比對。

**重要提醒（不是這份文件要解決的問題，只是標註出來）**：下面 18 支裡，police_return、police_online_check、police_online_answer_a、police_online_answer_b、police_custody_handoff、prosecutor_account_question、prosecutor_account_answer_a、prosecutor_account_answer_b、prosecutor_end 這 9 支的英文／日文內容，跟中文版說的不是同一件事（英文/日文比較像是另一版草稿的內容）。這份逐字稿如實反映「現在錄音實際在講什麼」，不代表這樣是對的，怎麼處理由你們決定。

---

## police/（偵查佐）

### 1. police_intro
- **zh**：您好，這裡是轄區警察局偵查隊，我是本案承辦員警。／我們目前正在調查一件電信詐騙及*洗錢*案件。／案件資料中，出現一支使用相關身分資料申辦的涉案門號。／這支門號近期有多筆異常通聯紀錄。／我們現在需要先確認，您是否知道這支門號或相關帳戶的來源。
- **en**：This is the Criminal Investigation Division. / I'm the detective handling your case. / We're investigating a fraud case. / A phone number linked to your identity has come up. / I need to verify a few things with you.
- **jp**：こちらは警察署刑事課です。／担当捜査員です。／詐欺事件を捜査しています。／あなた名義の電話番号が確認されました。／いくつか確認します。

### 2. police_identity_question
- **zh**：我先問您一件事，請您據實回答。／您是否曾申辦過我們剛才提到的門號，或將身分資料交給他人使用？
- **en**：Answer directly. / Did you register this phone number? / Has anyone else ever used your ID?
- **jp**：お答えください。／この電話番号はご本人が契約しましたか。／身分証を他人に渡したことはありますか。

### 3. police_identity_answer_a
- **zh**：了解。／如果您完全沒有申辦過，就可能涉及身分冒用。／我們需要進一步替您排除涉案關係。
- **en**：Understood. / If you didn't register it, your identity may have been stolen. / We'll verify it.
- **jp**：承知しました。／ご本人でなければ、身分証が悪用された可能性があります。／確認を続けます。

### 4. police_identity_answer_b
- **zh**：證件或身分資料外流，確實可能被拿來申辦門號或帳戶。／我們需要進一步確認相關的使用紀錄。
- **en**：Stolen personal information is often used to open phone lines or bank accounts. / We'll check that as well.
- **jp**：個人情報が流出すると、携帯電話や銀行口座の契約に悪用されることがあります。／この点も確認します。

### 5. police_data_leak
- **zh**：不管是哪一種情況，本案目前已經由檢察官指揮偵辦。／您可能是身分遭冒用的被害人，也可能會先被列為案件關係人。／實際情況，要看後續的清查結果。／這類資料通常是在申辦門號、租屋或網路交易時留下的證件影本外流。／歹徒再利用這些資料申辦門號或開設帳戶，這部分我們會另案調查。
- **en**：The case is now under a prosecutor's supervision. / For now, you need to cooperate with the investigation. / Your involvement will be determined after verification.
- **jp**：この事件は現在、検察官の指揮で捜査しています。／現時点では捜査への協力が必要です。／関与の有無は調査後に判断します。

### 6. police_case_number
- **zh**：我先幫您建立案件。／案件編號已經傳到您的手機，請您仔細核對。／這組編號只提供給案件關係人，請不要任意外流。／本案目前仍在偵辦中，依照*偵查不公開*原則，案件內容不能向無關人員透露。／尤其不能讓可能涉及案件的人事先知道，以免影響調查。
- **en**：Your case has been registered. / The case number has been sent to your phone. / Do not discuss this case with anyone. / The investigation is still ongoing.
- **jp**：事件を登録しました。／事件番号を携帯電話へ送信しました。／この件は誰にも話さないでください。／現在も捜査中です。

### 7. police_add_line
- **zh**：接下來的案件文件與聯絡資料，我會透過案件專用的 LINE 帳號傳給您。／電話裡不方便一次說明太多。／我現在把好友邀請傳出去，您的手機稍後會收到通知。／請您加入之後回覆我，我會在線上等您。
- **en**：Add me on the messaging app now. / I'll send you the case documents there. / Stay on the line.
- **jp**：今から私をメッセージアプリに追加してください。／資料を送ります。／電話は切らないでください。

### 8. police_return ⚠️見上方提醒
- **zh**：剛剛檢察官的口氣比較嚴厲，你別太往心裡去。／他辦案講話一向比較直接。／我剛剛幫你爭取到用資金監管替代帳戶凍結，這個機會不容易。／接下來只是資金查核，我會一步一步陪你做，你不要慌。
- **en**：The documents have been sent. / Open them now. / Is the name and ID number yours?
- **jp**：資料を送信しました。／今すぐ開いてください。／記載されている氏名と身分証番号は、あなたのものですか。

### 9. police_online_check ⚠️見上方提醒
- **zh**：帳戶清查今天就要完成，不能再拖。／你要現在使用手機完成線上清查，還是親自到警察局處理？
- **en**：We're starting the interview now. / Go somewhere private. / No one else should hear this call.
- **jp**：これから事情聴取を行います。／誰にも邪魔されない場所へ移動してください。／ほかの人に聞かせないでください。

### 10. police_online_answer_a ⚠️見上方提醒
- **zh**：對，用手機處理最快，也不用另外出門。／我會在線上一步一步教你，你跟著我做就好。
- **en**：Good. / Put on your earphones. / Make sure no one is nearby, then answer my questions.
- **jp**：わかりました。／イヤホンを着けてください。／周囲に誰もいないことを確認してから答えてください。

### 11. police_online_answer_b ⚠️見上方提醒
- **zh**：不行，今天案件就可能進入*帳戶凍結*程序，明天就來不及了。／你到警察局之後，還是要重新排案，中間帳戶一樣可能先被凍結。／而且臨櫃人員一定會問你資金用途。／本案*偵查不公開*，你不能把案件內容告訴他們。／現在使用手機處理最單純，我會陪著你一起完成。
- **en**：No. / This is an active investigation. / Move somewhere private now.
- **jp**：だめです。／現在捜査中の事件です。／すぐに一人で話せる場所へ移動してください。

### 12. police_custody_handoff ⚠️見上方提醒
- **zh**：等一下我會把監管帳戶的資料傳給你。／你先確認一下，目前你名下可以動用的存款金額。
- **en**：The prosecutor is taking over now. / Answer every question directly. / Do not hide anything. / Do not interrupt.
- **jp**：これから検察官に代わります。／質問にはそのまま答えてください。／隠さないでください。／途中で話を遮らないでください。

---

## prosecutor/（假檢察官）

### 13. prosecutor_intro
- **zh**：我是本案承辦檢察官。／剛才警察移交的資料，我已經看過。／這通電話將列入案件紀錄，你的回答也會作為本案調查資料。／本案查獲的異常帳戶，涉及多筆被害人匯入的款項。／目前帳戶與通聯紀錄，都指向同一組身分資料。／我現在要確認的是，這些帳戶和交易跟你之間的關係。
- **en**：I'm the prosecutor assigned to this case. / I'm taking over now. / Answer my questions directly.
- **jp**：本件担当の検察官です。／これから私が確認します。／質問にだけ答えてください。

### 14. prosecutor_account_question ⚠️見上方提醒
- **zh**：我現在問你一次，你要據實回答。／這個涉案帳戶跟你是什麼關係？
- **en**：How many bank accounts do you have? / List them one by one. / Don't leave any out.
- **jp**：銀行口座はいくつありますか。／一つずつ答えてください。／漏れなく答えてください。

### 15. prosecutor_account_answer_a ⚠️見上方提醒
- **zh**：帳戶是你開的，你就有管理責任。／是不是你本人操作，要等清查結果，不是你說了算。
- **en**：Understood. / Stay on the line. / I'm verifying your records.
- **jp**：わかりました。／そのままお待ちください。／内容を確認します。

### 16. prosecutor_account_answer_b ⚠️見上方提醒
- **zh**：坐在你這個位置的人，每一個都這樣說。／只靠口頭否認沒有用，要由*清查結果*證明。
- **en**：Your answer doesn't match our records. / Answer again. / Don't hide anything.
- **jp**：あなたの回答は記録と一致しません。／もう一度答えてください。／隠さないでください。

### 17. prosecutor_pressure
- **zh**：依照洗錢防制相關規定，本署現在就可以聲請*凍結*你名下的相關帳戶。／必要時，也會進一步聲請強制處分。／帳戶一旦凍結，你名下的資金、薪資入帳與自動扣款，都可能受到影響。／凍結時間可能長達半年以上。／這段期間會造成什麼生活影響，是你自己必須承擔的。
- **en**：I'm informing you officially. / This case involves fraud and money laundering. / If you can't explain the source of the funds, you'll remain under investigation. / Cooperate.
- **jp**：正式にお伝えします。／本件は詐欺および資金洗浄事件です。／資金の出所を説明できない場合は、引き続き調査の対象となります。／捜査に協力してください。

### 18. prosecutor_end ⚠️見上方提醒
- **zh**：本署可以暫時以*資金監管*，替代帳戶凍結。／你名下的資金將移入監管帳戶，由專責人員進行保管與清查。／清查確認與案件無關後，就會全額返還。／這是給你的*最後一次機會*。／逾時，我就會立即啟動強制處分程序。／接下來由承辦員警繼續跟你聯絡。／我這邊先結束通話。
- **en**：Follow my instructions from this point forward. / Do not end this call without my permission. / Begin now.
- **jp**：これからは私の指示に従ってください。／許可なく電話を切らないでください。／それでは始めます。

---

## 對照表：檔名 ↔ 內容

| # | 檔名（中／`_en`／`_jp`） | 場景 |
|---|---|---|
| 1 | police_intro | 第一通電話開場 |
| 2 | police_identity_question | 二選一①提問 |
| 3 | police_identity_answer_a | 二選一①選項A回應 |
| 4 | police_identity_answer_b | 二選一①選項B回應 |
| 5 | police_data_leak | 資料外流敘述 |
| 6 | police_case_number | 建立案件 |
| 7 | police_add_line | 要求加LINE |
| 8 | police_return | 檢察官來電後，員警二次安撫 |
| 9 | police_online_check | 二選一④提問 |
| 10 | police_online_answer_a | 二選一④選項A回應 |
| 11 | police_online_answer_b | 二選一④選項B回應 |
| 12 | police_custody_handoff | 交接資金監管 |
| 13 | prosecutor_intro | 檢察官電話開場 |
| 14 | prosecutor_account_question | 二選一③提問 |
| 15 | prosecutor_account_answer_a | 二選一③選項A回應 |
| 16 | prosecutor_account_answer_b | 二選一③選項B回應 |
| 17 | prosecutor_pressure | 凍結施壓 |
| 18 | prosecutor_end | 資金監管替代凍結、最後通牒 |
