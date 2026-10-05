# ReadMaud｜中文延伸閱讀

純靜態中文閱讀網站。首頁每天按香港日期，從已完成逐段導讀的篇章中抽選一篇；同一天固定顯示同一篇，也可按「換一篇」或搜尋篇章庫。

## 新增文章

所有文章資料集中在根目錄的 `articles.json`。新增文章時只需編輯這個 JSON 檔，不用修改 `index.html`：

1. 在 `articles` 陣列最後加入一個新物件。可先複製 `article-template.json` 的範本。
2. 填寫不重複的 `id`、`order`、`title`、`author` 和全篇 `intro`。
3. 每段放進 `paragraphs`：`text`、`guide`、`summary`、`analysis` 都要填寫；`translation` 可留空。
4. 將修改提交到 GitHub 的 `main` 分支。

新文章會自動出現在篇章庫。完成全篇導讀欄位後，網站會把它加入每日隨機選讀；未完成的文章會標示「內容整理中」。Cloudflare Pages 連接 GitHub 後，`main` 有新提交便會自動重新部署。

目前篇章庫有原 Google Sites 的 52 篇目錄；劉禹錫《陋室銘》已完成逐段示範，其餘 51 篇仍待遷移和編寫。

## Cloudflare Pages 設定

在 Cloudflare Dashboard 前往 **Workers & Pages → Create application → Pages → Import an existing Git repository**，選擇 `cheukwing129/ReadMaud`，再設定：

| 設定 | 值 |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Root directory | 留空（repo 根目錄） |
| Build command | 留空 |
| Build output directory | `.` |

Cloudflare 官方指引：[Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) · [Static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)。
