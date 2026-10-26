// Adapters are kept separate because the upstream API is not a public, versioned API.
const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
export function childrenFrom(profile) {
  const result = new Map();
  const visit = (value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 7) return;
    if (Array.isArray(value)) return value.forEach(item => visit(item, depth + 1));
    const id = first(value.studId, value.stud_id);
    const name = first(value.studName, value.stud_name, value.studNick, value.stud_nick);
    if (id && name) {
      const existing = result.get(String(id)) || {};
      result.set(String(id), { ...existing, id, name, avatar: first(value.studAvatarUrl, value.avatarUrl, value.avatar_url, existing.avatar), schoolId: first(value.schoolId, value.school_id, existing.schoolId), classId: first(value.classId, value.class_id, existing.classId), schoolName: first(value.schoolName, value.school_name, existing.schoolName), className: first(value.className, value.class_name, existing.className) });
    }
    Object.values(value).forEach(item => { if (typeof item === 'object') visit(item, depth + 1); });
  };
  visit(profile);
  return [...result.values()];
}
export function pageFrom(data) {
  if (Array.isArray(data)) return { rows: data, more: data.length >= 20 };
  const rows = first(data?.list, data?.records, data?.rows, data?.items, data?.data);
  if (!Array.isArray(rows)) throw new Error('暂时无法识别动态列表，请重试');
  const total = first(data.total, data.totalCount, data.count);
  return { rows, total, more: rows.length >= 20 };
}
export function postFrom(raw) {
  let files = first(raw.timeline_files, raw.timelineFiles, raw.files, raw.fileList, []);
  if (typeof files === 'string') { try { files = JSON.parse(files); } catch { files = []; } }
  if (!Array.isArray(files)) files = [];
  const media = files.map(item => {
    if (typeof item === 'string') return { url: item, video: /\.(mp4|mov)(\?|$)/i.test(item) };
    const url = first(item.fileUrl, item.file_url, item.url, item.path, item.photoUrl);
    return { url, thumb: first(item.thumbUrl, item.thumb_url), video: /\.(mp4|mov)(\?|$)/i.test(url || '') || /video/i.test(String(item.fileType || '')) };
  }).filter(item => item.url);
  return {
    id: first(raw.id, raw.timelineId),
    author: first(raw.userName, raw.nickName, raw.nickname, raw.user_nick, raw.user?.nickName, raw.senderName, ''),
    avatar: first(raw.userAvatarUrl, raw.avatarUrl, raw.avatar_url, raw.user?.avatarUrl),
    text: String(first(raw.timeline_content, raw.timelineContent, raw.content, '')),
    date: String(first(raw.createTime, raw.create_time, raw.publishTime, raw.timelineTime, '')),
    likes: first(raw.likeCount, raw.praiseCount, 0), comments: first(raw.replyCount, raw.commentCount, 0), media
  };
}
