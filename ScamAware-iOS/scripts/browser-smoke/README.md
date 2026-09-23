# Browser smoke tests（桌面 Chromium，非 iPhone 測試）

在沒有 Mac、沒有 iPhone 的環境下，先確認「網頁內容本身」沒有被移植改壞。
**這不是實機驗證**：Chromium 不是 iOS WebKit，也不支援 H.264 影片解碼。

```bash
cd ScamAware-iOS
bash scripts/build-web.sh                         # 產生 web/dist
(cd web && npx vite preview --port 4173 &)        # 用本機伺服器提供 web/dist
pip install pillow && python scripts/browser-smoke/make-fake-camera.py
npm i -g playwright                               # 或在 web/ 內 npx
node scripts/browser-smoke/ar-recognition.cjs     # 五張圖卡 → MindAR 辨識 → 點按進入情境
node scripts/browser-smoke/flows.cjs              # 相機拒絕、手動選單、工作人員頁、語言、離線
```

`PLAN=1:zh,2:en` 可只跑部分圖卡；`CHROMIUM_PATH` 可指定瀏覽器。`out/` 是產生的假相機檔，勿提交。
