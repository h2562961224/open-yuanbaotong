import { request } from "./api.js";
import { safeUrl } from "./media.js";
export async function uploadFile(file, onProgress = () => {}) {
  const ticket = await request("account", "/api/client/app/qiniu/token");
  if (!ticket?.token || !safeUrl(ticket.domain))
    throw new Error("上传凭据不可用，请重试");
  const { upload } = await import("qiniu-js");
  const suffix = file.name.split(".").at(-1)?.toLowerCase() || "";
  const key = `web_${crypto.randomUUID()}.${suffix}`;
  const result = await new Promise((resolve, reject) =>
    upload(
      file,
      key,
      ticket.token,
      {},
      { useCdnDomain: true, disableStatisticsReport: true },
    ).subscribe({
      next: (result) => onProgress(Math.round(result.total.percent)),
      error: reject,
      complete: resolve,
    }),
  );
  const fileUrl = safeUrl(ticket.domain).replace(/\/$/, "") + "/" + result.key;
  const metadata = await new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("image/")) {
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
          duration: 0,
        });
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: 0, height: 0, duration: 0 });
      };
      image.src = url;
    } else {
      const media = document.createElement(
        file.type.startsWith("audio/") ? "audio" : "video",
      );
      media.preload = "metadata";
      media.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: media.videoWidth || 0,
          height: media.videoHeight || 0,
          duration: Number.isFinite(media.duration)
            ? Math.round(media.duration)
            : 0,
        });
      };
      media.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: 0, height: 0, duration: 0 });
      };
      media.src = url;
    }
  });
  return { fileUrl, suffix, ...metadata };
}
