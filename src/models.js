// Field names follow the parent App's decoded response models.
export function childrenFrom(rows) {
  if (!Array.isArray(rows)) throw new Error("宝宝列表返回格式异常");
  return rows
    .map((row) => ({
      ...row,
      id: row.studId,
      name: row.studNick || row.studName,
      avatar: row.avatarUrl,
    }))
    .filter((row) => row.id);
}
export function pageFrom(data) {
  const rows = Array.isArray(data)
    ? data
    : (data?.list ?? data?.records ?? data?.data);
  if (!Array.isArray(rows)) throw new Error("列表返回格式异常，请重试");
  return { rows, more: rows.length > 0 };
}
export function mediaFrom(files) {
  if (typeof files === "string") {
    try {
      files = JSON.parse(files);
    } catch {
      files = [];
    }
  }
  if (!Array.isArray(files)) return [];
  return files
    .map((file) =>
      typeof file === "string"
        ? { url: file }
        : {
            id: file.id,
            url: file.fileUrl || file.url,
            thumb: file.thumbUrl,
            width: file.width,
            height: file.height,
            video:
              /^(mp4|mov|m4v)$/i.test(file.suffix || "") ||
              /\.(mp4|mov|m4v)(\?|$)/i.test(file.fileUrl || file.url || ""),
            audio:
              /^(mp3|m4a|aac|wav)$/i.test(file.suffix || "") ||
              /\.(mp3|m4a|aac|wav)(\?|$)/i.test(file.fileUrl || ""),
          },
    )
    .filter((file) => file.url);
}
export function postFrom(raw) {
  return {
    ...raw,
    id: raw.id || raw.timelineId,
    author:
      raw.userName ||
      [raw.studName, raw.kinship].filter(Boolean).join("") ||
      raw.userNick ||
      "动态",
    avatar: raw.userAvatarUrl || raw.avatarUrl,
    text: raw.content || "",
    date: raw.publicTime || raw.createDate || raw.eventTime || "",
    likes: raw.countPraise || 0,
    comments: raw.countReply || 0,
    media: mediaFrom(raw.fileList || raw.files),
    replies: raw.topReply || [],
    reactions: raw.topEmoji || [],
  };
}
