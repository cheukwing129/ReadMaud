const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
  "x-content-type-options": "nosniff"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function errorResponse(status, title, message) {
  const html = '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>' +
    escapeHtml(title) + '</title></head><body><main><h1>' + escapeHtml(title) +
    '</h1><p>' + escapeHtml(message) + '</p><a href="/">返回 ReadMaud</a></main></body></html>';
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function upsertMeta(html, attribute, key, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find(candidate => {
    const match = candidate.match(/(?:^|\s)(name|property)="([^"]*)"/i);
    return match?.[1]?.toLowerCase() === attribute.toLowerCase() && match?.[2] === key;
  });
  const replacement = '<meta ' + attribute + '="' + key + '" content="' + escapeHtml(value) + '">';
  if (tag) return html.replace(tag, () => replacement);
  return html.replace(/<\/head>/i, () => replacement + '</head>');
}

function upsertCanonical(html, url) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  const tag = tags.find(candidate => {
    const match = candidate.match(/\brel="([^"]*)"/i);
    return match?.[1]?.toLowerCase() === "canonical";
  });
  const replacement = '<link rel="canonical" href="' + escapeHtml(url) + '">';
  if (tag) return html.replace(tag, () => replacement);
  return html.replace(/<\/head>/i, () => replacement + '</head>');
}

export async function onRequest({ request, env, params }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return errorResponse(405, "不支援的請求", "分享頁只接受 GET 或 HEAD 請求。");
  }

  const id = typeof params?.id === "string" ? params.id : "";
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/.test(id)) {
    return errorResponse(404, "找不到文章", "這篇文章不存在或尚未開放閱讀。");
  }

  try {
    const [indexResponse, appResponse] = await Promise.all([
      env.ASSETS.fetch(new URL("/data/articles/index.json", request.url)),
      env.ASSETS.fetch(new URL("/", request.url))
    ]);
    if (!indexResponse.ok || !appResponse.ok) {
      return errorResponse(503, "分享頁暫時無法使用", "請稍後再試。");
    }

    const index = await indexResponse.json();
    if (!index || !Array.isArray(index.articles)) {
      return errorResponse(503, "分享頁暫時無法使用", "文章索引格式錯誤。");
    }
    const article = index.articles.find(item => item?.id === id);
    if (!article || article.ready !== true) {
      return errorResponse(404, "找不到文章", "這篇文章不存在或尚未開放閱讀。");
    }

    let html = await appResponse.text();
    if (!/<head\b/i.test(html) || !/<\/head>/i.test(html)) {
      return errorResponse(503, "分享頁暫時無法使用", "網站頁面格式不正確。");
    }

    const title = (article.title || "今天讀甚麼？") + "｜" +
      (article.author || "ReadMaud") + " · ReadMaud";
    const description = article.intro || (article.author || "ReadMaud") +
      "：《" + (article.title || "今天讀甚麼？") + "》";
    const requestUrl = new URL(request.url);
    const shareUrl = new URL("/share/" + encodeURIComponent(article.id), requestUrl.origin).href;

    html = html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, () =>
      '<title>' + escapeHtml(title) + '</title>');
    const metadata = [
      ["name", "description", description],
      ["property", "og:type", "article"],
      ["property", "og:locale", "zh_HK"],
      ["property", "og:site_name", "ReadMaud"],
      ["property", "og:title", title],
      ["property", "og:description", description],
      ["property", "og:url", shareUrl],
      ["property", "article:author", article.author || "ReadMaud"],
      ["name", "twitter:card", "summary"],
      ["name", "twitter:title", title],
      ["name", "twitter:description", description]
    ];
    for (const [attribute, key, value] of metadata) {
      html = upsertMeta(html, attribute, key, value);
    }
    html = upsertCanonical(html, shareUrl);

    return new Response(request.method === "HEAD" ? null : html, {
      status: 200,
      headers: HTML_HEADERS
    });
  } catch {
    return errorResponse(503, "分享頁暫時無法使用", "請稍後再試。");
  }
}
