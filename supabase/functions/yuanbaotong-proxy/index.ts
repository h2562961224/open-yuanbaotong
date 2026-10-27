const routes: Record<string, string> = {
  "api/account": "https://oapi2.zyosoft.cn/account/",
  "api/timeline": "https://oapi2.zyosoft.cn/sy-timeline/",
  "api/license": "https://oapi2.zyosoft.cn/license/",
  "api/checkin": "https://oapi2.zyosoft.cn/sy-checkin/",
  "api/member": "https://oapi2.zyosoft.cn/member/",
  "api/share": "https://oapi2.zyosoft.cn/share/",
  "api/cloud": "https://oapi2.zyosoft.cn/sy-cloud-disk/",
  "api/album": "https://oapi2.zyosoft.cn/sy-album/",
  "media/ali": "https://ali-sybaby.zyosoft.cn/",
  "media/qiniu": "https://qiniu-sybaby.zyosoft.cn/",
  "media/appbaby": "https://qiniu.appbaby.net/",
  "media/fonts": "https://admin.appbaby.net/image/font/",
};
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers":
    "token, app-id, app-version, ram-version, content-type, range, authorization, apikey, x-client-info, x-supabase-client-platform",
  "Access-Control-Expose-Headers":
    "content-type, content-disposition, content-range, accept-ranges",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
function failure(status: number, message: string) {
  return Response.json(
    { success: false, message },
    {
      status,
      headers: { ...cors, "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (!["GET", "POST", "HEAD"].includes(req.method))
    return failure(405, "请求方法不支持");
  const incoming = new URL(req.url);
  const match = incoming.pathname.match(
    /\/yuanbaotong-proxy\/(api|media)\/([^/]+)\/(.*)$/,
  );
  if (!match) return failure(404, "转发路径不存在");
  const route = `${match[1]}/${match[2]}`;
  if (!routes[route]) return failure(404, "转发服务不存在");
  if (match[1] === "media" && req.method === "POST")
    return failure(405, "素材仅支持读取");
  let decoded: string;
  try {
    decoded = decodeURIComponent(match[3]);
  } catch {
    return failure(400, "转发路径无效");
  }
  if (
    decoded.split("/").some((part) => part === "." || part === "..") ||
    decoded.includes("\\")
  ) {
    return failure(400, "转发路径无效");
  }
  const target = new URL(routes[route] + match[3]);
  target.search = incoming.search;
  const headers = new Headers();
  for (const name of [
    "token",
    "app-id",
    "app-version",
    "ram-version",
    "content-type",
    "range",
  ]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  for (const name of ["user-agent", "accept", "accept-language"]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  const body = req.method === "POST" ? await req.arrayBuffer() : undefined;
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "error",
      signal: AbortSignal.timeout(match[1] === "media" ? 120000 : 25000),
    });
    const outgoing = new Headers(cors);
    for (const name of [
      "content-type",
      "content-disposition",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ]) {
      const value = upstream.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    outgoing.set("Cache-Control", "private, no-store, max-age=0");
    return new Response(req.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: outgoing,
    });
  } catch {
    return failure(502, "园宝通服务连接失败，请稍后重试");
  }
});
