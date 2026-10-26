import { useEffect, useState } from "react";
import { Header } from "../ui.jsx";
import { uploadFile } from "../upload.js";
import * as api from "../api.js";
const kinds = [
  ["photo", "照片视频"],
  ["diary", "日记"],
  ["voice", "童言童语"],
  ["note", "大事记"],
];
function formatDate(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
export default function Publish({ child, onBack, toast, navigate }) {
  const [kind, setKind] = useState("photo"),
    [text, setText] = useState(""),
    [files, setFiles] = useState([]),
    [visibility, setVisibility] = useState("1"),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [error, setError] = useState("");
  const [previews, setPreviews] = useState([]);
  useEffect(() => {
    const items = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type,
      name: file.name,
    }));
    setPreviews(items);
    return () => items.forEach((p) => URL.revokeObjectURL(p.url));
  }, [files]);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(`正在上传 ${i + 1}/${files.length}`);
        uploaded.push(
          await uploadFile(files[i], (percent) =>
            setProgress(`正在上传 ${i + 1}/${files.length} · ${percent}%`),
          ),
        );
      }
      setProgress("发布中…");
      const receive = { type: visibility };
      const shared = {
        studId: child.id,
        schoolId: child.schoolId,
        content: text.trim(),
        files: uploaded,
        receive,
      };
      if (kind === "photo")
        await api.publish("photo", {
          studId: child.id,
          schoolId: child.schoolId,
          studName: child.studName,
          photoInfo: [
            {
              content: text.trim(),
              eventTime: formatDate(files[0]?.lastModified || Date.now()),
              files: uploaded,
            },
          ],
          receive,
        });
      else
        await api.publish(kind, {
          ...shared,
          ...(kind === "note" ? { codeNode: "", nodeTag: "" } : {}),
        });
      toast("发布成功");
      navigate("timeline");
    } catch (e) {
      setError(e.message || "发布失败，请重试");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  return (
    <>
      <Header title="发布" onBack={onBack} />
      <form className="edit-form publish-form" onSubmit={submit}>
        <label>
          记录类型
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setFiles([]);
            }}
            disabled={busy}
          >
            {kinds.map(([key, name]) => (
              <option value={key} key={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <textarea
          aria-label="动态内容"
          placeholder="记录宝宝的成长点滴…"
          value={text}
          maxLength={5000}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
        <div className="upload-grid">
          {previews.map((p, index) => (
            <div key={p.url}>
              {p.type.startsWith("image/") ? (
                <img src={p.url} alt={p.name} />
              ) : (
                <span>{p.name}</span>
              )}
              <button
                type="button"
                aria-label={`移除文件 ${index + 1}`}
                onClick={() =>
                  setFiles((old) => old.filter((_, i) => i !== index))
                }
                disabled={busy}
              >
                ×
              </button>
            </div>
          ))}
          <label className="upload-pick">
            ＋
            <input
              aria-label="添加照片视频或音频"
              type="file"
              accept={kind === "voice" ? "audio/*" : "image/*,video/*"}
              multiple={kind !== "voice"}
              disabled={busy}
              onChange={(e) => {
                setFiles((old) =>
                  [...old, ...Array.from(e.target.files)].slice(0, 30),
                );
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <label>
          谁可以看
          <select
            aria-label="谁可以看"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            disabled={busy}
          >
            <option value="1">全部可见（班级和亲属）</option>
            <option value="2">仅自己家人和老师可见</option>
            <option value="3">仅自己可见</option>
          </select>
        </label>
        <p className="error" role="alert">
          {error}
        </p>
        <p className="muted" role="status">
          {progress}
        </p>
        <button
          className="primary"
          disabled={
            busy ||
            (!text.trim() && !files.length) ||
            (kind === "photo" && !files.length) ||
            (kind === "voice" && !files.length)
          }
        >
          {busy ? "发布中…" : "发布"}
        </button>
      </form>
    </>
  );
}
