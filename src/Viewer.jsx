import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { previewUrl, originalUrl, saveOriginal, safeUrl } from "./media.js";
export default function Viewer({ view, onClose, toast }) {
  const [index, setIndex] = useState(0),
    [zoomed, setZoomed] = useState(false),
    [original, setOriginal] = useState(false),
    [menu, setMenu] = useState(false),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [saving, setSaving] = useState(false);
  const pointer = useRef(null);
  const stage = useRef(null);
  const video = view?.media[view.selected]?.video
    ? view.media[view.selected]
    : null;
  const items = view?.media.filter((item) => !item.video) || [];
  useEffect(() => {
    if (view) setIndex(Math.max(0, items.indexOf(view.media[view.selected])));
  }, [view]);
  useEffect(() => {
    setZoomed(false);
    setOriginal(false);
    setMenu(false);
    setLoading(true);
    setFailed(false);
    stage.current?.scrollTo(0, 0);
  }, [index, view]);
  const media = items[index];
  function change(delta) {
    setIndex((value) => Math.max(0, Math.min(items.length - 1, value + delta)));
  }
  async function download() {
    if (!media || saving) return;
    setSaving(true);
    const selected = media;
    try {
      const extension =
        new URL(originalUrl(selected.url)).pathname.match(
          /\.(jpe?g|png|webp|gif|heic|avif)$/i,
        )?.[1] || "jpg";
      await saveOriginal(selected.url, `园宝通-${index + 1}.${extension}`);
      toast("原图已下载");
    } catch (failure) {
      toast(failure.message || "下载失败，请查看原图后保存");
    } finally {
      setSaving(false);
    }
  }
  function touchEnd(event) {
    if (!pointer.current || zoomed) return;
    const dx = event.clientX - pointer.current.x,
      dy = event.clientY - pointer.current.y;
    pointer.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
      change(dx < 0 ? 1 : -1);
  }
  return (
    <Dialog
      open={!!view}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black" />
        <DialogPrimitive.Content
          className="viewer react-viewer"
          aria-describedby="viewer-description"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") change(-1);
            if (event.key === "ArrowRight") change(1);
          }}
        >
          <DialogTitle className="sr-only">
            {video ? "视频预览" : "图片预览"}
          </DialogTitle>
          <DialogDescription id="viewer-description" className="sr-only">
            左右滑动切换图片，双击放大，可下载原图。
          </DialogDescription>
          <header className="viewer-head">
            <DialogPrimitive.Close
              className="icon-button"
              aria-label="关闭预览"
            >
              ×
            </DialogPrimitive.Close>
            <span>{video ? "视频" : `${index + 1}/${items.length}`}</span>
            <button
              className="icon-button"
              aria-label="图片操作"
              aria-expanded={menu}
              onClick={() => setMenu((value) => !value)}
              disabled={!!video}
            >
              ···
            </button>
          </header>
          {menu && (
            <>
              <button
                className="image-menu-scrim"
                aria-label="关闭图片操作"
                onClick={() => setMenu(false)}
              />
              <div className="image-menu">
                <button onClick={download} disabled={saving}>
                  下载原图
                </button>
                <button
                  onClick={() => {
                    setLoading(true);
                    setFailed(false);
                    setOriginal(true);
                    setMenu(false);
                  }}
                >
                  查看原图
                </button>
                <button className="menu-cancel" onClick={() => setMenu(false)}>
                  取消
                </button>
              </div>
            </>
          )}
          {video ? (
            <div className="image-stage">
              <video
                controls
                playsInline
                src={safeUrl(video.url)}
                className="max-h-full w-full"
              />
            </div>
          ) : (
            <>
              <div
                ref={stage}
                className={`image-stage ${zoomed ? "zoomed" : ""}`}
                onPointerDown={(event) => {
                  if (!zoomed)
                    pointer.current = { x: event.clientX, y: event.clientY };
                }}
                onPointerUp={touchEnd}
                onPointerCancel={() => {
                  pointer.current = null;
                }}
              >
                {media && loading && !zoomed && (
                  <img
                    className="viewer-placeholder"
                    src={previewUrl(media.thumb || media.url, 480)}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                  />
                )}
                {media && (
                  <img
                    className={loading ? "image-loading" : ""}
                    key={`${index}-${original}`}
                    src={
                      original
                        ? originalUrl(media.url)
                        : previewUrl(
                            media.url,
                            window.innerWidth < 740 ? 960 : 1280,
                          )
                    }
                    alt={`第 ${index + 1} 张图片`}
                    draggable={false}
                    onDoubleClick={() => setZoomed((value) => !value)}
                    onLoad={() => setLoading(false)}
                    onError={() => {
                      setLoading(false);
                      setFailed(true);
                    }}
                  />
                )}
                {(loading || failed) && (
                  <span role="status">
                    {failed
                      ? "图片加载失败，可在右上角选择查看原图"
                      : "加载中…"}
                  </span>
                )}
              </div>
              <button
                className="image-nav prev"
                aria-label="上一张"
                disabled={index === 0}
                onClick={() => change(-1)}
              >
                ‹
              </button>
              <button
                className="image-nav next"
                aria-label="下一张"
                disabled={index === items.length - 1}
                onClick={() => change(1)}
              >
                ›
              </button>
              <footer className="viewer-foot">
                <span>{original ? "原图" : "快速预览"}</span>
                <button
                  className="viewer-action"
                  onClick={() => setZoomed((value) => !value)}
                >
                  {zoomed ? "缩小" : "放大"}
                </button>
                <button
                  className="save-image"
                  disabled={saving}
                  onClick={download}
                >
                  {saving ? "下载中…" : "↓ 下载原图"}
                </button>
              </footer>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}
