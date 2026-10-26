import { useState } from "react";
import * as api from "../api.js";
import { usePaged, useRemote } from "../hooks.js";
import { Header, More, State, Post, Tabs, Photo, Row } from "../ui.jsx";
import { mediaFrom, postFrom, pageFrom } from "../models.js";
import { previewUrl, safeUrl } from "../media.js";
export function Food({ child, cookbook, onBack, onView, navigate }) {
  const [month, setMonth] = useState("");
  const state = usePaged(
    (cursor) =>
      api.food(
        child,
        cookbook ? "next" : "today",
        cursor,
        month ? `${month}-01` : "",
      ),
    [child.id, cookbook, month],
  );
  return (
    <>
      <Header title={cookbook ? "下周食谱" : "今日美食"} onBack={onBack} />
      <div className="date-filter">
        <label>
          月份{" "}
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            aria-label="食谱月份"
          />
        </label>
        <button onClick={state.reload}>刷新</button>
      </div>
      {state.rows.map((raw) => (
        <Post
          key={raw.id}
          post={postFrom(raw)}
          onView={onView}
          onDetail={() =>
            navigate("detail", {
              id: raw.timelineId || raw.id,
              circle: "class",
            })
          }
        />
      ))}
      <More state={state} />
    </>
  );
}
export function Tasks({ child, onBack, navigate }) {
  const [type, setType] = useState("incomplete");
  const state = usePaged(
    (cursor) => api.tasks(child, type, cursor),
    [child.id, type],
  );
  return (
    <>
      <Header title="亲子任务" onBack={onBack} />
      <Tabs
        items={[
          ["incomplete", "待完成"],
          ["complete", "已完成"],
          ["gallery", "任务库"],
        ]}
        value={type}
        onChange={setType}
        label="任务分类"
      />
      {state.rows.map((item) => (
        <Row
          key={item.id}
          title={item.title || item.content || "亲子任务"}
          description={item.taskEndTime || item.createDate}
          onClick={() =>
            navigate("task", {
              id: item.classTaskId || item.id,
              template: type === "gallery",
            })
          }
        />
      ))}
      <More state={state} />
    </>
  );
}
export function Task({ child, id, template, onBack, onView }) {
  const state = useRemote(() => api.taskDetail(id, template), [id, template]);
  const item = state.data;
  return (
    <>
      <Header title="亲子任务" onBack={onBack} />
      <State {...state} />
      {item && (
        <>
          <Post post={postFrom(item)} onView={onView} />
          <div className="content-paper">
            {item.goal && (
              <>
                <h2>活动目标</h2>
                <p>{item.goal}</p>
              </>
            )}
            {item.taskEndTime && <p>截止时间：{item.taskEndTime}</p>}
            {item.status && <p>{item.status}</p>}
          </div>
        </>
      )}
    </>
  );
}
export function Album({ child, onBack, onView }) {
  const [type, setType] = useState("image");
  const state = usePaged(
    async (cursor) => {
      const groups = await api.albumPhotos(child, cursor, type);
      return groups.flatMap((group) =>
        (group.files || []).map((file) => ({
          ...file,
          url: file.file,
          date: group.dateTime,
          video: type === "video",
        })),
      );
    },
    [child.id, type],
  );
  return (
    <>
      <Header title="宝贝相册" onBack={onBack} />
      <Tabs
        items={[
          ["image", "照片"],
          ["video", "视频"],
        ]}
        value={type}
        onChange={setType}
        label="相册类型"
      />
      <div className="album-grid">
        {state.rows.map((file, index) => (
          <div key={file.id}>
            <Photo
              media={file}
              number={index + 1}
              onClick={() => onView(state.rows, index)}
            />
            <small>{file.date}</small>
          </div>
        ))}
      </div>
      <More state={state} />
    </>
  );
}
export function Growth({ child, onBack, navigate }) {
  const state = useRemote(() => api.growthFiles(child), [child.id]);
  const rows = state.data ? pageFrom(state.data).rows : [];
  return (
    <>
      <Header title="成长档案" onBack={onBack} />
      <State {...state} empty={!rows.length} />
      <div className="book-list">
        {rows.map((book) => (
          <button
            key={book.order_book_id}
            className="book-card"
            onClick={() =>
              navigate("book", {
                id: book.order_book_id,
                title: book.order_book_name,
              })
            }
          >
            <img src={previewUrl(book.cover_url, 500)} alt="" />
            <div>
              <h2>{book.order_book_name}</h2>
              <p>{book.semester_name}</p>
              <p>{book.class_name}</p>
              <span>去查看 ›</span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
export function Book({ id, title, onBack, onView }) {
  const state = useRemote(() => api.bookInfo(id), [id]);
  const pages = state.data?.pages || [];
  const media = pages.map((page) => ({
    url: page.thumb_url || page.back_preview_url,
  }));
  return (
    <>
      <Header title={title || "成长档案"} onBack={onBack} />
      <State {...state} empty={!pages.length} />
      <div className="book-pages">
        {pages.map((page, index) => (
          <button key={page.order_page_id} onClick={() => onView(media, index)}>
            <img
              src={previewUrl(media[index].url, 1280)}
              alt={page.page_title || `第 ${index + 1} 页`}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </>
  );
}
export function Orders({ child, onBack }) {
  const [status, setStatus] = useState("");
  const state = useRemote(() => api.orders(child, status), [child.id, status]);
  const rows = state.data ? pageFrom(state.data).rows : [];
  return (
    <>
      <Header title="我的订单" onBack={onBack} />
      <Tabs
        value={status}
        onChange={setStatus}
        items={[
          ["", "全部"],
          ["0", "待付款"],
          ["100", "已付款"],
          ["200", "已完成"],
        ]}
        label="订单状态"
      />
      <State {...state} empty={!rows.length} />
      {rows.map((order, index) => (
        <article className="content-paper" key={order.order_no || index}>
          <h2>{order.order_name || order.prod_name || "成长档案"}</h2>
          <p>{order.order_status_desc || order.status_desc}</p>
          <p>{order.create_time}</p>
          <p>订单号：{order.order_no}</p>
          {order.amount != null && <p>¥ {order.amount}</p>}
        </article>
      ))}
    </>
  );
}
