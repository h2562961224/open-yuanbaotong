import {useCallback,useEffect,useRef,useState} from 'react';
import {pageFrom} from './models.js';
export function useRemote(load,keys=[]) {
  const [state,set]=useState({loading:true,data:null,error:''});
  const [version,bump]=useState(0);
  useEffect(()=>{let active=true;set({loading:true,data:null,error:''});Promise.resolve().then(load).then(data=>{if(active)set({loading:false,data,error:''});},error=>{if(active)set({loading:false,data:null,error:error.message});});return()=>{active=false;};},[...keys,version]);
  return {...state,reload:()=>bump(v=>v+1)};
}
export function usePaged(load,keys=[]) {
  const [state,set]=useState({rows:[],loading:true,error:'',more:true});
  const loader=useRef(load);loader.current=load;
  const cursor=useRef(''),epoch=useRef(0),pending=useRef(false),seen=useRef(new Set());
  const fetchPage=useCallback(async(reset=false)=>{
    if(pending.current&&!reset)return;
    if(reset){epoch.current++;cursor.current='';seen.current=new Set();}
    const stamp=epoch.current;pending.current=true;
    set(old=>({...old,rows:reset?[]:old.rows,loading:true,error:''}));
    try {
      const {rows}=pageFrom(await loader.current(cursor.current));
      if(stamp!==epoch.current)return;
      const fresh=rows.filter(row=>{const key=String(row.id??row.msgId??row.checkNo??row.order_book_id??JSON.stringify(row));if(seen.current.has(key))return false;seen.current.add(key);return true;});
      const last=rows.at(-1);cursor.current=last?.id??last?.msgId??last?.checkNo??'';
      set(old=>({rows:reset?fresh:[...old.rows,...fresh],loading:false,error:'',more:fresh.length>0&&!!cursor.current}));
    }catch(error){if(stamp===epoch.current)set(old=>({...old,loading:false,error:error.message}));}
    finally{if(stamp===epoch.current)pending.current=false;}
  },[]);
  useEffect(()=>{fetchPage(true);return()=>{epoch.current++;pending.current=false;};},keys);
  return {...state,morePage:()=>fetchPage(),reload:()=>fetchPage(true)};
}
