# ReadMaud｜中文延伸閱讀

純靜態中文閱讀網站。首頁每天按香港日期從 52 篇篇章中抽選一篇；同一天固定顯示同一篇，也可按「換一篇」或搜尋篇章庫。

## 目前內容

- 篇章庫列出原 Google Sites 的 52 篇文章。
- 劉禹錫《陋室銘》已完成逐段原文、譯文、導讀、段意總結及分析。
- 其餘 51 篇仍待遷移原文與注釋，並補上逐段導讀、段意總結及分析；現階段可由原站連結閱讀。
- 搜尋與篇章選擇均在瀏覽器本機執行，不需要建置步驟或伺服器。

## 連接 Cloudflare Pages

在 Cloudflare Dashboard 前往 **Workers & Pages → Create application → Pages → Import an existing Git repository**，選擇 `cheukwing129/ReadMaud`，然後設定：

| 設定 | 值 |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Root directory | 留空（使用 repo 根目錄） |
| Build command | 留空 |
| Build output directory | `.` |

按 **Save and Deploy** 後，Cloudflare Pages 會從根目錄的 `index.html` 發佈網站。Cloudflare 官方指引：[Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) · [Static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)。
