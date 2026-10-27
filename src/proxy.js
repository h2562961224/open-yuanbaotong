export function proxyUrl(path) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) throw new Error("云服务尚未配置，请稍后重试");
  return `${base.replace(/\/$/, "")}/functions/v1/yuanbaotong-proxy${path}`;
}
