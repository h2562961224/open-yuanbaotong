import * as api from '../api.js';
import {usePaged,useRemote} from '../hooks.js';
import {Header,More,State} from '../ui.jsx';
import {previewUrl,safeUrl} from '../media.js';
export function Attendance({child,onBack,onView}){
 const state=usePaged(cursor=>api.attendance(child,cursor),[child.id]);
 return <><Header title="幼儿考勤" onBack={onBack}/>{state.rows.map((row,i)=><article className="content-paper" key={row.checkNo||i}><h2>{row.checkTime||row.createTime}</h2><p>{row.checkDesc||row.checkType}</p>{safeUrl(row.imageUrl||row.fileUrl)&&<button onClick={()=>onView([{url:row.imageUrl||row.fileUrl}],0)}><img className="attendance-photo" src={previewUrl(row.imageUrl||row.fileUrl,480)} alt="考勤照片"/></button>}</article>)}<More state={state}/></>;
}
export function Classroom({child,onBack}){
 const state=useRemote(()=>api.classroom(child),[child.id]);
 return <><Header title="宝宝课堂" onBack={onBack}/><State {...state} empty={Array.isArray(state.data)&&!state.data.length}/>{Array.isArray(state.data)&&state.data.map((item,i)=><article className="content-paper" key={item.id||i}><h2>{item.name||item.title}</h2>{safeUrl(item.url||item.playUrl)?<video controls playsInline preload="none" src={safeUrl(item.url||item.playUrl)}/>:<p className="muted">此课堂使用 App 专用视频服务</p>}</article>)}</>;
}
