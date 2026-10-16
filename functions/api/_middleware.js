// Keeps every /api/* response out of search indexes; robots.txt also disallows the path.
export async function onRequest(context) {
  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set("X-Robots-Tag", "noindex");
  return out;
}
