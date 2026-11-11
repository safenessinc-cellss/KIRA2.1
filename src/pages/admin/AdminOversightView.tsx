import React, { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "../../firebase";
import { Activity, BookOpen, CheckCircle2, Clock3, GraduationCap, RefreshCw, Search, ShieldAlert, Users } from "lucide-react";

type Item = Record<string, any>;
type Dashboard = { view: "coach" | "student"; summary: Record<string, number>; items: Item[] };
type Message = { id: string; chatId: string; content: string; senderName: string; createdAt: string; participants: Array<{ id: string; displayName: string }> };
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!auth.currentUser) throw new Error("Tu sesión ha caducado. Inicia sesión nuevamente.");
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No se pudo completar la consulta.");
  return payload as T;
}
const dateLabel = (value: any) => { if (!value) return "Sin actividad registrada"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Fecha no disponible" : date.toLocaleString("es"); };

export function AdminOversightView() {
  const [tab, setTab] = useState<"coach" | "student" | "chat">("coach");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cases, setCases] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const loadDashboard = useCallback(async (view: "coach" | "student") => { setLoading(true); setError(""); try { setDashboard(await request<Dashboard>(`/api/admin/oversight/dashboard?view=${view}`)); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }, []);
  const loadChats = useCallback(async () => { setLoading(true); setError(""); try { const data = await request<{items: Message[]; cases: Item[]}>("/api/admin/oversight/chats?limit=200"); setMessages(data.items || []); setCases(data.cases || []); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { if (tab === "chat") void loadChats(); else void loadDashboard(tab); }, [tab, loadChats, loadDashboard]);
  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return q ? messages.filter(m => [m.content,m.senderName,m.chatId,...m.participants.map(p=>p.displayName)].join(" ").toLowerCase().includes(q)) : messages; }, [messages,search]);
  const flag = async (message: Message) => {
    const reason = window.prompt("Motivo para enviar este mensaje a revisión:"); if (!reason?.trim()) return;
    try { await request(`/api/admin/oversight/chats/${encodeURIComponent(message.id)}/review`, {method:"POST",body:JSON.stringify({chatId:message.chatId,reason})}); setNotice("Incidencia registrada en el centro de moderación."); await loadChats(); } catch(e:any) { setError(e.message); }
  };
  const summary = dashboard?.summary || {};
  const cards = tab === "coach" ? [
    ["Coaches",summary.coaches||0,Users],["Aprobados",summary.approved||0,CheckCircle2],["Cursos",summary.courses||0,BookOpen],
    ["Sesiones",summary.sessions||0,Clock3],["Activos 30 días",summary.activeLast30Days||0,Activity]
  ] : [["Alumnos",summary.students||0,Users],["Activos 30 días",summary.activeLast30Days||0,Activity],["Matrículas",summary.enrollments||0,BookOpen],["Completadas",summary.completedEnrollments||0,CheckCircle2],["Sesiones activas",summary.activeSessions||0,Clock3]];
  return <section className="space-y-5">
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Centro de supervisión · solo lectura</p><h2 className="mt-1 text-2xl font-black text-slate-900">Coach, alumno y moderación</h2><p className="mt-2 text-sm text-slate-500">Dashboards operativos y revisión trazable de chats de plataforma.</p>
      <div className="mt-4 flex flex-wrap gap-2">{([{id:"coach",label:"Dashboard Coach"},{id:"student",label:"Dashboard Alumno"},{id:"chat",label:"Moderación de chats"}] as const).map(item=><button key={item.id} onClick={()=>{setTab(item.id);setSearch("");setError("");setNotice("");}} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab===item.id?"bg-teal-700 text-white":"border border-slate-200 bg-white text-slate-700"}`}>{item.label}</button>)}</div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    {tab!=="chat" && <><div className="flex justify-between gap-3"><p className="text-sm text-slate-500">Datos reales disponibles; no se generan registros demo.</p><button onClick={()=>void loadDashboard(tab)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><RefreshCw size={14}/> Actualizar</button></div>
      {loading?<p className="rounded-xl bg-white p-6 text-sm text-slate-500">Cargando dashboard…</p>:<><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{cards.map(([label,value,Icon]:any)=><article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Icon className="text-teal-700" size={18}/><p className="mt-3 text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></article>)}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b p-4 font-bold">{tab==="coach"?"Coaches y rendimiento académico":"Alumnos y progreso"}</div><div className="divide-y">{(dashboard?.items||[]).map(item=><div key={item.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(90px,auto))] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-bold">{item.displayName}</p><p className="text-xs text-slate-500">{item.approvalStatus} · {dateLabel(item.lastActivityAt)}</p></div>{tab==="coach"?<><span className="text-xs">{item.activeCourses} cursos activos</span><span className="text-xs">{item.students} alumnos</span><span className="text-xs">{item.enrollments} matrículas</span></>:<><span className="text-xs">{item.courses} matrículas</span><span className="text-xs">{item.completed} completadas</span><span className="text-xs">{item.averageProgress}% progreso</span></>}</div>)}{!dashboard?.items.length&&<p className="p-6 text-sm text-slate-500">No hay datos registrados.</p>}</div></div></>}</>}
    {tab==="chat" && <><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><strong>Alcance:</strong> solo mensajes del chat de plataforma. No se incluyen diarios personales, notas privadas ni transcripciones confidenciales de sesiones. El acceso debe informarse en la política de privacidad.</div>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Conversaciones recientes</h3><p className="text-xs text-slate-500">{messages.length} mensajes · {cases.length} incidencias</p></div><button onClick={()=>void loadChats()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><RefreshCw size={14}/> Actualizar</button></div>
      <div className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar mensaje o participante" className="min-h-10 w-full rounded-xl border bg-white pl-9 pr-3 text-sm"/></div>
      {loading?<p className="rounded-xl bg-white p-6 text-sm">Cargando conversaciones…</p>:<div className="space-y-3">{filtered.map(message=><article key={message.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold">{message.senderName}</p><p className="text-[11px] text-slate-400">{message.participants.map(p=>p.displayName).join(" · ")} · {dateLabel(message.createdAt)}</p></div><button onClick={()=>void flag(message)} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800"><ShieldAlert size={14}/> Marcar para revisión</button></div><p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{message.content}</p></article>)}{!filtered.length&&<p className="rounded-xl bg-white p-6 text-sm">No hay mensajes coincidentes.</p>}</div>}
      {cases.length>0&&<section className="rounded-2xl border bg-white p-4"><h3 className="font-bold">Incidencias registradas</h3>{cases.map(item=><div key={item.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-xs"><span className="font-mono">{item.messageId}</span><span>{item.reason}</span><strong className="text-amber-700">{item.status}</strong></div>)}</section>}
    </>}
  </section>;
}
