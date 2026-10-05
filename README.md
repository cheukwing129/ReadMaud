# ReadMaud｜中文延伸閱讀

純靜態中文閱讀網站。首頁每天按香港日期，從內容已整理完成的篇章中抽選一篇；同一天固定顯示同一篇，也可按「換一篇」或搜尋篇章庫。

## 新增文章

所有文章資料集中在根目錄的 `articles.json`。新增文章時只需編輯這個 JSON 檔，不用修改 `index.html`：

1. 在 `articles` 陣列最後加入一個新物件。可先複製 `article-template.json` 的範本。
2. 填寫不重複的 `id`、`order`、`title`、`author` 和全篇 `intro`。
3. `type` 必須填 `classical`（文言文）或 `vernacular`（白話文）；篇章庫可按類別篩選。
4. 每段放進 `paragraphs`：`text`、`summary`、`analysis` 都要填寫。文言文每段另須填 `translation` 和 `notes`；白話譯文會以點擊展開方式顯示。
5. 文言注釋請按該段實際語境撰寫，說明詞義、詞性／活用、句式或古今異義；需要時補充上下文，不要只貼通用詞典義。`term` 必須是原文中實際出現的詞語或句式，網站會把它標亮並設為點擊注釋；每項再填 `explanation`（語境解釋）。段意總結和分析會收起，讀者點擊標題後才展開。白話文的 `translation`、`notes` 可留空。
6. 將修改提交到 GitHub 的 `main` 分支。

新文章會自動出現在篇章庫。白話文補齊各段總結和分析後即可加入每日抽選；文言文還須每段具備譯文和至少一項注釋。未完成的文章會標示「內容整理中」。Cloudflare Pages 連接 GitHub 後，`main` 有新提交便會自動重新部署。

目前篇章庫有原 Google Sites 的 52 篇目錄，已按文言文／白話文分類；劉禹錫《陋室銘》與《宮之奇諫假道》已完成示範及逐段語境注釋，其餘 50 篇仍待遷移和編寫。

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
