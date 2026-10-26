import { useState } from "react";
import * as api from "../api.js";
import { usePaged } from "../hooks.js";
import { More, Tabs } from "../ui.jsx";
import { previewUrl } from "../media.js";

function BabyPhotos({ child, onChoose }) {
  const state = usePaged(
    async (cursor) => {
      const groups = await api.albumPhotos(child, cursor, "image");
      return groups.flatMap((group) =>
        (group.files || []).map((file) => ({
          ...file,
          url: file.file,
          date: group.dateTime,
        })),
      );
    },
    [child.id],
  );
  return (
    <>
      <div className="archive-photo-grid">
        {state.rows.map((photo) => (
          <button key={photo.id} onClick={() => onChoose(photo)}>
            <img
              loading="lazy"
              src={previewUrl(photo.url, 250)}
              alt="选择这张照片"
            />
          </button>
        ))}
      </div>
      <More state={state} />
    </>
  );
}
export default function ArchivePhotos({
  child,
  photos,
  onChoose,
  onLocal,
  onClose,
}) {
  const [tab, setTab] = useState("book");
  return (
    <section className="archive-photo-picker">
      <div className="archive-panel-head">
        <h2>选择照片</h2>
        <button onClick={onClose}>完成</button>
      </div>
      <Tabs
        items={[
          ["book", "档案照片"],
          ["baby", "宝贝相册"],
        ]}
        value={tab}
        onChange={setTab}
        label="照片来源"
      />
      <label className="archive-local">
        从本地选择照片
        <input
          aria-label="从本地选择照片"
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await onLocal(file);
            e.target.value = "";
          }}
        />
      </label>
      {tab === "baby" ? (
        <BabyPhotos child={child} onChoose={onChoose} />
      ) : (
        <div className="archive-photo-grid">
          {photos
            .filter(
              (p, i, all) =>
                p.photoUrl &&
                !/\.(mp4|mov|m4v|webm|avi|3gp)(\?|$)/i.test(p.photoUrl) &&
                all.findIndex((x) => x.photoUrl === p.photoUrl) === i,
            )
            .map((p) => (
              <button
                key={p.photoId || p.photoUrl}
                onClick={() => onChoose({ url: p.photoUrl, id: p.photoId })}
              >
                <img
                  loading="lazy"
                  src={previewUrl(p.photoUrl, 250)}
                  alt="选择这张照片"
                />
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
