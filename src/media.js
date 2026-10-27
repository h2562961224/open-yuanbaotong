import { proxyUrl } from "./proxy.js";
const routes = {
  "ali-sybaby.zyosoft.cn": "ali",
  "qiniu-sybaby.zyosoft.cn": "qiniu",
  "qiniu.appbaby.net": "appbaby",
};
export function mediaProxyUrl(raw) {
  const source = safeUrl(raw);
  if (!source) return "";
  const url = new URL(source);
  const route = routes[url.hostname];
  return route ? proxyUrl(`/media/${route}${url.pathname}${url.search}`) : "";
}
export function safeUrl(raw) {
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    url.protocol = "https:";
    return url.href;
  } catch {
    return "";
  }
}
export function originalUrl(raw) {
  const source = safeUrl(raw);
  if (!source) return "";
  const url = new URL(source);
  if (
    [...url.searchParams.keys()].some((key) =>
      /signature|token|sign|expires/i.test(key),
    )
  )
    return source;
  url.searchParams.delete("x-oss-process");
  // Qiniu's processing directives are bare query keys, not conventional key=value pairs.
  for (const key of [...url.searchParams.keys()])
    if (/^image(View2|Mogr2)\//.test(key)) url.searchParams.delete(key);
  return url.href;
}
export function previewUrl(raw, width) {
  const original = originalUrl(raw);
  if (!original) return "";
  const url = new URL(original);
  // Signed URLs must retain the signed query, including any transformation.
  if (
    [...url.searchParams.keys()].some((key) =>
      /signature|token|sign|expires/i.test(key),
    )
  )
    return safeUrl(raw);
  if (url.hostname === "ali-sybaby.zyosoft.cn")
    url.searchParams.set(
      "x-oss-process",
      `image/resize,w_${width},limit_1/quality,q_82/auto-orient,1`,
    );
  else if (
    ["qiniu-sybaby.zyosoft.cn", "qiniu.appbaby.net"].includes(url.hostname)
  ) {
    return url.href + (url.search ? "&" : "?") + `imageView2/2/w/${width}/q/82`;
  }
  return url.href;
}
export async function saveOriginal(raw, filename) {
  const original = originalUrl(raw);
  if (!original) throw new Error("原图地址无效");
  const options = {
    signal: AbortSignal.timeout(120000),
    referrerPolicy: "no-referrer",
    mode: "cors",
    credentials: "omit",
  };
  let response;
  try {
    response = await fetch(original, options);
  } catch (error) {
    // Browsers report CORS and network failures as TypeError; HTTP errors and
    // cancellation must not trigger another download through the proxy.
    if (!(error instanceof TypeError)) throw error;
    const fallback = mediaProxyUrl(original);
    if (!fallback) throw error;
    response = await fetch(fallback, options);
  }
  if (!response.ok) throw new Error(`原图下载失败（${response.status}）`);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/"))
    throw new Error("服务器未返回图片，请选择“查看原图”重试");
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}
