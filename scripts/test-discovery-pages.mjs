import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const articlesIndex = JSON.parse(await readFile(new URL("../data/articles/index.json", import.meta.url), "utf8"));
const sitemapSource = await readFile(new URL("../functions/sitemap.xml.js", import.meta.url), "utf8");
const robotsSource = await readFile(new URL("../functions/robots.txt.js", import.meta.url), "utf8");
const routeConfig = JSON.parse(await readFile(new URL("../_routes.json", import.meta.url), "utf8"));
assert.equal(routeConfig.version, 1);
assert.ok(routeConfig.include.includes("/share/*"));
assert.ok(routeConfig.include.includes("/sitemap.xml"), "Cloudflare should invoke the sitemap Function");
assert.ok(routeConfig.include.includes("/robots.txt"), "Cloudflare should invoke the robots Function");
const { onRequest: createSitemap } = await import("data:text/javascript;base64," + Buffer.from(sitemapSource).toString("base64"));
const { onRequest: createRobots } = await import("data:text/javascript;base64," + Buffer.from(robotsSource).toString("base64"));

function createAssets(index = articlesIndex, status = 200) {
  let fetchCount = 0;
  return {
    get fetchCount() { return fetchCount; },
    async fetch(resource) {
      fetchCount += 1;
      const url = resource instanceof Request ? new URL(resource.url) : new URL(resource);
      assert.equal(url.pathname, "/data/articles/index.json", "discovery routes should only read the article index");
      return new Response(JSON.stringify(index), { status, headers: { "content-type": "application/json" } });
    }
  };
}

async function run(handler, path, options = {}) {
  const assets = options.assets || createAssets(options.index || articlesIndex, options.assetStatus || 200);
  const response = await handler({
    request: new Request("https://readmaud.test" + path, { method: options.method || "GET" }),
    env: { ASSETS: assets }
  });
  return { response, assets };
}

const readyArticles = articlesIndex.articles.filter(article => article.ready === true);
const { response: sitemapResponse, assets: sitemapAssets } = await run(createSitemap, "/sitemap.xml");
assert.equal(sitemapResponse.status, 200);
assert.match(sitemapResponse.headers.get("content-type"), /^application\/xml; charset=utf-8$/);
assert.match(sitemapResponse.headers.get("cache-control"), /s-maxage=600/);
const sitemap = await sitemapResponse.text();
assert.ok(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
assert.ok(sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
assert.ok(sitemap.endsWith("</urlset>\n"));
assert.equal((sitemap.match(/<url>/g) || []).length, readyArticles.length + 1, "sitemap should include the home page and all ready articles");
assert.ok(sitemap.includes("<loc>https://readmaud.test/</loc>"), "sitemap should include the home page");
for (const article of readyArticles) {
  assert.ok(sitemap.includes("<loc>https://readmaud.test/share/" + encodeURIComponent(article.id) + "</loc>"), article.id + " should have an absolute share URL");
}
assert.equal(sitemapAssets.fetchCount, 1);

const withUnreadyAndInvalid = {
  ...articlesIndex,
  articles: [...articlesIndex.articles,
    { id: "article-draft", ready: false },
    { id: "../private", ready: true }]
};
const filtered = await run(createSitemap, "/sitemap.xml", { index: withUnreadyAndInvalid });
const filteredXml = await filtered.response.text();
assert.ok(!filteredXml.includes("article-draft"), "unready articles should not be listed");
assert.ok(!filteredXml.includes("../private"), "unsafe IDs should not be listed");

const head = await run(createSitemap, "/sitemap.xml", { method: "HEAD" });
assert.equal(head.response.status, 200);
assert.equal(head.response.body, null);
const unavailable = await run(createSitemap, "/sitemap.xml", { assetStatus: 404 });
assert.equal(unavailable.response.status, 503);
const wrongSitemapMethod = await run(createSitemap, "/sitemap.xml", { method: "POST" });
assert.equal(wrongSitemapMethod.response.status, 405);
assert.equal(wrongSitemapMethod.assets.fetchCount, 0);

const robotsResponse = await createRobots({
  request: new Request("https://custom.example/robots.txt"),
  env: {}
});
assert.equal(robotsResponse.status, 200);
assert.match(robotsResponse.headers.get("content-type"), /^text\/plain; charset=utf-8$/);
assert.equal(await robotsResponse.text(), "User-agent: *\nAllow: /\nSitemap: https://custom.example/sitemap.xml\n");
const robotsHead = await createRobots({
  request: new Request("https://custom.example/robots.txt", { method: "HEAD" }),
  env: {}
});
assert.equal(robotsHead.status, 200);
assert.equal(robotsHead.body, null);
const wrongRobotsMethod = await createRobots({
  request: new Request("https://custom.example/robots.txt", { method: "POST" }),
  env: {}
});
assert.equal(wrongRobotsMethod.status, 405);

console.log("Discovery route tests passed for " + readyArticles.length + " ready article pages.");
