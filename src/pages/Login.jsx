import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {TimelineIcon} from '../ui.jsx';
import * as api from '../api.js';
export default function Login({ onLogin, toast }) {
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