import {useState} from 'react';
import {ChevronDown,Search,RefreshCw} from 'lucide-react';
import * as api from '../api.js';
import {usePaged,useRemote} from '../hooks.js';
import {postFrom} from '../models.js';
import {Avatar,Tabs,More,Post,State,Header} from '../ui.jsx';
export default function Timeline({child,children,onChild,navigate,onView}){
  const[circle,setCircle]=useState('class'),[group,setGroup]=useState('all'),[keyword,setKeyword]=useState(''),[query,setQuery]=useState(''),[date,setDate]=useState(''),[search,setSearch]=useState(false);
  const state=usePaged(cursor=>api.timeline(circle,child,cursor,group,{...(circle==='family'?{keyWord:query}:{}),endDate:date?date+' 23:59:59':''}),[child.id,circle,group,query,date]);
  return <><header className="page-head"><h1>时光轴</h1><div><button aria-label="搜索动态" onClick={()=>setSearch(v=>!v)}><Search/></button><button aria-label="刷新动态" onClick={state.reload}><RefreshCw/></button></div></header>
    <section className="baby-header timeline-baby"><Avatar large url={child.avatar}/><div className="baby-info"><label className="baby-select"><select aria-label="选择宝宝" value={child.id} onChange={e=>onChild(e.target.value)}>{children.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown/></label><p className="muted">{[child.schoolName,child.className].filter(Boolean).join(' · ')}</p><button className="album-link" onClick={()=>navigate('album')}>宝贝相册 ›</button></div></section>
    {search&&<form className="search-form" onSubmit={e=>{e.preventDefault();setQuery(keyword);}}>{circle==='family'&&<input aria-label="搜索内容" value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="搜索动态内容"/>}<label>日期<input type="date" aria-label="动态截止日期" value={date} onChange={e=>setDate(e.target.value)}/></label>{circle==='family'&&<button type="submit">搜索</button>}</form>}
    <div className="circle-sticky"><div className="circle-tabs" role="tablist" aria-label="动态类型">{[['family','亲友圈'],['class','班级圈']].map(([key,label])=><button key={key} role="tab" aria-selected={key===circle} onClick={()=>setCircle(key)}>{label}</button>)}</div>
    {circle==='class'?<Tabs items={[["all","全部"],["school","园所"],["class","班级"],["home","家长"]]} value={group} onChange={setGroup} label="班级圈分类"/>:<div className="family-shortcuts">{[['audio','童言童语'],['events','大事记'],['diary','日记'],['tasks','亲子任务']].map(([key,title])=><button key={key} onClick={()=>navigate(key)}>{title}</button>)}</div>}</div>
    <section aria-label="动态列表">{state.rows.map(raw=><Post key={raw.id} post={postFrom(raw)} family={circle==='family'} onView={onView} onDetail={()=>navigate('detail',{circle,id:raw.id})}/>)}</section><More state={state}/>
  </>;
}
export function TimelineDetail({child,id,circle,onView,onBack,toast}){
  const remote=useRemote(()=>api.detail(circle,child,id),[child.id,id,circle]);
  const[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function reply(e){e.preventDefault();if(!text.trim()||busy)return;setBusy(true);setError('');try{await api.reply(circle,child,id,text.trim());setText('');remote.reload();toast('评论成功');}catch(e){setError(e.message);}finally{setBusy(false);}}
  async function like(){if(busy)return;setBusy(true);try{await api.reactTo(circle,child,id,'👍');remote.reload();}catch(e){toast(e.message);}finally{setBusy(false);}}
  const post=remote.data&&postFrom(remote.data);
  return <><Header title="动态详情" onBack={onBack}/><State {...remote}/>{post&&<><Post post={post} onView={onView} onLike={like}/><div className="detail-replies"><h2>评论 {post.comments}</h2>{post.reactions.length>0&&<p className="reaction-list">{post.reactions.map((r,i)=><span key={r.id||i}>{r.senderName||[r.senderStudName,r.senderKinship].filter(Boolean).join('')}{r.emoji}</span>)}</p>}{post.replies.map((r,i)=><div key={r.id||i} className="reply"><Avatar url={r.senderAvatarUrl||r.replyUserAvatarUrl}/><div><strong>{r.senderName||r.replyUserName||r.userName||[r.replyStudName,r.replyKinship].filter(Boolean).join('')}</strong><p>{r.content}</p><small>{r.createTime||r.replyTime}</small></div></div>)}{!post.replies.length&&<p className="muted">暂无评论</p>}</div>{post.replyEnable!==false&&<form className="reply-form" onSubmit={reply}><input aria-label="评论内容" placeholder="说点什么吧…" value={text} onChange={e=>setText(e.target.value)} maxLength={2000}/><button disabled={busy||!text.trim()}>{busy?'发送中…':'发送'}</button>{error&&<p className="error">{error}</p>}</form>}</>}</>;
}
