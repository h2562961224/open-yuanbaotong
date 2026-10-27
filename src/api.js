import { proxyUrl } from "./proxy.js";
const storageKey = "open-yuanbaotong.session";
let token =
  localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey) || "";
if (token) localStorage.setItem(storageKey, token);
sessionStorage.removeItem(storageKey);
export function hasSession() {
  return !!token;
}
export function clearSession() {
  token = "";
  localStorage.removeItem(storageKey);
  sessionStorage.removeItem(storageKey);
}
export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
export async function request(
  service,
  path,
  params = {},
  authenticated = true,
  method = "GET",
) {
  const url = new URL(proxyUrl(`/api/${service}${path}`));
  for (const [key, value] of Object.entries(params))
    if (method === "GET" && value != null)
      url.searchParams.set(key, String(value));
  const headers = {
    "app-id": "YbtFamilyApp",
    "app-version": "2.8.5",
    "ram-version": "10000",
  };
  if (method !== "GET") headers["Content-Type"] = "application/json";
  if (authenticated && token) headers.token = token;
  let response;
  try {
    response = await fetch(url, {
      method,
      body: method === "GET" ? undefined : JSON.stringify(params),
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    throw new ApiError(
      error.name === "TimeoutError"
        ? "请求超时，请稍后重试"
        : "网络连接失败，请稍后重试",
    );
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(`服务暂不可用（${response.status}），请稍后重试`);
  }
  if (response.status === 401 || body.code === 401 || body.code === 403) {
    if (authenticated) {
      clearSession();
      window.dispatchEvent(new Event("session-expired"));
    }
    throw new ApiError("登录已过期，请重新登录", body.code);
  }
  if (!response.ok || body.success !== true)
    throw new ApiError(
      body.message || `请求失败（${response.status}）`,
      body.code,
    );
  return body.content;
}
export const sendCode = (mobile) =>
  request("account", "/api/client/auth/sendVcode", { mobile, type: 1 }, false);
export async function login(mobile, code) {
  const data = await request(
    "account",
    "/api/client/auth/getTokenByVcode",
    { mobile, code },
    false,
  );
  const value =
    typeof data === "string" ? data : data?.token || data?.accessToken;
  if (!value || typeof value !== "string")
    throw new ApiError("登录接口未返回有效登录凭据，请重试");
  token = value;
  localStorage.setItem(storageKey, token);
}
export const userInfo = () => request("account", "/api/client/user/info");
export const bookPage = (id) =>
  request("album", `/api/client/app/order/page/info/${encodeURIComponent(id)}`);
export const albumFonts = () => request("album", "/api/client/app/asset/font");
export const saveBookPages = (pages) =>
  request("album", "/api/client/app/order/page/saveBatch", pages, true, "POST");
export const familyBabies = () =>
  request("account", "/api/client/ram/familyBaby");
export const menus = (child) =>
  request("account", "/api/client/ram/appFamilyMenu", {
    studId: child.id,
    group: "家长端-家园",
    version: 921,
  });
export const banners = (child) =>
  request("share", "/api/client/banner/list", {
    schoolId: child.schoolId,
    group: "家长端-家园",
    version: 921,
  });
export function timeline(
  circle,
  child,
  maxId = "",
  group = "all",
  filters = {},
) {
  const family = circle === "family";
  return request(
    "timeline",
    family
      ? "/api/client/home/timeline/page"
      : "/api/client/class/timeline/parent/page",
    {
      studId: child.id,
      ...(family
        ? { num: 20 }
        : { schoolId: child.schoolId, group: group === "all" ? "" : group }),
      maxId,
      ...filters,
    },
  );
}
export const detail = (circle, child, id) =>
  request(
    "timeline",
    `/api/client/class/timeline/detail/${encodeURIComponent(id)}/${circle === "family" ? "home" : "class"}`,
    { studId: child.id },
  );
export const notices = (child, maxId = "") =>
  request("timeline", "/api/client/class/timeline/notice", {
    schoolId: child.schoolId,
    studId: child.id,
    maxId,
  });
export const todos = (child, maxId = "") =>
  request("member", "/api/client/userTodo/family/list", {
    studId: child.id,
    maxId,
    num: 20,
    version: 921,
  });
export const food = (child, type = "today", maxId = "", stDate = "") =>
  request(
    "timeline",
    "/api/client/school/food/list",
    { schoolId: child.schoolId, type, maxId, stDate },
    true,
    "POST",
  );
export const messages = (maxId = "") =>
  request("member", "/api/client/userMsg/list", {
    maxId,
    num: 20,
    version: 921,
  });
export const messageCount = () =>
  request("member", "/api/client/userMsg/count", { version: 921 });
export const kinships = (child) =>
  request("member", "/api/client/userStud/kinship", { studId: child.id });
export const addresses = () => request("member", "/api/client/user/myAddrs");
export const schoolInfo = (child) =>
  request("member", "/api/client/school/info", { schoolId: child.schoolId });
export const tasks = (child, type, maxId = "") =>
  request(
    "timeline",
    `/api/client/home/task/${type === "gallery" ? "temp/list" : `list/task/${type}`}`,
    { studId: child.id, maxId, num: 20 },
  );
export const taskDetail = (id, template = false) =>
  request(
    "timeline",
    `/api/client/${template ? "home/task/temp/detail" : "class/task/detail"}/${encodeURIComponent(id)}`,
  );
export const albumIndex = (child) =>
  request("cloud", "/api/client/album/index", { studId: child.id });
export const albumPhotos = (child, maxId = "", fileType = "image") =>
  request("cloud", "/api/client/album/list", {
    studId: child.id,
    maxId,
    num: 40,
    fileType,
  });
export const growthFiles = (child) =>
  request("album", "/api/client/app/order/book/list/stud", {
    school_id: child.schoolId,
    stud_no: child.id,
  });
export const orders = (child, status = "") =>
  request("album", "/api/client/app/order/list/order", {
    stud_id: child.id,
    order_status: status,
  });
export const helpers = () =>
  request("album", "/api/client/app/helper/helper/list", {
    role: "parent",
    modular: "mine",
  });
export const feedback = (opinions) =>
  request("member", "/api/client/user/myOpinion", { opinions }, true, "POST");
export const updateUser = (params) =>
  request("member", "/api/client/user/edit", { params }, true, "POST");
export const updateBaby = (child, params) =>
  request(
    "member",
    "/api/client/userStud/edit",
    { studId: child.id, params },
    true,
    "POST",
  );
export const saveAddress = (data, edit = false) =>
  request(
    "member",
    `/api/client/userAddr/${edit ? "edit" : "create"}`,
    data,
    true,
    "POST",
  );
export const reactTo = (circle, child, id, emoji) =>
  request(
    "timeline",
    `/api/client/${circle === "family" ? "home" : "class"}/timeline/emoji/mark`,
    { timelineId: id, studId: child.id, emoji, userJob: child.kinship },
    true,
    "POST",
  );
export const reply = (circle, child, id, content) =>
  request(
    "timeline",
    `/api/client/${circle === "family" ? "home" : "class"}/timeline/reply/create`,
    {
      timelineId: id,
      studId: child.id,
      content,
      replyUserJob: child.kinship,
      toReplyId: "",
      toUserJob: "",
    },
    true,
    "POST",
  );
export const bookImages = (id) =>
  request(
    "album",
    `/api/client/app/order/book/image/${encodeURIComponent(id)}`,
  );
export const bookInfo = (id) =>
  request(
    "album",
    `/api/client/app/order/book/info/${encodeURIComponent(id)}/0`,
  );
export const attendance = (child, maxCheckNo = "") =>
  request("checkin", "/api/client/guard/stud/list", {
    studId: child.id,
    maxCheckNo,
  });
export const classroom = (child) =>
  request("checkin", "/api/client/monitor/list/studKes", {
    studId: child.id,
    schoolId: child.schoolId,
  });

export const publish = (kind, data) =>
  request("timeline", `/api/client/home/${kind}/create`, data, true, "POST");
export const noticeCount = (child) =>
  request("timeline", "/api/client/class/timeline/notice/unReadCount", {
    schoolId: child.schoolId,
    studId: child.id,
  });
export const zones = () =>
  request("member", "/api/client/common/code/zoneTree");
export const addBaby = (data) =>
  request("member", "/api/client/userStud/create", data, true, "POST");
export const associateParent = (child, mobile, kinship) =>
  request(
    "member",
    "/api/client/user/myHalf",
    { studId: child.id, mobile, kinship },
    true,
    "POST",
  );
