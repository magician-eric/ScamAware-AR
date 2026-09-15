# CIBAR Delivery History

**這份文件記錄實際交付出去的版本。** 它不是開發 changelog，也不是發布紀錄。

- **Release** —— 系統正式發布了一個版本 → [`RELEASE_HISTORY.md`](RELEASE_HISTORY.md)
- **Delivery** —— 某個版本實際交付給客戶／現場／設備 → **這份文件**

`1.4.0` 可能發布了但從來沒有交出去；真正交到現場的可能是 `1.4.2`。
兩者不能混在一起，也不能互相取代（規範 [§13](RELEASE_VERSIONING.md)）。

這份表格存在的唯一理由，是為了在半年後還能精確回答：

> 2026/09/01 到底交出去的是哪一版？

## 這份表格由人填寫

交付紀錄不能自動化：只有把設備交出去的那個人知道那台機器上裝的是哪一支 APK。
**交付當下就填**，不要事後補 —— 事後補的版本號是回憶，不是紀錄。

## 交付時要做的四件事

1. 記下這支 APK 的 **Shell Version**（手機「應用程式資訊」的 versionName，開頭那段就是；
   或看該次 `build-android.yml` 的 GitHub Release 說明）。
2. 記下設備上目前的 **Web Bundle / Release ID**：
   - 離線 APK：內建的就是打包當下的 bundle，見該次 APK release 說明；
   - OTA 更新過的設備：`release/ota/latest.json`，或 `/ar-scan?diag=1` 診斷 overlay 最上面那一行。
3. 對**實際交出去的那個檔案**算 SHA-256（不是對 CI 的輸出算，是對手上這一份算）：

   ```bash
   sha256sum offline.apk
   ```

4. 在下面新增一列。

## Deliveries

**最新的在最上面。** 表格是空的就代表尚未有任何正式交付。

| Delivery Date | Recipient / Project | APK Shell | Web Bundle | Release ID | APK SHA-256 | Notes |
| ------------- | ------------------- | --------- | ---------- | ---------- | ----------- | ----- |

<!-- 範例（實際交付後照這個格式新增一列，並移除本註解上方的空白列）：
| 2026-09-01 | CIB 反詐騙教育館 | 1.0.0 | 1.4.2 | 1.4.2-20260901.001 | a3f1…（完整 64 碼） | 正式展示版，10 台眼鏡 |
-->

### 欄位

| 欄位 | 意義 |
| --- | --- |
| `Delivery Date` | 實際交付日期（`YYYY-MM-DD`） |
| `Recipient / Project` | 交給誰／哪個專案或場域 |
| `APK Shell` | 交出去那支 APK 的 Shell Version，例如 `1.0.0` |
| `Web Bundle` | 設備上實際執行的 Web Bundle Semantic Version，例如 `1.4.2` |
| `Release ID` | 對應的完整 Release ID，例如 `1.4.2-20260901.001` |
| `APK SHA-256` | 交出去那個 APK 檔案的完整 SHA-256（64 碼，不要截斷） |
| `Notes` | 用途、數量、現場、限制條件等 |

APK SHA-256 是**這份紀錄能被驗證**的原因：日後任何人拿著一支 APK 重算一次雜湊，就能確認
它是不是當時交出去的那一支。OTA Bundle 的 SHA-256 不寫在這裡，它在該 Release 的 manifest
（`release/ota/releases/<Release ID>.json`）裡，用 Release ID 就查得到。
