const XML_HEADERS = {
  "content-type": "application/xml; charset=utf-8",
  "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
  "x-content-type-options": "nosniff"
};
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/;

function xmlEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;"
  })[character]);
}

function errorResponse(status, message, headRequest = false) {
  return new Response(headRequest ? null : message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export async function onRequest({ request, env }) {
  const headRequest = request.method === "HEAD";
  if (request.method !== "GET" && !headRequest) {
    return errorResponse(405, "Sitemap only supports GET and HEAD.", headRequest);
  }

  try {
    const response = await env.ASSETS.fetch(new URL("/data/articles/index.json", request.url));
    if (!response.ok) return errorResponse(503, "Sitemap is temporarily unavailable.", headRequest);

    const index = await response.json();
    if (!index || !Array.isArray(index.articles)) {
      return errorResponse(503, "Article index is invalid.", headRequest);
    }

    const origin = new URL(request.url).origin;
    const locations = [new URL("/", origin).href];
    for (const article of index.articles) {
      if (article?.ready !== true || typeof article.id !== "string" || !ID_PATTERN.test(article.id)) continue;
      locations.push(new URL("/share/" + encodeURIComponent(article.id), origin).href);
    }

    const entries = locations.map(location =>
      "  <url>\n    <loc>" + xmlEscape(location) + "</loc>\n  </url>"
    ).join("\n");
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      entries + "\n</urlset>\n";

    return new Response(headRequest ? null : xml, {
      status: 200,
      headers: XML_HEADERS
    });
  } catch {
    return errorResponse(503, "Sitemap is temporarily unavailable.", headRequest);
  }
}
