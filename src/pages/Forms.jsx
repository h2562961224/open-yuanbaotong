import { useEffect, useState } from "react";
import * as api from "../api.js";
import { useRemote } from "../hooks.js";
import { Header, State } from "../ui.jsx";
export function Address({ id, onBack, toast, navigate }) {
  const regions = useRemote(() => api.zones(), []);
  const [form, set] = useState({
      conName: "",
      conMobile: "",
      address: "",
      isDefault: false,
    }),
    [codes, setCodes] = useState(["", "", ""]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const existing = useRemote(
    () =>
      id
        ? api.request("member", "/api/client/userAddr/Info", { addrNo: id })
        : null,
    [id],
  );
  useEffect(() => {
    if (!existing.data) return;
    const row = existing.data;
    set(row);
    const roots = regions.data || [];
    for (const p of roots)
      for (const city of p.childs || [])
        for (const district of city.childs || [])
          if (district.code === row.codeZone)
            setCodes([p.code, city.code, district.code]);
  }, [existing.data, regions.data]);
  const levels = [
    regions.data || [],
    (regions.data || []).find((r) => r.code === codes[0])?.childs || [],
    (regions.data || [])
      .find((r) => r.code === codes[0])
      ?.childs?.find((r) => r.code === codes[1])?.childs || [],
  ];
  function change(key, value) {
    set((old) => ({ ...old, [key]: value }));
  }
  async function submit(e) {
    e.preventDefault();
    if (!codes[2] && !codes[1]) {
      setError("请选择所在地区");
      return;
    }
    if (!/^1\d{10}$/.test(form.conMobile)) {
      setError("请输入正确的手机号");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.saveAddress(
        {
          conName: form.conName.trim(),
          conMobile: form.conMobile,
          codeZone: codes[2] || codes[1],
          address: form.address.trim(),
          isDefault: form.isDefault,
          ...(id ? { addrNo: id } : {}),
        },
        !!id,
      );
      toast("保存成功");
      navigate("addresses");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header title={id ? "编辑地址" : "新增地址"} onBack={onBack} />
      <State
        loading={regions.loading || existing.loading}
        error={regions.error || existing.error}
        reload={() => {
          regions.reload();
          existing.reload();
        }}
      />
      <form className="edit-form" onSubmit={submit}>
        <label>
          收货人
          <input
            value={form.conName}
            onChange={(e) => change("conName", e.target.value)}
            required
            maxLength={40}
          />
        </label>
        <label>
          手机号码
          <input
            type="tel"
            value={form.conMobile}
            onChange={(e) => change("conMobile", e.target.value)}
            required
            maxLength={11}
          />
        </label>
        {levels.map((options, index) => (
          <label key={index}>
            {["省份", "城市", "区县"][index]}
            <select
              aria-label={["省份", "城市", "区县"][index]}
              value={codes[index]}
              onChange={(e) =>
                setCodes((old) =>
                  old.map((code, i) =>
                    i === index ? e.target.value : i > index ? "" : code,
                  ),
                )
              }
            >
              <option value="">请选择</option>
              {options.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.desc}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          详细地址
          <input
            value={form.address}
            onChange={(e) => change("address", e.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label>
          设为默认地址
          <input
            type="checkbox"
            checked={!!form.isDefault}
            onChange={(e) => change("isDefault", e.target.checked)}
          />
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
export function AddBaby({ onBack, toast, onUpdated, navigate }) {
  const [form, set] = useState({
      name: "",
      nick: "",
      birthDate: "",
      enumSex: "",
      kinship: "爸爸",
      avatarUrl: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function change(k, v) {
    set((old) => ({ ...old, [k]: v }));
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.addBaby(form);
      toast("添加成功");
      onUpdated();
      navigate("babies");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header title="添加宝宝" onBack={onBack} />
      <form className="edit-form" onSubmit={submit}>
        <label>
          姓名
          <input
            value={form.name}
            onChange={(e) => change("name", e.target.value)}
            required
            maxLength={30}
          />
        </label>
        <label>
          昵称
          <input
            value={form.nick}
            onChange={(e) => change("nick", e.target.value)}
            required
            maxLength={30}
          />
        </label>
        <label>
          性别
          <select
            value={form.enumSex}
            onChange={(e) => change("enumSex", e.target.value)}
            required
          >
            <option value="">请选择</option>
            <option value="1-男">男</option>
            <option value="2-女">女</option>
          </select>
        </label>
        <label>
          生日
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => change("birthDate", e.target.value)}
            required
          />
        </label>
        <label>
          我是宝宝的
          <select
            value={form.kinship}
            onChange={(e) => change("kinship", e.target.value)}
          >
            <option>爸爸</option>
            <option>妈妈</option>
          </select>
        </label>
        <p className="error" role="alert">
          {error}
        </p>
        <button className="primary" disabled={busy}>
          {busy ? "添加中…" : "添加"}
        </button>
      </form>
    </>
  );
}
export function AssociateParent({ child, onBack, toast, navigate }) {
  const [mobile, setMobile] = useState(""),
    [kinship, setKinship] = useState(
      child.kinship === "爸爸" ? "妈妈" : "爸爸",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (!/^1\d{10}$/.test(mobile)) {
      setError("请输入正确的手机号");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.associateParent(child, mobile, kinship);
      toast("关联成功");
      navigate("friends");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header title="关联另一位家长" onBack={onBack} />
      <form className="edit-form" onSubmit={submit}>
        <label>
          宝宝<span>{child.name}</span>
        </label>
        <label>
          家长身份
          <select value={kinship} onChange={(e) => setKinship(e.target.value)}>
            <option>妈妈</option>
            <option>爸爸</option>
          </select>
        </label>
        <label>
          手机号
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
            maxLength={11}
          />
        </label>
        <p className="error" role="alert">
          {error}
        </p>
        <button className="primary" disabled={busy}>
          {busy ? "关联中…" : "确认关联"}
        </button>
      </form>
    </>
  );
}
