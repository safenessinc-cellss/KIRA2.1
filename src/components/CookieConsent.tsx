import React, { useEffect, useState } from "react";
import { Cookie, Settings2, X } from "lucide-react";

type Preferences = { necessary: true; analytics: boolean; marketing: boolean; version: string; savedAt: string };
const STORAGE_KEY = "kira.cookie.preferences.v1";
const POLICY_VERSION = "2026-11-10";
function readPreferences(): Preferences | null {
 try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return null; const parsed = JSON.parse(raw); if (parsed?.version !== POLICY_VERSION) return null; return { necessary:true, analytics:parsed.analytics===true, marketing:parsed.marketing===true, version:POLICY_VERSION, savedAt:String(parsed.savedAt||"") }; } catch { return null; }
}
function savePreferences(analytics:boolean,marketing:boolean): Preferences {
 const value: Preferences = { necessary:true, analytics, marketing, version:POLICY_VERSION, savedAt:new Date().toISOString() };
 localStorage.setItem(STORAGE_KEY,JSON.stringify(value)); return value;
}
export function hasKiraCookieConsent(category:"analytics"|"marketing"): boolean {
 try { const value=readPreferences(); return value?.[category]===true; } catch { return false; }
}
export function CookieConsent() {
 const [visible,setVisible]=useState(false);
 const [customize,setCustomize]=useState(false);
 const [analytics,setAnalytics]=useState(false);
 const [marketing,setMarketing]=useState(false);
 useEffect(()=>{
  const current=readPreferences(); setVisible(!current);
  const open=()=>{const saved=readPreferences();setAnalytics(saved?.analytics===true);setMarketing(saved?.marketing===true);setCustomize(true);setVisible(true);};
  window.addEventListener("kira:open-cookie-settings",open);
  return ()=>window.removeEventListener("kira:open-cookie-settings",open);
 },[]);
 const persist=(a:boolean,m:boolean)=>{savePreferences(a,m);setVisible(false);setCustomize(false);};
 if(!visible)return null;
 return <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:inset-x-5 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="kira-cookie-title">
  <div className="flex items-start gap-3"><div className="rounded-xl bg-teal-50 p-2 text-teal-800"><Cookie size={20}/></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 id="kira-cookie-title" className="font-bold text-slate-900">Tu privacidad importa</h2><button onClick={()=>setVisible(false)} aria-label="Cerrar aviso" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={17}/></button></div>
   <p className="mt-1 text-xs leading-relaxed text-slate-600">KIRA utiliza almacenamiento esencial para iniciar sesión, mantener la seguridad y recordar tus preferencias. Las categorías opcionales de analítica y marketing están desactivadas por defecto. Consulta la <a href="/legal/cookies" className="font-semibold text-teal-800 underline">Política de cookies</a>.</p>
   {customize&&<div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-800">Necesarias</p><p className="text-[11px] text-slate-500">Autenticación, seguridad y funciones básicas.</p></div><span className="text-xs font-bold text-teal-800">Siempre activas</span></div>
    <label className="flex items-center justify-between gap-3"><span><span className="block text-sm font-semibold text-slate-800">Analítica</span><span className="text-[11px] text-slate-500">Medición de uso y rendimiento, si se habilita.</span></span><input type="checkbox" checked={analytics} onChange={e=>setAnalytics(e.target.checked)} className="h-4 w-4 accent-teal-700"/></label>
    <label className="flex items-center justify-between gap-3"><span><span className="block text-sm font-semibold text-slate-800">Marketing</span><span className="text-[11px] text-slate-500">Publicidad y seguimiento, si se habilita.</span></span><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)} className="h-4 w-4 accent-teal-700"/></label>
    <p className="text-[10px] leading-relaxed text-slate-500">Guardar una preferencia no activa por sí solo herramientas de terceros. Cada integración opcional deberá consultar esta elección antes de cargar.</p>
   </div>}
   <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>persist(false,false)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Rechazar opcionales</button><button onClick={()=>customize?persist(analytics,marketing):setCustomize(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"><Settings2 size={14}/>{customize?"Guardar preferencias":"Configurar"}</button><button onClick={()=>persist(true,true)} className="rounded-xl bg-teal-800 px-3 py-2 text-xs font-bold text-white">Aceptar todas</button></div>
  </div></div>
 </div>;
}
