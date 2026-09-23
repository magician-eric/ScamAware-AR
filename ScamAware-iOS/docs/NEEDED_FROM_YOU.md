# 需要你提供／決定的事項

沒有這些，就**無法**產生可以安裝的 IPA。程式與雲端建置設定已經先完成。

> 金鑰、憑證只放在 Codemagic 的 **Secure 環境變數**，不要傳給任何人、不要放進 git。
> 本專案的 `.gitignore` 已排除 `*.p8`、`*.p12`、`*.mobileprovision`、`*_key` 等檔案。

## 阻擋項目（依順序）

| # | 項目 | 誰做 | 在哪裡做（Windows 瀏覽器即可） | 用途 |
| --- | --- | --- | --- | --- |
| 1 | **Apple Developer Program（組織）會員**，年費 US$99 | 公司 | developer.apple.com/programs → Enroll。組織需 D-U-N-S 編號，審核約數天 | Ad Hoc 簽署必備。免費 Apple ID 做不到 |
| 2 | 你在該帳號的角色是 **Account Holder 或 Admin** | 公司 | App Store Connect → Users and Access | 建立 API 金鑰、登記裝置 |
| 3 | **Team ID**（10 碼） | 你 | developer.apple.com/account → Membership details | 核對用 |
| 4 | **登記 Bundle ID** `com.bigxreality.scamaware.ios`（或告訴我要用哪個） | 你 | Certificates, IDs & Profiles → Identifiers → + → App IDs → App；Capabilities 不用勾 | 簽章對象 |
| 5 | **App Store Connect API 金鑰**：Issuer ID、Key ID、`.p8` 檔 | 你 | App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → +，權限選 **Admin**（最少需能建立憑證與描述檔） | Codemagic 用它自動建立憑證與 Ad Hoc 描述檔。`.p8` **只能下載一次** |
| 6 | **憑證私鑰**（RSA 2048） | 你 | Windows PowerShell：`ssh-keygen -t rsa -b 2048 -m PEM -f scamaware_cert_key -q -N '""'` | Codemagic 用它產生 Apple Distribution 憑證。檔案自己保管好，之後每次建置都用同一把 |
| 7 | **每支 iPhone 的 UDID 與名稱** | 你 | 見下方「取得 UDID」 | Ad Hoc 只能裝在登記過的 iPhone，每年每類裝置上限 100 台 |
| 8 | 在 Apple Developer 網站**登記這些 UDID** | 你 | Certificates, IDs & Profiles → Devices → +（可用 [`devices-template.txt`](devices-template.txt) 一次上傳） | 登記後才會被放進描述檔 |
| 9 | **Codemagic 帳號**，連結放 iOS 專案的 GitHub repo | 你 | codemagic.io → Sign up with GitHub → Add application | 雲端 Mac 建置 |
| 10 | 在 Codemagic 建立變數群組 `scamaware_ios_signing`（4 個 Secure 變數） | 你 | 見 [`CODEMAGIC_SETUP.md`](CODEMAGIC_SETUP.md) 第 3 步 | 簽章 |
| 11 | 選擇**安裝發送方式**：Firebase App Distribution／公司 HTTPS 網址／USB 工具 | 你決定 | 見 [`INSTALL_WINDOWS_IPHONE.md`](INSTALL_WINDOWS_IPHONE.md) | 讓 iPhone 裝得到 |
| 12 | 決定 iOS 專案放哪個 repo（建議獨立私有 repo） | 你決定 | 見 [`CODEMAGIC_SETUP.md`](CODEMAGIC_SETUP.md) 第 0 步 | Codemagic 只讀 repo 根目錄的 `codemagic.yaml` |

## 取得 UDID（不用 Mac）

任選一種：

- **Windows + 傳輸線**：安裝 Microsoft Store 的「Apple 裝置」App（或 iTunes），接上 iPhone 並按「信任」，
  在裝置摘要頁**點「序號」那一列**，會輪流顯示 UDID，可複製。
  iPhone XS 以後的格式是 `00008xxx-xxxxxxxxxxxxxxxx`（25 字元，含一個 `-`）。
- **Firebase App Distribution**（若選這個發送方式）：同事在 iPhone 上接受邀請時會自動登記 UDID，
  你再從 Firebase 主控台匯出，上傳到 Apple Developer。
- 公司 MDM 若有管理這些 iPhone，也可以直接從 MDM 匯出。

**新增 iPhone 之後**：登記 UDID → 到 Certificates, IDs & Profiles → Profiles 刪除舊的
ScamAware Ad Hoc 描述檔 → 在 Codemagic 重新跑 `ios-adhoc`（會自動建立含新裝置的描述檔）→ 所有人重裝新 IPA。
建置紀錄的 `BUILD_INFO.txt` 會列出這次描述檔涵蓋幾台裝置，可用來確認。

## 費用與限制（以官方網站最新公告為準）

- Apple Developer Program：US$99／年；Ad Hoc 每年每類裝置最多 100 台，移除裝置的名額要到會員年度更新才釋出。
- Ad Hoc 描述檔最長有效 1 年、Distribution 憑證約 1 年；到期後 App **會打不開**，要重新建置並重裝。
- Codemagic：個人帳號每月有免費的 macOS 建置分鐘數，團隊方案依分鐘計費。一次 `ios-adhoc` 預估 10–20 分鐘。

## 不需要的東西

- 不需要 Mac、不需要 Xcode、不需要 Apple Enterprise Program（企業內部發佈計畫）。
- iPhone 端**不需要**開啟「開發者模式」、也不需要「信任開發者」（那是開發版與企業版才需要）。
