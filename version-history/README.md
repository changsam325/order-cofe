# 版本變更紀錄

監看程式會為每次自動提交建立一筆 Markdown 紀錄：

```text
version-history/
└── YYYY-MM-DD/
    └── auto-HHmmssfff.md
```

每筆紀錄包含時間、分支及變更檔案清單。監看程式會排除這個資料夾，避免新增紀錄時再次觸發提交。

自動 commit 訊息使用繁體中文，標題包含日期時間；內文記錄提交時間、變更摘要及完整變更檔案清單，可用 `git log --format=fuller` 查閱。

## 啟動監看程式

1. 先手動完成首次 commit 與 push，並確認 Git 工作目錄乾淨。監看程式刻意要求乾淨狀態，避免啟動時意外推送既有工作。
2. 在儲存庫根目錄執行：

   ```powershell
   .\scripts\watch-and-push.ps1
   ```

3. 開發時保持 PowerShell 視窗開啟；按 `Ctrl+C` 停止。

程式會遞迴監看儲存庫中的檔案，預設在最後一次檔案變更後等待 5 秒，再提交變更並推送目前分支到 `origin`。符合 `.gitignore` 的檔案會略過。若 push 失敗，已建立的本機 commit 會保留；請先排除 Git 錯誤並手動推送，再重新啟動監看程式。
