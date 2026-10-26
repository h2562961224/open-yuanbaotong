import { useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Type,
  Undo2,
  Redo2,
  Eye,
  RotateCw,
  Trash2,
  List,
} from "lucide-react";
import * as api from "../api.js";
import { useRemote } from "../hooks.js";
import { Header, State } from "../ui.jsx";
import ArchivePhotos from "./ArchivePhotos.jsx";
import { previewUrl } from "../media.js";
import { uploadFile } from "../upload.js";
import {
  layerBounds,
  loadAlbumImage,
  renderAlbumPage,
  pagePng,
} from "../album-renderer.js";

const clone = (value) => structuredClone(value);
const canonical = (value) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
const editableLayer = (l) => l.layer_id !== "shape-qr";
const textLayer = (l) => ["text", "title", "field"].includes(l?.layer_type);
const fingerprint = (p) =>
  canonical({
    layers: p.layers,
    assess: p.assess,
    back: p.back_preview_url,
    template: p.tmpl_page_id,
    status: p.enum_status,
    parent: p._parent,
  });
export default function BookEditor({ id, title, child, onBack, toast }) {
  const state = useRemote(async () => {
    const [book, fonts, photos] = await Promise.all([
      api.bookInfo(id),
      api.albumFonts(),
      api.bookImages(id),
    ]);
    return { book, fonts, photos };
  }, [id]);
  const [index, setIndex] = useState(0),
    [showAll, setShowAll] = useState(false),
    [pages, setPages] = useState({}),
    [dirty, setDirty] = useState([]),
    [selected, setSelected] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [panel, setPanel] = useState(""),
    [preview, setPreview] = useState(false),
    [painted, setPainted] = useState(false),
    [paintRetry, setPaintRetry] = useState(0),
    [history, setHistory] = useState({ past: [], future: [] });
  const canvas = useRef(),
    baseline = useRef(new Map()),
    localFiles = useRef(new Map()),
    drag = useRef(),
    pageRef = useRef(),
    historyRef = useRef(history),
    paintEpoch = useRef(0),
    alive = useRef(true),
    saveLock = useRef(false);
  const book = state.data?.book,
    fonts = state.data?.fonts || [];
  const list = (book?.pages || []).filter((p) => showAll || p._parent);
  const summary = list[index],
    page = pages[summary?.order_page_id],
    layer = page?.layers?.find((l) => l.order_layer_id === selected);
  const canEdit = !!page?._parent && book?.enum_status !== 200;
  pageRef.current = page;
  historyRef.current = history;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      for (const url of localFiles.current.keys()) URL.revokeObjectURL(url);
    };
  }, []);
  useEffect(() => {
    if (!summary) return;
    const pid = summary.order_page_id;
    let active = true;
    setSelected(null);
    setPanel("");
    setHistory({ past: [], future: [] });
    setError("");
    if (pages[pid]) return;
    setLoading(true);
    api
      .bookPage(pid)
      .then((p) => {
        if (active) {
          baseline.current.set(pid, clone(p));
          setPages((old) => ({ ...old, [pid]: p }));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [summary?.order_page_id]);
  useEffect(() => {
    const stamp = ++paintEpoch.current;
    setPainted(false);
    if (!page || !canvas.current) return;
    const target = document.createElement("canvas");
    renderAlbumPage(target, page, book.size, fonts)
      .then(() => {
        if (stamp !== paintEpoch.current || !canvas.current) return;
        canvas.current.width = target.width;
        canvas.current.height = target.height;
        canvas.current.getContext("2d").drawImage(target, 0, 0);
        setPainted(true);
        setError("");
      })
      .catch((e) => {
        if (stamp === paintEpoch.current) setError(e.message);
      });
  }, [page, book, fonts, paintRetry]);
  useEffect(() => {
    const warn = (e) => {
      if (dirty.length) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty.length]);
  function replace(next, remember = true) {
    if (!canEdit || saveLock.current) return;
    if (remember)
      setHistory((h) => ({
        past: [...h.past.slice(-29), clone(pageRef.current)],
        future: [],
      }));
    setPages((old) => ({ ...old, [next.order_page_id]: next }));
    setDirty((old) =>
      fingerprint(next) ===
      fingerprint(baseline.current.get(next.order_page_id))
        ? old.filter((pid) => pid !== next.order_page_id)
        : [...new Set([...old, next.order_page_id])],
    );
  }
  function updateLayer(patch) {
    replace({
      ...page,
      layers: page.layers.map((l) =>
        l.order_layer_id === selected ? { ...l, ...patch } : l,
      ),
    });
  }
  function undo(forward = false) {
    const source = forward ? history.future : history.past;
    if (!source.length) return;
    const next = source.at(-1);
    setHistory((h) =>
      forward
        ? { past: [...h.past, clone(page)], future: h.future.slice(0, -1) }
        : { past: h.past.slice(0, -1), future: [...h.future, clone(page)] },
    );
    replace(next, false);
  }
  async function choosePhoto(photo) {
    if (!layer) return;
    setBusy("读取照片中…");
    try {
      const image = await loadAlbumImage(photo.url);
      const ratio = Math.max(
        layer.style_width / image.width,
        layer.style_height / image.height,
      );
      updateLayer({
        photo_url: photo.url,
        photo_id: photo.id || "",
        style_image: {
          angle: 0,
          offX: 0,
          offY: 0,
          width: image.width * ratio,
          height: image.height * ratio,
        },
      });
      setPanel("");
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy("");
    }
  }
  function addText() {
    if (!canEdit) return;
    const key = `new${Date.now()}${Math.floor(Math.random() * 1000)}`;
    replace({
      ...page,
      layers: [
        ...page.layers,
        {
          order_layer_id: key,
          layer_id: "content",
          layer_from: "user",
          layer_type: "text",
          layer_text: "请输入文字",
          style_left: book.size.preview_width / 2 - 150,
          style_top: book.size.preview_height / 2 - 30,
          style_width: 300,
          style_height: 120,
          style_angle: 0,
          style_scale: 1,
          sort: Math.max(0, ...page.layers.map((l) => l.sort || 0)) + 1,
          style_font: {
            fontFamily:
              fonts.find((f) => f.default_font)?.font_name ||
              fonts[0]?.font_name,
            fontSize: "30",
            color: "#000000",
            lineHeight: 1.16,
            textAlign: "left",
          },
          style_image: null,
        },
      ],
    });
    setSelected(key);
    setPanel("text");
  }
  function photoTool() {
    const shapes = page.layers.filter(
      (l) => l.layer_type === "shape" && editableLayer(l),
    );
    if (!shapes.length) {
      toast("当前页没有照片框");
      return;
    }
    if (layer?.layer_type !== "shape") setSelected(shapes[0].order_layer_id);
    setPanel("photos");
  }
  function fontPatch(patch) {
    updateLayer({ style_font: { ...layer.style_font, ...patch } });
  }
  function cropPatch(patch) {
    updateLayer({ style_image: { ...layer.style_image, ...patch } });
  }
  function startDrag(e, l) {
    if (!canEdit || busy || preview) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(l.order_layer_id);
    setPanel(textLayer(l) ? "text" : "");
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      layer: l,
      before: clone(page),
    };
  }
  function moveDrag(e) {
    const start = drag.current;
    if (!start || !canEdit || busy) return;
    const factor =
      book.size.preview_width / canvas.current.getBoundingClientRect().width;
    const dx = (e.clientX - start.x) * factor,
      dy = (e.clientY - start.y) * factor;
    if (Math.abs(dx) + Math.abs(dy) < 3) return;
    if (!start.moved) {
      setHistory((h) => ({
        past: [...h.past.slice(-29), start.before],
        future: [],
      }));
      start.moved = true;
    }
    replace(
      {
        ...pageRef.current,
        layers: pageRef.current.layers.map((l) =>
          l.order_layer_id === start.layer.order_layer_id
            ? {
                ...l,
                style_left: start.layer.style_left + dx,
                style_top: start.layer.style_top + dy,
              }
            : l,
        ),
      },
      false,
    );
  }
  async function save(exit = false) {
    if (saveLock.current) return;
    if (!dirty.length) {
      if (exit) onBack();
      else toast("没有需要保存的修改");
      return;
    }
    saveLock.current = true;
    setBusy("检查页面状态…");
    setError("");
    try {
      const currentBook = await api.bookInfo(id);
      if (currentBook.enum_status === 200)
        throw new Error("档案已进入查看状态，请重新打开档案。");
      const changed = dirty.map((pid) => clone(pages[pid]));
      for (const p of changed) {
        const current = await api.bookPage(p.order_page_id);
        if (
          !current._parent ||
          fingerprint(current) !==
            fingerprint(baseline.current.get(p.order_page_id))
        )
          throw new Error(
            "页面已在其他设备修改，或编辑权限已变化。请保留当前内容，重新打开档案核对后再保存。",
          );
      }
      for (const p of changed) {
        for (const l of p.layers) {
          if (l.photo_url?.startsWith("blob:")) {
            setBusy("上传照片…");
            const file = localFiles.current.get(l.photo_url);
            if (!file) throw new Error("本地照片已失效，请重新选择");
            const uploaded = await uploadFile(file);
            l.photo_url = uploaded.fileUrl;
          }
        }
        setBusy("生成并上传页面缩略图…");
        const rendered = document.createElement("canvas");
        await renderAlbumPage(rendered, p, book.size, fonts);
        const thumb = await uploadFile(await pagePng(rendered));
        p.thumb_url = thumb.fileUrl;
        p.hasData = true;
        p.version = p.version ?? 0;
      }
      setBusy("保存数据中…");
      await api.saveBookPages(changed);
      // Read the official record back; an HTTP success alone is not a completed save.
      const saved = await Promise.all(
        changed.map((p) => api.bookPage(p.order_page_id)),
      );
      for (let i = 0; i < saved.length; i++) {
        const expected = changed[i],
          actual = saved[i];
        if (
          actual.thumb_url !== expected.thumb_url ||
          actual.layers?.length !== expected.layers.length ||
          expected.layers.some((l) => {
            const other = actual.layers?.find(
              (x) =>
                x.order_layer_id === l.order_layer_id ||
                (l.order_layer_id.startsWith("new") &&
                  x.sort === l.sort &&
                  x.layer_type === l.layer_type),
            );
            return (
              !other ||
              [
                "layer_text",
                "photo_url",
                "style_left",
                "style_top",
                "style_width",
                "style_height",
                "style_scale",
                "style_angle",
              ].some((k) => (other[k] ?? null) !== (l[k] ?? null)) ||
              canonical(other.style_font) !== canonical(l.style_font) ||
              canonical(other.style_image) !== canonical(l.style_image)
            );
          })
        )
          throw new Error(
            "保存后的页面与当前内容不一致，请重试并核对 App 中的档案。",
          );
      }
      if (!alive.current) return;
      setPages((old) => ({
        ...old,
        ...Object.fromEntries(saved.map((p) => [p.order_page_id, p])),
      }));
      saved.forEach((p) => baseline.current.set(p.order_page_id, clone(p)));
      setDirty([]);
      setHistory({ past: [], future: [] });
      toast("保存成功");
      if (exit) onBack();
    } catch (e) {
      if (alive.current) {
        setError(e.message);
        toast(e.message);
      }
    } finally {
      saveLock.current = false;
      if (alive.current) setBusy("");
    }
  }
  function back() {
    if (busy) return;
    if (dirty.length) setPanel("leave");
    else onBack();
  }
  return (
    <div className="archive-editor">
      <Header
        title={title || "成长档案"}
        onBack={back}
        action={
          <button
            className="archive-save"
            disabled={!!busy || state.loading}
            onClick={() => save(true)}
          >
            保存{dirty.length ? ` (${dirty.length})` : ""}
          </button>
        }
      />
      {(state.loading || state.error) && <State {...state} />}
      {book && (
        <>
          <div className="archive-topline">
            <button
              onClick={() => {
                setShowAll(!showAll);
                setIndex(0);
              }}
              disabled={!!busy}
            >
              {showAll ? "全部页面" : "家长制作"} ▾
            </button>
            <span>
              {index + 1} / {list.length}
            </span>
            <button
              onClick={() => setPanel(panel === "pages" ? "" : "pages")}
              disabled={!!busy}
            >
              <List size={18} />
              目录
            </button>
          </div>
          {(loading || !painted) && !error && (
            <p className="archive-hint" role="status">
              加载页面素材中…
            </p>
          )}
          {error && (
            <div className="archive-error" role="alert">
              {error}
              <button
                onClick={() => {
                  if (page) {
                    setError("");
                    setPaintRetry((v) => v + 1);
                  } else state.reload();
                }}
              >
                重试加载
              </button>
            </div>
          )}
          {page && (
            <>
              <div className="archive-stage" aria-busy={!painted || !!busy}>
                <div
                  className="archive-paper"
                  style={{
                    aspectRatio: `${book.size.preview_width}/${book.size.preview_height}`,
                  }}
                >
                  <canvas
                    ref={canvas}
                    key={page.order_page_id}
                    aria-label={page.page_title || "档案页面"}
                  />
                  {!preview &&
                    [...(page.layers || [])]
                      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
                      .filter(editableLayer)
                      .map((l) => {
                        const b = layerBounds(l);
                        return (
                          <button
                            key={l.order_layer_id}
                            aria-label={`${textLayer(l) ? "编辑文字" : l.layer_type === "shape" ? "编辑照片" : "编辑贴纸"}：${textLayer(l) ? l.layer_text || "空白" : l.layer_name || ""}`}
                            className={`archive-layer ${selected === l.order_layer_id ? "selected" : ""} ${l.layer_type === "shape" && !l.photo_url ? "empty" : ""}`}
                            disabled={!canEdit || !!busy}
                            onClick={() => {
                              setSelected(l.order_layer_id);
                              setPanel(textLayer(l) ? "text" : "");
                            }}
                            style={{
                              left: `${(b.x / book.size.preview_width) * 100}%`,
                              top: `${(b.y / book.size.preview_height) * 100}%`,
                              width: `${(b.width / book.size.preview_width) * 100}%`,
                              height: `${(b.height / book.size.preview_height) * 100}%`,
                              transform: `rotate(${b.angle}rad) scale(${b.scale})`,
                            }}
                            onPointerDown={(e) => startDrag(e, l)}
                            onPointerMove={moveDrag}
                            onPointerUp={() => {
                              drag.current = null;
                            }}
                            onPointerCancel={() => {
                              drag.current = null;
                            }}
                            onDoubleClick={() => {
                              setSelected(l.order_layer_id);
                              setPanel(
                                l.layer_type === "shape"
                                  ? "photos"
                                  : textLayer(l)
                                    ? "text"
                                    : "",
                              );
                            }}
                          />
                        );
                      })}
                </div>
              </div>
              <p className="archive-hint">
                {!canEdit
                  ? "此页为查看状态"
                  : preview
                    ? "预览中"
                    : selected
                      ? "点击下方工具编辑，拖动可调整位置"
                      : "点击照片或文字进行编辑"}
              </p>
              <div className="archive-paging">
                <button
                  disabled={index === 0 || !!busy}
                  onClick={() => setIndex((i) => i - 1)}
                >
                  上一页
                </button>
                <span>{page.page_title || `第 ${index + 1} 页`}</span>
                <button
                  disabled={index >= list.length - 1 || !!busy}
                  onClick={() => setIndex((i) => i + 1)}
                >
                  下一页
                </button>
              </div>
              <div className="archive-toolbar">
                <button disabled={!canEdit || !!busy} onClick={photoTool}>
                  <ImagePlus />
                  照片
                </button>
                <button disabled={!canEdit || !!busy} onClick={addText}>
                  <Type />
                  文字
                </button>
                <button
                  disabled={!history.past.length || !!busy}
                  onClick={() => undo()}
                >
                  <Undo2 />
                  撤销
                </button>
                <button
                  disabled={!history.future.length || !!busy}
                  onClick={() => undo(true)}
                >
                  <Redo2 />
                  重做
                </button>
                <button
                  onClick={() => {
                    setPreview((v) => !v);
                    setPanel("");
                  }}
                >
                  <Eye />
                  {preview ? "编辑" : "预览"}
                </button>
              </div>
              {canEdit &&
                layer &&
                !preview &&
                panel !== "photos" &&
                panel !== "pages" &&
                panel !== "leave" && (
                  <div className="archive-controls">
                    {textLayer(layer) ? (
                      <>
                        <label>
                          文字内容
                          <textarea
                            aria-label="文字内容"
                            value={layer.layer_text || ""}
                            onChange={(e) =>
                              updateLayer({ layer_text: e.target.value })
                            }
                            disabled={!!busy}
                          />
                        </label>
                        <div className="archive-fields">
                          <label>
                            字体
                            <select
                              aria-label="文字字体"
                              value={layer.style_font?.fontFamily || ""}
                              onChange={(e) =>
                                fontPatch({ fontFamily: e.target.value })
                              }
                            >
                              {fonts.map((f) => (
                                <option key={f.font_id} value={f.font_name}>
                                  {f.font_nick || f.font_name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            字号
                            <input
                              aria-label="文字字号"
                              type="number"
                              min="8"
                              max="200"
                              value={
                                parseFloat(layer.style_font?.fontSize) || 24
                              }
                              onChange={(e) =>
                                fontPatch({
                                  fontSize: String(
                                    Math.max(
                                      8,
                                      Math.min(200, Number(e.target.value)),
                                    ),
                                  ),
                                })
                              }
                            />
                          </label>
                          <label>
                            颜色
                            <input
                              aria-label="文字颜色"
                              type="color"
                              value={(layer.style_font?.color || "#000000")
                                .slice(-6)
                                .padStart(7, "#")}
                              onChange={(e) =>
                                fontPatch({ color: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            对齐
                            <select
                              aria-label="文字对齐"
                              value={layer.style_font?.textAlign || "left"}
                              onChange={(e) =>
                                fontPatch({ textAlign: e.target.value })
                              }
                            >
                              <option value="left">左对齐</option>
                              <option value="center">居中</option>
                              <option value="right">右对齐</option>
                            </select>
                          </label>
                        </div>
                      </>
                    ) : layer.layer_type === "shape" ? (
                      <>
                        <button
                          onClick={() => setPanel("photos")}
                          disabled={!!busy}
                        >
                          更换照片
                        </button>
                        {layer.photo_url && (
                          <>
                            <button
                              onClick={() =>
                                cropPatch({
                                  angle:
                                    (Number(layer.style_image?.angle) || 0) +
                                    Math.PI / 2,
                                })
                              }
                            >
                              <RotateCw size={17} />
                              旋转照片
                            </button>
                            <label>
                              缩放
                              <input
                                aria-label="照片缩放"
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.01"
                                value={
                                  (Number(layer.style_image?.width) ||
                                    layer.style_width) / layer.style_width
                                }
                                onChange={(e) => {
                                  const ratio =
                                    (Number(e.target.value) *
                                      layer.style_width) /
                                    (Number(layer.style_image?.width) ||
                                      layer.style_width);
                                  cropPatch({
                                    width:
                                      (Number(layer.style_image?.width) ||
                                        layer.style_width) * ratio,
                                    height:
                                      (Number(layer.style_image?.height) ||
                                        layer.style_height) * ratio,
                                  });
                                }}
                              />
                            </label>
                            {["offX", "offY"].map((key, i) => (
                              <label key={key}>
                                {i ? "上下位置" : "左右位置"}
                                <input
                                  aria-label={
                                    i ? "照片上下位置" : "照片左右位置"
                                  }
                                  type="range"
                                  min={
                                    -(i
                                      ? layer.style_height
                                      : layer.style_width)
                                  }
                                  max={
                                    i ? layer.style_height : layer.style_width
                                  }
                                  value={layer.style_image?.[key] || 0}
                                  onChange={(e) =>
                                    cropPatch({ [key]: Number(e.target.value) })
                                  }
                                />
                              </label>
                            ))}
                          </>
                        )}
                      </>
                    ) : null}
                    <button
                      className="archive-delete"
                      onClick={() => {
                        replace({
                          ...page,
                          layers: page.layers.filter(
                            (l) => l.order_layer_id !== selected,
                          ),
                        });
                        setSelected(null);
                      }}
                      disabled={!!busy}
                    >
                      <Trash2 size={16} />
                      删除选中元素
                    </button>
                  </div>
                )}
            </>
          )}
          {panel === "pages" && (
            <div className="archive-page-list">
              {list.map((p, i) => (
                <button
                  key={p.order_page_id}
                  className={i === index ? "active" : ""}
                  onClick={() => {
                    setIndex(i);
                    setPanel("");
                  }}
                >
                  <img
                    loading="lazy"
                    src={previewUrl(
                      pages[p.order_page_id]?.thumb_url || p.thumb_url,
                      180,
                    )}
                    alt=""
                  />
                  <span>
                    {i + 1} · {p.page_title || "档案页"}
                    {dirty.includes(p.order_page_id) ? " · 未保存" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
          {panel === "photos" && canEdit && (
            <ArchivePhotos
              child={child}
              photos={state.data.photos || []}
              onChoose={choosePhoto}
              onClose={() => setPanel("")}
              onLocal={async (file) => {
                const url = URL.createObjectURL(file);
                localFiles.current.set(url, file);
                await choosePhoto({ url });
              }}
            />
          )}
          {panel === "leave" && (
            <div
              className="archive-leave"
              role="dialog"
              aria-modal="true"
              aria-label="保存档案"
            >
              <p>档案有未保存的修改</p>
              <button disabled={!!busy} onClick={() => save(true)}>
                保存并返回
              </button>
              <button onClick={() => setPanel("")}>继续制作</button>
              <button onClick={onBack}>放弃修改并返回</button>
            </div>
          )}
          {!!busy && (
            <div className="archive-busy" role="status">
              {busy}
            </div>
          )}
        </>
      )}
    </div>
  );
}
