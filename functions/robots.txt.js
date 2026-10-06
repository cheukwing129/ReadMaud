const ROBOTS_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
  "x-content-type-options": "nosniff"
};

export async function onRequest({ request }) {
  const headRequest = request.method === "HEAD";
  if (request.method !== "GET" && !headRequest) {
    return new Response(headRequest ? null : "robots.txt only supports GET and HEAD.\n", {
      status: 405,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      }
    });
  }

  const sitemapUrl = new URL("/sitemap.xml", request.url).href;
  const body = "User-agent: *\nAllow: /\nSitemap: " + sitemapUrl + "\n";
  return new Response(headRequest ? null : body, {
    status: 200,
    headers: ROBOTS_HEADERS
  });
}
