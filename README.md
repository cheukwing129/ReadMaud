# ReadMaud｜中文延伸閱讀

純靜態中文閱讀網站。首頁每天按香港日期，從內容已整理完成的篇章中抽選一篇；同一天固定顯示同一篇，也可按「換一篇」或搜尋篇章庫。

## 閱讀設定

- 字號可由 12px 調至 30px，配色有紙本、明亮及夜讀；可選預設字體或思源宋體。字號、配色與字體會在同一瀏覽器保留，捲動及翻頁模式均適用。
- 一般捲動模式會在每段原文後直接展開總結與分析，仍可點擊標題收起。
- 「翻頁閱讀」可切換捲動／翻頁模式，並記住所選模式。直屏每次顯示一頁，橫屏顯示左右兩頁；右下角顯示當前頁碼。
- 可用上一頁／下一頁按鈕、左右方向鍵、Page Up／Page Down，或在手機原文區左右滑動翻頁。調整字號、轉屏及切換專注模式會重新分頁，盡量保留原本的閱讀位置。
- 翻頁模式中，標亮字詞仍可點開注釋；「譯文與分析」會列出目前頁面所涉及的段落。白話文按鈕顯示「段落分析」。
- 翻頁使用短暫的水平滑動動畫，啟用系統的「減少動態效果」時取消動畫。
- 專注模式可與翻頁模式同時開啟，隱藏段落總結及分析；文言文仍保留譯文，白話文只顯示原文。
- 紙本主題使用 `#f8f4e6` 背景與 `#B54434` 主題色，注釋反白使用 `#fddea5`；所有主題以 NIPPON COLORS 實際使用的紙紋圖片原尺寸重複鋪排，並沿用其頂部光澤素材。
- 捲動及翻頁模式共用注釋浮窗，位置限制在目前可見畫面之內；較長的注釋在浮窗內捲動。文章頁尾會列出索引中的文章出處連結；只接受 HTTPS，並在新分頁開啟。
- 「匯出 PDF」直接下載目前文章的 A4 PDF，只含篇名、作者、原文及頁碼，不含譯文、注釋、段落總結與分析。中文使用內嵌字體，可搜尋及複製；匯出程式與 PDF 字體在首次匯出時才載入。

字體與紙紋來源見 [`assets/NOTICE.md`](assets/NOTICE.md)，PDF 程式授權見 [`vendor/NOTICE.md`](vendor/NOTICE.md)。思源宋體以現有文章字元製成子集；新增文章若含未收錄字元，須重新製作字體子集，PDF 匯出會提示缺少的字元。

## 文章資料結構

文章資料拆成「索引＋單篇檔案」，網站只在使用者開啟文章時載入該篇完整內容：

- `data/articles/index.json`：篇章列表、分類、簡介、檔案位置及是否已整理完成。首頁與篇章庫只載入此索引。
- `data/articles/<id>.json`：每篇文章獨立存放，包含原文、譯文、注釋、段落總結及分析。
- `article-template.json`：新增單篇文章時使用的內容範本。

### 新增文章

1. 複製 `article-template.json`，存成 `data/articles/<id>.json`。使用唯一且固定的 ID，例如 `article-52`；檔名須與 ID 相同。
2. 填寫文章內容。沿用既有欄位；`schemaVersion` 固定為 `1`。不需要在文章檔手動加入 `ready`。
3. 在 `data/articles/index.json` 的 `articles` 陣列加入一筆索引資料：`id`、`order`、`title`、`author`、`type`、`category`、`intro`、`sourceUrl`、`paragraphCount`、`ready`、`dailyFrom` 和 `data`。其中 `data` 使用 `./data/articles/<id>.json`；`paragraphCount` 填段落數。`ready: true` 的文章須有 `dailyFrom`（YYYY-MM-DD），表示開始參與每日抽選的香港日期。新增文章或把文章改為 ready 時，請把 `dailyFrom` 設為下一個香港日期，避免當日的抽選名單因文章變動而改變。
4. 只有完成必要內容的文章才設 `ready: true`。白話文須有每段原文、總結和分析；文言文還須有每段譯文和至少一項注釋。未完成可設為 `false`，仍會列在篇章庫，但不會被每日抽選。
5. 提交後，網站先讀索引；選取文章時才請求該篇 JSON。每篇資料會在目前頁面工作期間快取。

注釋的 `term` 必須出現在相應段落原文中，並按語境解釋詞義、詞性／活用、句式或古今異義；必要時補充上下文。教育局注釋優先。內容欄位與閱讀功能沿用原有格式，無須修改 `index.html`。

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
