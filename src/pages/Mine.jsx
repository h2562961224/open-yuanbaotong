import * as api from '../api.js';
import {useRemote} from '../hooks.js';
import {Avatar,Row,State} from '../ui.jsx';
const icon=name=>`/app-assets/mine/${name}.png`;
export default function Mine({child,children,profile,navigate}){
  const messages=useRemote(()=>api.messages(),[child.id]);
  return <section className="mine-page"><div className="mine-top"><h1>我的</h1><button className="mine-profile" onClick={()=>navigate('profile')}><Avatar large url={profile?.avatarUrl}/><span><strong>{profile?.nick||profile?.name||child.name+child.kinship}</strong><small>{profile?.mobile}</small></span><b>›</b></button></div>
    <div className="mine-card baby-manage"><Row title="宝宝管理" description={`${children.length} 个宝宝`} icon={icon('mannger')} onClick={()=>navigate('babies')}/><div>{children.map(b=><button key={b.id} onClick={()=>navigate('baby',{id:b.id})}><Avatar url={b.avatar}/><span>{b.name}</span></button>)}</div></div>
    <div className="mine-card">{[['orders','我的订单','mine_order_icon'],['friends','亲友团','mine_friend_icon'],['feedback','意见反馈','mine_feed_back'],['settings','设置','mine_setting_icon'],['help','帮助中心','mine_helper_icon']].map(([key,title,img])=><Row key={key} title={title} icon={icon(img)} onClick={()=>navigate(key)}/>)}</div>
    <div className="mine-card"><Row title="我的消息" description="全部" onClick={()=>navigate('messages')}/><State {...messages}/>{messages.data?.slice(0,6).map(item=><Row key={item.msgId} title={item.title} description={item.content} onClick={()=>navigate('message',{id:item.msgId})}/>)}{messages.data?.length===0&&<div className="no-message"><img src={icon('mine_no_message')} alt=""/>暂无消息</div>}</div>
  </section>;
}
