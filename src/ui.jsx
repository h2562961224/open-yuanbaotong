import {useEffect,useState} from 'react';
import {ArrowLeft,ChevronRight,UserRound,MessageCircle,ThumbsUp} from 'lucide-react';
import {previewUrl,safeUrl} from './media.js';
export function TimelineIcon(){return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="6" y="3" width="20" height="26" rx="8"/><path d="M12 10h8M12 16h5M12 22h8"/></svg>;}
export function Avatar({url,large=false}){const[failed,set]=useState(false);useEffect(()=>set(false),[url]);return <span className={large?'baby-avatar':'avatar'}><UserRound/>{!failed&&safeUrl(url)&&<img src={previewUrl(url,120)} alt="" loading="lazy" onError={()=>set(true)}/>}</span>;}
export function Header({title,onBack,action}){return <header className="sub-head"><button aria-label="返回" onClick={onBack}><ArrowLeft/></button><h1>{title}</h1><span>{action}</span></header>;}
export function State({loading,error,reload,empty=false}){return <div className="load-area" role="status">{loading?'加载中…':error?<><p>{error}</p><button className="text-button" onClick={reload}>重新加载</button></>:empty?'暂无内容':null}</div>;}
export function More({state}){return <><State {...state} empty={!state.rows.length}/>{!state.loading&&!state.error&&state.rows.length>0&&(state.more?<button className="load-more" onClick={state.morePage}>加载更多</button>:<p className="end-note">没有更多了</p>)}</>;}
export function Row({title,description,icon,onClick,children}){return <button className="menu-row" onClick={onClick}>{icon&&<img src={icon} alt=""/>}<span><strong>{title}</strong>{description&&<small>{description}</small>}</span>{children}<ChevronRight/></button>;}
export function Tabs({items,value,onChange,label}){return <div className="filters" role="tablist" aria-label={label}>{items.map(([key,name])=><button key={key} role="tab" aria-selected={value===key} onClick={()=>onChange(key)}>{name}</button>)}</div>;}
export function Photo({media,remaining=0,onClick,number}){const[failed,set]=useState(false);return <button className="photo" aria-label={media.video?'播放视频':`查看第 ${number} 张图片`} onClick={onClick}>{!failed?<img src={previewUrl(media.thumb||media.url,480)} alt="" loading="lazy" decoding="async" onError={()=>set(true)}/>:<span className="photo-error">点击查看</span>}{(remaining>0||media.video)&&<span className="photo-overlay">{remaining>0?`+${remaining}`:'▷'}</span>}</button>;}
export function Post({post,family=false,onView,onDetail,onLike}){
  const images=post.media.filter(file=>!file.audio),audios=post.media.filter(file=>file.audio);
  return <article className={`post ${family?'family-post':''}`}>
    <header className="post-head"><Avatar url={post.avatar}/><button className="post-byline" onClick={onDetail}><h2>{post.author}</h2><p className="post-date">{post.date.replace('T',' ').slice(0,16)}</p></button></header>
    {post.title&&<button className="post-title" onClick={onDetail}>{post.title}</button>}
    {post.text&&<button className="post-text" onClick={onDetail}>{post.text}</button>}
    {!!images.length&&<div className={`photo-grid count-${Math.min(4,images.length)}`}>{images.slice(0,4).map((media,index)=><Photo key={`${media.url}-${index}`} media={media} number={index+1} remaining={index===3?images.length-4:0} onClick={()=>onView(images,index)}/>)}</div>}
    {audios.map(media=><audio key={media.url} src={safeUrl(media.url)} controls preload="none"/>)}
    <footer className="post-foot"><span className="post-tag">{post.dataFromDesc||post.fromDesc||(images.length?'#照片视频':'')}</span><span className="post-counts"><button className="post-count" aria-label={`评论 ${post.comments}`} onClick={onDetail}><MessageCircle/>{post.comments}</button><button className="post-count" aria-label={`点赞 ${post.likes}`} onClick={onLike||onDetail}><ThumbsUp/>{post.likes}</button></span></footer>
  </article>;
}
