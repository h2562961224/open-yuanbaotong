import {useState} from 'react';
import {Bell,ChevronDown} from 'lucide-react';
import * as api from '../api.js';
import {useRemote,usePaged} from '../hooks.js';
import {Avatar,More,Row,Tabs} from '../ui.jsx';
import {safeUrl} from '../media.js';
const cards=[['growth','成长档案','czda'],['tasks','亲子任务','qzrw'],['food','今日美食','jrms'],['cookbook','下周食谱','xzsp']];
export default function Home({child,children,onChild,navigate}){
  const [tab,setTab]=useState('notice');
  const banners=useRemote(()=>api.banners(child),[child.id]);
  const menus=useRemote(()=>api.menus(child),[child.id]);
  const state=usePaged(cursor=>tab==='notice'?api.notices(child,cursor):api.todos(child,cursor),[child.id,tab]);
  const extra=(menus.data||[]).filter(item=>!['成长档案','今日美食','下周食谱','亲子任务','缴费管理'].includes(item.name));
  return <section className="home-page"><div className="home-top"><div className="home-school"><label className="avatar-switch"><Avatar url={child.avatar}/><select aria-label="选择宝宝" value={child.id} onChange={e=>onChild(e.target.value)}>{children.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button onClick={()=>navigate('school')}><span>{child.schoolNick||child.schoolName||child.name}</span><ChevronDown/></button><button aria-label="我的消息" onClick={()=>navigate('messages')}><Bell/></button></div>
    {banners.data?.length>0&&<div className="home-banner">{banners.data.slice(0,1).map(b=><button key={b.url} onClick={()=>navigate('growth')}><img src={safeUrl(b.url)} alt={b.title}/></button>)}</div>}
  </div><div className="home-cards">{cards.map(([key,title,image])=><button key={key} onClick={()=>navigate(key)}><img src={`/app-assets/home/home_${image}.png`} alt=""/><span>{title}<b>➜</b></span></button>)}</div>
    {!!extra.length&&<div className="extra-menus">{extra.map(item=><button key={item.id} onClick={()=>navigate(item.name==='幼儿考勤'?'attendance':item.name==='宝宝课堂'?'classroom':'school')}><img src={safeUrl(item.scheme?.icon)} alt=""/>{item.name}</button>)}</div>}
    <Tabs items={[["todo","待办事项"],["notice","通知"]]} value={tab} onChange={setTab} label="家园消息"/>
    {state.rows.map((row,i)=><Row key={row.id||i} title={row.title||row.content||'通知'} description={row.createDate||row.createTime||row.publicTime} onClick={()=>navigate('detail',{circle:'class',id:row.timelineId||row.id})}/>)}<More state={state}/>
  </section>;
}
