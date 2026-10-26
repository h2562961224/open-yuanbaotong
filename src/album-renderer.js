import { safeUrl } from "./media.js";

const imageCache = new Map();
const fontCache = new Map();
export function albumAsset(raw) {
  if (raw?.startsWith("blob:")) return raw;
  const safe = safeUrl(raw);
  if (!safe) throw new Error("页面素材地址无效");
  const url = new URL(safe);
  const route = {
    "qiniu-sybaby.zyosoft.cn": "qiniu",
    "ali-sybaby.zyosoft.cn": "ali",
    "qiniu.appbaby.net": "appbaby",
  }[url.hostname];
  if (
    url.hostname === "admin.appbaby.net" &&
    url.pathname.startsWith("/image/font/")
  )
    return `/media/fonts/${url.pathname.slice("/image/font/".length)}${url.search}`;
  return route ? `/media/${route}${url.pathname}${url.search}` : safe;
}
export function loadAlbumImage(url) {
  if (!imageCache.has(url))
    imageCache.set(
      url,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () => {
          imageCache.delete(url);
          reject(new Error("页面素材加载失败，请重试"));
        };
        image.src = albumAsset(url);
      }),
    );
  return imageCache.get(url);
}
export async function loadAlbumFonts(fonts, pages) {
  const needed = new Set(
    pages.flatMap((p) =>
      (p.layers || []).map((l) => l.style_font?.fontFamily).filter(Boolean),
    ),
  );
  await Promise.all(
    [...needed].map(async (name) => {
      const entry = fonts.find(
        (f) => f.font_name === name || f.font_nick === name,
      );
      if (!entry) throw new Error(`尚未取得字体“${name}”，请重试`);
      if (!fontCache.has(name))
        fontCache.set(
          name,
          (async () => {
            const font = new FontFace(
              name,
              `url("${albumAsset(entry.font_url)}")`,
            );
            await font.load();
            document.fonts.add(font);
          })().catch((error) => {
            fontCache.delete(name);
            throw error;
          }),
        );
      await fontCache.get(name);
    }),
  );
}
export function layerBounds(layer) {
  const width = Number(layer.style_width) || 0,
    height = Number(layer.style_height) || 0;
  return {
    width,
    height,
    x: Number(layer.style_left) || 0,
    y: Number(layer.style_top) || 0,
    scale: Number(layer.style_scale) || 1,
    angle: Number(layer.style_angle) || 0,
  };
}
function clipShape(ctx, layer, w, h) {
  ctx.beginPath();
  if (layer.layer_id === "shape-circle")
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (Array.isArray(layer.layer_path) && layer.layer_path.length) {
    for (const ring of layer.layer_path) {
      ring.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    }
  } else ctx.rect(0, 0, w, h);
  ctx.clip("evenodd");
}
function canvasColor(value) {
  if (/^#[\da-f]{8}$/i.test(value || ""))
    return "#" + value.slice(3) + value.slice(1, 3);
  return value || "#000000";
}
function paintText(ctx, layer, w) {
  const font = layer.style_font || {},
    size = parseFloat(font.fontSize) || 24;
  ctx.font = `${font.fontWeight === "bold" ? "bold " : ""}${size}px "${font.fontFamily || "sans-serif"}"`;
  ctx.fillStyle = canvasColor(font.color);
  ctx.textBaseline = "top";
  ctx.textAlign = ["left", "center", "right"].includes(font.textAlign)
    ? font.textAlign
    : "left";
  const x =
    ctx.textAlign === "center" ? w / 2 : ctx.textAlign === "right" ? w : 0;
  const lines = [];
  for (const paragraph of String(layer.layer_text || "").split("\n")) {
    let line = "";
    for (const char of paragraph) {
      if (line && ctx.measureText(line + char).width > w) {
        lines.push(line);
        line = "";
      }
      line += char;
    }
    lines.push(line);
  }
  lines.forEach((line, i) =>
    ctx.fillText(line, x, i * size * (Number(font.lineHeight) || 1.16)),
  );
}
export async function renderAlbumPage(canvas, page, size, fonts) {
  if (!(size?.preview_width > 0 && size?.preview_height > 0))
    throw new Error("档案页面尺寸无效");
  const layers = [...(page.layers || [])].sort(
    (a, b) => (a.sort || 0) - (b.sort || 0),
  );
  await loadAlbumFonts(fonts, [page]);
  const urls = [
    page.back_preview_url,
    ...layers.flatMap((l) => [l.layer_url, l.photo_url]),
  ].filter(Boolean);
  const images = new Map(
    await Promise.all(
      [...new Set(urls)].map(async (url) => [url, await loadAlbumImage(url)]),
    ),
  );
  // Build offscreen first: a failed load must never leave a half-painted thumbnail to save.
  const buffer = document.createElement("canvas");
  buffer.width = size.preview_width;
  buffer.height = size.preview_height;
  const ctx = buffer.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, buffer.width, buffer.height);
  if (page.back_preview_url)
    ctx.drawImage(
      images.get(page.back_preview_url),
      0,
      0,
      buffer.width,
      buffer.height,
    );
  for (const layer of layers) {
    if (layer.layer_id === "shape-qr") continue; // Native editor also hides QR layers.
    const { width: w, height: h, x, y, scale, angle } = layerBounds(layer);
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);
    if (["text", "field", "title"].includes(layer.layer_type))
      paintText(ctx, layer, w);
    else if (layer.layer_type === "shape") {
      ctx.save();
      clipShape(ctx, layer, w, h);
      if (layer.photo_url) {
        const image = images.get(layer.photo_url),
          style = layer.style_image || {};
        const ratio = Math.max(w / image.width, h / image.height);
        const iw = Number(style.width) || image.width * ratio,
          ih = Number(style.height) || image.height * ratio;
        ctx.translate(
          w / 2 + (Number(style.offX) || 0),
          h / 2 + (Number(style.offY) || 0),
        );
        ctx.rotate(Number(style.angle) || 0);
        ctx.drawImage(image, -iw / 2, -ih / 2, iw, ih);
      } else {
        ctx.fillStyle = "#eeeeee";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#999";
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("点击添加照片", w / 2, h / 2);
      }
      ctx.restore();
    } else if (layer.layer_url)
      ctx.drawImage(images.get(layer.layer_url), 0, 0, w, h);
    ctx.restore();
  }
  canvas.width = buffer.width;
  canvas.height = buffer.height;
  canvas.getContext("2d").drawImage(buffer, 0, 0);
  return canvas;
}
export function pagePng(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(new File([blob], "thumb.png", { type: "image/png" }))
          : reject(new Error("页面缩略图生成失败")),
      "image/png",
    ),
  );
}
