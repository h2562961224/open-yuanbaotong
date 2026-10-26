import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, MessageCircle, RefreshCw, ThumbsUp, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as api from './api.js';
import { childrenFrom, pageFrom, postFrom } from './models.js';
import { previewUrl, safeUrl } from './media.js';
import Viewer from './Viewer.jsx';

function TimelineIcon() {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="6" y="3" width="20" height="26" rx="8"/><path d="M12 10h8M12 16h5M12 22h8"/></svg>;
}
function Avatar({ url, large = false }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return <span className={large ? 'baby-avatar' : 'avatar'}><UserRound/>{!failed && safeUrl(url) && <img src={previewUrl(url, 120)} loading="lazy" alt="" onError={() => setFailed(true)}/>}</span>;
}
function Login({ onLogin, toast }) {
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const codeInput = useRef(null);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  function phone() {
    if (!/^1\d{10}$/.test(mobile.trim())) throw new Error('请输入正确的手机号');
    return mobile.trim();
  }
  async function send() {
    setError('');
    try { const number = phone(); setSending(true); await api.sendCode(number); setSeconds(60); toast('验证码已发送'); codeInput.current?.focus(); }
    catch (failure) { setError(failure.message); }
    finally { setSending(false); }
  }
  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      const number = phone(); if (!/^\d{4,8}$/.test(code.trim())) throw new Error('请输入短信验证码');
      setLoggingIn(true); await api.login(number, code.trim()); setCode(''); onLogin();
    } catch (failure) { setError(failure.message); }
    finally { setLoggingIn(false); }
  }
  return <section className="login-page">
    <header className="login-heading"><div className="login-mark"><TimelineIcon/></div><h1>园宝通</h1></header>
    <div className="login-body"><h2>验证码登录</h2><p className="muted">使用园宝通绑定的手机号登录</p>
      <form onSubmit={submit}>
        <label className="field"><span>手机号</span><Input className="app-input" aria-label="手机号" type="tel" inputMode="tel" autoComplete="tel" placeholder="请输入手机号" maxLength={11} value={mobile} onChange={event => setMobile(event.target.value)} required/></label>
        <div className="code-row"><label className="field"><span>验证码</span><Input ref={codeInput} className="app-input" aria-label="验证码" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="请输入验证码" maxLength={8} value={code} onChange={event => setCode(event.target.value)} required/></label><Button type="button" variant="ghost" className="send-code" onClick={send} disabled={sending || seconds > 0}>{sending ? '发送中…' : seconds ? `${seconds}s 后重发` : '获取验证码'}</Button></div>
        <p className="error" role="alert">{error}</p><Button type="submit" className="primary" disabled={loggingIn}>{loggingIn ? '登录中…' : '登录'}</Button>
      </form><p className="login-note">登录后查看亲友圈、班级圈<br/>预览图片，下载原图</p>
    </div><footer className="login-footer">非官方开源客户端 · <a href="https://github.com/h2562961224/open-yuanbaotong" target="_blank" rel="noopener noreferrer">Open Yuanbaotong</a></footer>
  </section>;
}
function Photo({ media, remaining, onClick, number }) {
  const [failed, setFailed] = useState(false);
  return <button className="photo" aria-label={media.video ? '播放视频' : `查看第 ${number} 张图片`} onClick={onClick}>
    {!failed ? <img src={previewUrl(media.thumb || media.url, 480)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)}/> : <span className="photo-error">点击查看</span>}
    {(remaining > 0 || media.video) && <span className="photo-overlay">{remaining > 0 ? `+${remaining}` : '▷'}</span>}
  </button>;
}
function Post({ post, family, onView }) {
  return <article className={`post ${family ? 'family-post' : ''}`}>
    <header className="post-head"><Avatar url={post.avatar}/><div className="post-byline"><h2>{post.author || '动态'}</h2><p className="post-date">{post.date.replace('T', ' ').slice(0, 16)}</p></div></header>
    {post.text && <p className="post-text">{post.text}</p>}
    {post.media.length > 0 && <div className={`photo-grid count-${Math.min(4, post.media.length)}`}>
      {post.media.slice(0, 4).map((media, index) => <Photo key={`${media.url}-${index}`} media={media} number={index + 1} remaining={index === 3 ? post.media.length - 4 : 0} onClick={() => onView(post.media, index)}/>)}</div>}
    <footer className="post-foot"><span className="post-tag">{post.media.length ? '#照片视频' : ''}</span><span className="post-counts"><span className="post-count" aria-label={`${post.comments} 条评论`}><MessageCircle/>{post.comments}</span><span className="post-count" aria-label={`${post.likes} 个赞`}><ThumbsUp/>{post.likes}</span></span></footer>
  </article>;
}
function Feed({ children, onLogout, toast }) {
  const [childId, setChildId] = useState(String(children[0].id));
  const child = children.find(item => String(item.id) === childId) || children[0];
  const [circle, setCircle] = useState('class');
  const [type, setType] = useState('all');
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState(null);
  useEffect(() => {
    let current = true; setLoading(true); setError('');
    if (page === 1) setPosts([]);
    api.timeline(circle, child, page === 1 ? '' : posts.at(-1)?.id, type).then(data => {
      if (!current) return;
      const result = pageFrom(data);
      const rows = result.rows.map(postFrom);
      setPosts(previous => page === 1 ? rows : [...previous, ...rows]);
      setMore(result.more && (result.total == null || page * 20 < Number(result.total)));
    }).catch(failure => { if (current) setError(failure.message); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [child, circle, type, page, refresh]);
  function reset() { setPage(1); setMore(true); }
  return <>
    <header className="page-head"><h1>时光轴</h1><Button variant="ghost" className="text-button" onClick={onLogout}>退出登录</Button></header>
    <section className="baby-header"><Avatar large url={child.avatar}/><div className="baby-info"><label className="baby-select"><select aria-label="选择宝宝" value={childId} onChange={event => { setChildId(event.target.value); reset(); }}>{children.map(item => <option value={String(item.id)} key={item.id}>{item.name}</option>)}</select><ChevronDown/></label><p className="muted">{[child.schoolName, child.className].filter(Boolean).join(' · ')}</p></div></section>
    <div className="circle-sticky"><div className="circle-tabs" role="tablist" aria-label="动态类型">{[['family', '亲友圈'], ['class', '班级圈']].map(([value, label]) => <button key={value} role="tab" aria-selected={circle === value} onClick={() => { if (value !== circle) { setCircle(value); setType('all'); reset(); } }}>{label}</button>)}</div>
      {circle === 'class' && <div className="filters" role="tablist" aria-label="班级圈分类">{[['all', '全部'], ['school', '园所'], ['class', '班级'], ['home', '家长']].map(([value, label]) => <button key={value} role="tab" aria-selected={type === value} onClick={() => { if (type !== value) { setType(value); reset(); } }}>{label}</button>)}</div>}
    </div>
    <section aria-label="动态列表">{posts.map((post, index) => <Post key={`${post.id || index}-${circle}`} post={post} family={circle === 'family'} onView={(media, selected) => setView({ media, selected })}/>)}</section>
    <div className="load-area"><p role="status">{loading ? '加载中…' : error || (!posts.length ? '暂无动态' : !more ? '没有更多了' : '')}</p>
      {!loading && (error || more) && <Button variant="ghost" className="text-button" onClick={() => error ? setRefresh(value => value + 1) : setPage(value => value + 1)}>{error ? '重新加载' : '加载更多'}</Button>}
    </div>
    <footer className="bottom-nav"><span className="nav-active"><TimelineIcon/>时光轴</span><button aria-label="刷新动态" onClick={() => { reset(); setRefresh(value => value + 1); }}><RefreshCw/>刷新</button></footer>
    <Viewer view={view} onClose={() => setView(null)} toast={toast}/>
  </>;
}
export default function App() {
  const [session, setSession] = useState(api.hasSession());
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState('');
  const timer = useRef();
  const toast = useCallback(value => { clearTimeout(timer.current); setMessage(value); timer.current = setTimeout(() => setMessage(''), 4500); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const logout = useCallback(() => { api.clearSession(); setChildren([]); setSession(false); }, []);
  useEffect(() => { const expired = () => { logout(); toast('登录已过期，请重新登录'); }; window.addEventListener('session-expired', expired); return () => window.removeEventListener('session-expired', expired); }, [logout, toast]);
  useEffect(() => {
    if (!session) return;
    let current = true; setLoading(true); setError('');
    api.familyBabies().then(info => {
      if (!current) return;
      const list = childrenFrom(info);
      if (!list.length) throw new Error('尚未读取到宝宝信息，请重试。若 App 中已有宝宝，需要进一步适配账号数据。');
      setChildren(list);
    }).catch(failure => { if (current) setError(failure.message); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [session, retry]);
  return <><main className="app">
    {!session ? <Login onLogin={() => setSession(true)} toast={toast}/> : loading ? <div className="initial-loading" role="status">正在加载宝宝信息…</div> : error ? <section className="account-error"><h1>宝宝信息加载失败</h1><p role="alert">{error}</p><Button className="primary" onClick={() => setRetry(value => value + 1)}>重新加载</Button><Button variant="ghost" className="text-button" onClick={logout}>退出登录</Button></section> : children.length ? <Feed children={children} onLogout={logout} toast={toast}/> : null}
  </main>{message && <div className="toast" role="status">{message}</div>}</>;
}
