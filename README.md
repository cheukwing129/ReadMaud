# ReadMaud｜中文延伸閱讀

純靜態中文閱讀網站。首頁每天按香港日期，從內容已整理完成的篇章中抽選一篇；同一天固定顯示同一篇，也可按「換一篇」或搜尋篇章庫。

## 閱讀設定

- 字號可由 12px 調至 30px，配色有紙本、明亮及夜讀；字號與配色會在同一瀏覽器保留。
- 「翻頁閱讀」可切換捲動／翻頁模式，並記住所選模式。直屏每次顯示一頁，橫屏顯示左右兩頁；右下角顯示當前頁碼。
- 可用上一頁／下一頁按鈕、左右方向鍵、Page Up／Page Down，或在手機原文區左右滑動翻頁。調整字號、轉屏及切換專注模式會重新分頁，盡量保留原本的閱讀位置。
- 翻頁模式中，標亮字詞仍可點開注釋；「譯文與分析」會列出目前頁面所涉及的段落。白話文按鈕顯示「段落分析」。
- 翻頁使用短暫的水平滑動動畫，啟用系統的「減少動態效果」時取消動畫。
- 專注模式可與翻頁模式同時開啟，隱藏段落總結及分析；文言文仍保留譯文，白話文只顯示原文。
- 紙本主題使用 `#f8f4e6` 背景與 `#B54434` 主題色，注釋反白使用 `#fddea5`；所有主題使用本地的淡紙紋素材。
- 捲動及翻頁模式共用注釋浮窗，位置限制在目前可見畫面之內；較長的注釋在浮窗內捲動。閱讀頁不再提供原篇章外部連結。

## 新增文章

所有文章資料集中在根目錄的 `articles.json`。新增文章時只需編輯這個 JSON 檔，不用修改 `index.html`：

1. 在 `articles` 陣列最後加入一個新物件。可先複製 `article-template.json` 的範本。
2. 填寫不重複的 `id`、`order`、`title`、`author` 和全篇 `intro`。
3. `type` 必須填 `classical`（文言文）或 `vernacular`（白話文）；篇章庫可按類別篩選。
4. 每段放進 `paragraphs`：`text`、`summary`、`analysis` 都要填寫。文言文每段另須填 `translation` 和 `notes`；白話譯文會以點擊展開方式顯示。
5. 文言注釋請按該段實際語境撰寫，說明詞義、詞性／活用、句式或古今異義；需要時補充上下文，不要只貼通用詞典義。`term` 必須是原文中實際出現的詞語或句式，網站會把它標亮並設為點擊注釋；每項再填 `explanation`（語境解釋）。段意總結和分析會收起，讀者點擊標題後才展開。白話文的 `translation`、`notes` 可留空。
6. 將修改提交到 GitHub 的 `main` 分支。

新文章會自動出現在篇章庫。白話文補齊各段總結和分析後即可加入每日抽選；文言文還須每段具備譯文和至少一項注釋。未完成的文章會標示「內容整理中」。Cloudflare Pages 連接 GitHub 後，`main` 有新提交便會自動重新部署。

目前已完成原 Google Sites 第 1 至第 52 周的篇章整理。按要求將《陳情表（上）》與《陳情表（下）》合併為一篇，因此篇章庫共 51 篇：26 篇文言文、25 篇白話文。所有文章均已完成逐段總結與分析；文言文各段亦已補上譯文和語境注釋。全庫已核對必填欄位與注釋錨點，未發現缺漏。

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
