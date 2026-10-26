import { useState } from "react";
import * as api from "../api.js";
import { usePaged, useRemote } from "../hooks.js";
import { Avatar, Header, More, Row, State } from "../ui.jsx";
import { safeUrl } from "../media.js";
export function Babies({ children, child, onChild, navigate, onBack }) {
  return (
    <>
      <Header
        title="宝宝管理"
        onBack={onBack}
        action={
          <button className="text-button" onClick={() => navigate("add-baby")}>
            添加
          </button>
        }
      />
      {children.map((b) => (
        <div className="baby-card" key={b.id}>
          <Avatar large url={b.avatar} />
          <div>
            <button onClick={() => navigate("baby", { id: b.id })}>
              <h2>{b.name} ›</h2>
            </button>
            <p>{b.schoolName}</p>
            <p>{b.className}</p>
          </div>
          <button
            className="text-button"
            disabled={b.id === child.id}
            onClick={() => onChild(b.id)}
          >
            {b.id === child.id ? "当前宝宝" : "切换"}
          </button>
        </div>
      ))}
    </>
  );
}
export function Baby({ baby, onBack, toast, onUpdated }) {
  const [name, setName] = useState(baby.studName || ""),
    [nick, setNick] = useState(baby.studNick || ""),
    [birth, setBirth] = useState((baby.birthDate || "").slice(0, 10)),
    [sex, setSex] = useState(baby.enumSex || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.updateBaby(baby, {
        name,
        nick,
        enumSex: sex,
        birthDate: birth,
        avatarUrl: baby.avatar || "",
      });
      toast("保存成功");
      onUpdated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header title="宝宝信息" onBack={onBack} />
      <div className="profile-avatar">
        <Avatar large url={baby.avatar} />
      </div>
      <form className="edit-form" onSubmit={save}>
        <label>
          姓名
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={30}
          />
        </label>
        <label>
          昵称
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={30}
          />
        </label>
        <label>
          性别
          <select value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="">未设置</option>
            <option value="1-男">男</option>
            <option value="2-女">女</option>
          </select>
        </label>
        <label>
          生日
          <input
            type="date"
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
        </label>
        <label>
          我的身份<span>{baby.kinship}</span>
        </label>
        <label>
          园所<span>{baby.schoolName}</span>
        </label>
        <label>
          班级<span>{baby.className}</span>
        </label>
        <p role="alert" className="error">
          {error}
        </p>
        <button className="primary" disabled={busy}>
          {busy ? "保存中…" : "保存"}
        </button>
      </form>
    </>
  );
}
export function Friends({ child, onBack, navigate }) {
  const state = useRemote(() => api.kinships(child), [child.id]);
  return (
    <>
      <Header title="亲友团" onBack={onBack} />
      <Row
        title="关联另一位家长"
        onClick={() => navigate("associate-parent")}
      />
      <div className="section-label">{child.name}的亲友</div>
      <State {...state} empty={!state.data?.length} />
      {state.data?.map((person) => (
        <div className="friend-row" key={person.userId}>
          <Avatar url={person.avatarUrl || person.userAvatarUrl} />
          <div>
            <strong>
              {person.userName || person.userNick || person.kinship}
            </strong>
            <p>
              {person.kinship}
              {person.main ? " · 宝宝管理员" : ""}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}
export function Messages({ navigate, onBack, id }) {
  const state = usePaged((cursor) => api.messages(cursor), []);
  const item = state.rows.find((row) => row.msgId === id);
  return (
    <>
      <Header title={id ? "消息详情" : "我的消息"} onBack={onBack} />
      {id ? (
        item ? (
          <article className="content-paper">
            <h2>{item.title}</h2>
            <small>{item.createTime}</small>
            <p>{item.content}</p>
          </article>
        ) : (
          <State
            {...state}
            error={state.error || (!state.loading ? "未找到该条消息" : "")}
          />
        )
      ) : (
        <>
          {state.rows.map((row) => (
            <Row
              key={row.msgId}
              title={row.title}
              description={row.content}
              onClick={() => navigate("message", { id: row.msgId })}
            />
          ))}
          <More state={state} />
        </>
      )}
    </>
  );
}
export function Settings({ navigate, onBack, onLogout }) {
  return (
    <>
      <Header title="设置" onBack={onBack} />
      <div className="settings-list">
        <Row title="用户信息" onClick={() => navigate("profile")} />
        <Row title="收货地址" onClick={() => navigate("addresses")} />
        <Row title="关于园宝通网页版" onClick={() => navigate("about")} />
        <button className="logout" onClick={onLogout}>
          退出登录
        </button>
      </div>
    </>
  );
}
export function Profile({ profile, onBack, toast, onUpdated }) {
  const [name, setName] = useState(profile.name || ""),
    [nick, setNick] = useState(profile.nick || ""),
    [birth, setBirth] = useState((profile.birthDate || "").slice(0, 10)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.updateUser({ name, nick, birthDate: birth });
      toast("保存成功");
      onUpdated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header title="用户信息" onBack={onBack} />
      <div className="profile-avatar">
        <Avatar large url={profile.avatarUrl} />
      </div>
      <form className="edit-form" onSubmit={save}>
        <label>
          用户名
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={30}
          />
        </label>
        <label>
          昵称
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={30}
          />
        </label>
        <label>
          生日
          <input
            type="date"
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
        </label>
        <label>
          手机号<span>{profile.mobile}</span>
        </label>
        <p className="error" role="alert">
          {error}
        </p>
        <button className="primary" disabled={busy}>
          {busy ? "保存中…" : "保存"}
        </button>
      </form>
    </>
  );
}
export function Addresses({ onBack, navigate }) {
  const state = useRemote(() => api.addresses(), []);
  return (
    <>
      <Header
        title="收货地址"
        onBack={onBack}
        action={
          <button className="text-button" onClick={() => navigate("address")}>
            添加
          </button>
        }
      />
      <State {...state} empty={!state.data?.length} />
      {state.data?.map((row) => (
        <button
          className="address-card"
          key={row.addrNo}
          onClick={() => navigate("address", { id: row.addrNo })}
        >
          <strong>
            {row.conName} {row.conMobile}
          </strong>
          <p>
            {row.descZone} {row.address}
          </p>
          {row.isDefault && <span className="post-tag">默认地址</span>}
          <span>编辑 ›</span>
        </button>
      ))}
    </>
  );
}
export function Feedback({ onBack, toast }) {
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.feedback(text.trim());
      setText("");
      toast("提交成功");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header title="意见反馈" onBack={onBack} />
      <form className="edit-form" onSubmit={submit}>
        <textarea
          aria-label="反馈内容"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="请填写您的意见或建议"
          required
          maxLength={2000}
        />
        <p className="error" role="alert">
          {error}
        </p>
        <button className="primary" disabled={busy || !text.trim()}>
          {busy ? "提交中…" : "提交"}
        </button>
      </form>
    </>
  );
}
export function Help({ onBack, onView }) {
  const state = useRemote(() => api.helpers(), []);
  return (
    <>
      <Header title="帮助中心" onBack={onBack} />
      <State {...state} />
      {state.data?.map((group) => (
        <section key={group.group}>
          <h2 className="section-label">{group.group}</h2>
          {group.helperItemLists.map((item) => (
            <Row
              key={item.title}
              title={item.title}
              onClick={() => {
                if (item.type === "image") onView([{ url: item.content }], 0);
                else if (safeUrl(item.content))
                  window.open(
                    safeUrl(item.content),
                    "_blank",
                    "noopener,noreferrer",
                  );
              }}
            />
          ))}
        </section>
      ))}
    </>
  );
}
export function About({ onBack }) {
  return (
    <>
      <Header title="关于" onBack={onBack} />
      <article className="content-paper">
        <h2>Open Yuanbaotong</h2>
        <p>园宝通家长端的非官方开源网页版。</p>
        <p>React · Tailwind CSS · shadcn/ui</p>
        <a
          href="https://github.com/h2562961224/open-yuanbaotong"
          target="_blank"
          rel="noopener noreferrer"
        >
          查看开源代码 ›
        </a>
      </article>
    </>
  );
}
export function School({ child, onBack }) {
  const state = useRemote(() => api.schoolInfo(child), [child.id]);
  return (
    <>
      <Header title="园所信息" onBack={onBack} />
      <article className="content-paper">
        <h2>{child.schoolName}</h2>
        <p>{child.className}</p>
        <State {...state} />
        {state.data && (
          <>
            <p>{state.data.address || state.data.conAddr}</p>
            <p>
              {state.data.contName} {state.data.contMobil}
            </p>
          </>
        )}
      </article>
    </>
  );
}
