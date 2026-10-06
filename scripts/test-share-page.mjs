import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const articlesIndex = JSON.parse(await readFile(new URL("../data/articles/index.json", import.meta.url), "utf8"));
const appHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const handlerSource = await readFile(new URL("../functions/share/[id].js", import.meta.url), "utf8");
const shareCard = await readFile(new URL("../assets/share-card.jpg", import.meta.url));
assert.equal(shareCard.subarray(0, 3).toString("hex"), "ffd8ff", "the share card should be a JPEG image");
assert.equal(shareCard.subarray(-2).toString("hex"), "ffd9", "the share card should be complete");
assert.ok(shareCard.length < 512 * 1024, "the share card should stay below 512 KB");
function readJpegDimensions(buffer) {
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset < buffer.length) {
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = buffer.readUInt16BE(offset);
    if (frameMarkers.has(marker)) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  throw new Error("Could not read share card dimensions");
}
assert.deepEqual(readJpegDimensions(shareCard), { width: 1200, height: 630 }, "the share card should be 1200 by 630 pixels");
const { onRequest } = await import("data:text/javascript;base64," + Buffer.from(handlerSource).toString("base64"));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function createAssets(index = articlesIndex) {
  let fetchCount = 0;
  return {
    get fetchCount() { return fetchCount; },
    async fetch(resource) {
      fetchCount += 1;
      const url = resource instanceof Request ? new URL(resource.url) : new URL(resource);
      if (url.pathname === "/") {
        return new Response(appHtml, { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      if (url.pathname === "/data/articles/index.json") {
        return new Response(JSON.stringify(index), { headers: { "content-type": "application/json" } });
      }
      return new Response("Not found", { status: 404 });
    }
  };
}

async function request(id, options = {}) {
  const assets = options.assets || createAssets();
  const response = await onRequest({
    request: new Request(options.url || "https://readmaud.test/share/" + encodeURIComponent(id), {
      method: options.method || "GET"
    }),
    params: { id },
    env: { ASSETS: assets }
  });
  return { response, assets };
}

const readyArticles = articlesIndex.articles.filter(article => article.ready === true);
assert.ok(readyArticles.length > 0, "the article index should contain ready articles");

for (const article of readyArticles) {
  const { response } = await request(article.id, {
    url: "https://readmaud.test/share/" + encodeURIComponent(article.id) + "?utm_source=test"
  });
  assert.equal(response.status, 200, article.id + " should return a share page");
  const html = await response.text();
  const title = article.title + "｜" + article.author + " · 閱讀萬花筒";
  const description = article.intro || article.author + "：《" + article.title + "》";
  assert.ok(html.includes('<meta property="og:title" content="' + escapeHtml(title) + '">'), article.id + " should have an article title");
  assert.ok(html.includes('<meta property="og:description" content="' + escapeHtml(description) + '">'), article.id + " should have an article description");
  assert.ok(html.includes('<meta property="og:type" content="article">'), article.id + " should have article OG type");
  const imageUrl = "https://readmaud.test/assets/share-card.jpg";
  assert.ok(html.includes('<meta property="og:image" content="' + imageUrl + '">'), article.id + " should have a share image");
  assert.ok(html.includes('<meta property="og:image:type" content="image/jpeg">'), article.id + " should declare the image type");
  assert.ok(html.includes('<meta property="og:image:width" content="1200">'), article.id + " should declare image width");
  assert.ok(html.includes('<meta property="og:image:height" content="630">'), article.id + " should declare image height");
  assert.ok(html.includes('<meta property="og:image:alt" content="閱讀萬花筒書頁插畫分享封面">'), article.id + " should describe the share image");
  assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'), article.id + " should use a large Twitter image card");
  assert.ok(html.includes('<meta name="twitter:image" content="' + imageUrl + '">'), article.id + " should include the Twitter image");
  assert.ok(html.includes('<meta name="twitter:title" content="' + escapeHtml(title) + '">'), article.id + " should have a Twitter title");
  assert.ok(html.includes('<link rel="canonical" href="https://readmaud.test/share/' + encodeURIComponent(article.id) + '">'), article.id + " canonical URL should omit tracking parameters");
  assert.equal((html.match(/property="og:title"/g) || []).length, 1, article.id + " should not duplicate OG titles");
}

const unreadyId = "article-test-unready";
const withUnready = {
  ...articlesIndex,
  articles: [...articlesIndex.articles, {
    id: unreadyId, title: "草稿", author: "作者", intro: "未完成", ready: false
  }]
};
const unready = await request(unreadyId, { assets: createAssets(withUnready) });
assert.equal(unready.response.status, 404, "unready articles should not get public share pages");

const invalid = await request("../data/articles/index.json");
assert.equal(invalid.response.status, 404, "path-like IDs should be rejected before lookup");
assert.equal(invalid.assets.fetchCount, 0, "invalid IDs should not reach the asset store");

const head = await request(readyArticles[0].id, { method: "HEAD" });
assert.equal(head.response.status, 200, "HEAD requests should be supported");
assert.equal(head.response.body, null, "HEAD responses should not include a body");

const wrongMethod = await request(readyArticles[0].id, { method: "POST" });
assert.equal(wrongMethod.response.status, 405, "non-read methods should be rejected");

const hostileArticle = {
  ...readyArticles[0],
  title: '<script>alert("x")</script>',
  author: 'A & "B"',
  intro: 'Read <this> & "that"'
};
const hostileIndex = {
  ...articlesIndex,
  articles: articlesIndex.articles.map(article =>
    article.id === hostileArticle.id ? hostileArticle : article)
};
const hostile = await request(hostileArticle.id, { assets: createAssets(hostileIndex) });
assert.equal(hostile.response.status, 200);
const hostileHtml = await hostile.response.text();
assert.ok(hostileHtml.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'), "article title must be escaped");
assert.ok(!hostileHtml.includes('<script>alert("x")</script>'), "article metadata must not inject HTML");

assert.ok(appHtml.includes('<base href="/">'), "the app should resolve assets from the root on share URLs");
assert.ok(appHtml.includes("complete.find(a=>a.id===sharedArticleId)"), "the app should open the shared article first");
assert.ok(appHtml.includes("new URL('/share/'+encodeURIComponent(a.id),location.origin)"), "the app should expose the article share URL");

console.log("Share preview tests passed for " + readyArticles.length + " ready articles and edge cases.");
