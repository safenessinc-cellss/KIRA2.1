import React, { useCallback, useEffect, useState } from "react";
import { auth } from "../../firebase";
import { CalendarDays, ClipboardCheck, Loader2, Plus, RefreshCw, Users } from "lucide-react";

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("La sesión expiró. Vuelve a iniciar sesión.");
  const response = await fetch(path, { method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No se pudo completar la operación.");
  return payload as T;
}
type Group = { id: string; courseId: string; name: string; coachId: string; capacity: number; enrolledCount: number; status: string; timezone?: string };
type Session = { id: string; startsAt: string; endsAt: string; room?: string; status: string };
type Enrollment = { id?: string; userId: string; studentName?: string; status: string };
type Performance = { studentId: string; attendancePct: number; avgScorePct: number; lastCalculatedAt?: string };

export function AcademicGroupsView() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courseId, setCourseId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [studentId, setStudentId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const data = await api<{items:Group[]}>("/api/admin/groups");
      setGroups(data.items || []);
      if (!selected && data.items?.[0]) setSelected(data.items[0].id);
    } catch (e:any) { setError(e.message); } finally { setBusy(false); }
  }, [selected]);
  const loadSelected = useCallback(async () => {
    if (!selected) { setSessions([]); setEnrollments([]); return; }
    try {
      const [s,e] = await Promise.all([
        api<{items:Session[]}>(`/api/admin/groups/${selected}/sessions`),
        api<{items:Enrollment[]}>(`/api/admin/groups/${selected}/enrollments`)
      ]);
      setSessions(s.items || []); setEnrollments(e.items || []);
    } catch (e:any) { setError(e.message); }
  }, [selected]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadSelected(); }, [loadSelected]);

  const createGroup = async (event:React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { const result = await api<Group>("/api/admin/groups","POST",{courseId,coachId,name,capacity:Number(capacity)}); setSelected(result.id); setName(""); setNotice("Grupo creado y auditado."); await load(); }
    catch(e:any){setError(e.message);} finally{setBusy(false);}
  };
  const createSession = async (event:React.FormEvent) => {
    event.preventDefault(); if(!selected)return; setBusy(true);setError("");setNotice("");
    try { await api(`/api/admin/groups/${selected}/sessions`,"POST",{startsAt:new Date(startsAt).toISOString(),endsAt:new Date(endsAt).toISOString(),room}); setNotice("Sesión creada; se validó el solapamiento de coach y sala."); await loadSelected(); }
    catch(e:any){setError(e.message);} finally{setBusy(false);}
  };
  const enroll = async (event:React.FormEvent) => {
    event.preventDefault();if(!selected)return;setBusy(true);setError("");setNotice("");
    try { await api(`/api/admin/groups/${selected}/enroll`,"POST",{studentId,paymentPlan:"upfront"});setStudentId("");setNotice("Matrícula creada y cupo reservado en una transacción Firestore.");await load();await loadSelected(); }
    catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  const selectedGroup=groups.find(g=>g.id===selected);
  return <section className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-900">Grupos y horarios</h2><p className="text-sm text-slate-500">Grupos, calendario y reserva transaccional de cupos.</p></div><button onClick={()=>{void load();void loadSelected();}} className="rounded-xl border px-3 py-2 text-sm font-semibold"><RefreshCw size={15} className="mr-2 inline"/>Actualizar</button></header>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{notice&&<p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    <form onSubmit={createGroup} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-5"><div className="md:col-span-5 font-bold">Crear grupo</div><input required value={courseId} onChange={e=>setCourseId(e.target.value)} placeholder="ID del curso" className="rounded-lg border p-2 text-sm"/><input required value={coachId} onChange={e=>setCoachId(e.target.value)} placeholder="UID del coach aprobado" className="rounded-lg border p-2 text-sm"/><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre del grupo" className="rounded-lg border p-2 text-sm"/><input required type="number" min="1" value={capacity} onChange={e=>setCapacity(e.target.value)} placeholder="Capacidad" className="rounded-lg border p-2 text-sm"/><button disabled={busy} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus size={15} className="mr-1 inline"/>Crear grupo</button></form>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"><div className="space-y-2"><h3 className="font-bold">Grupos registrados</h3>{busy&&!groups.length?<div className="p-6 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline animate-spin"/>Cargando…</div>:groups.length?groups.map(g=><button key={g.id} onClick={()=>setSelected(g.id)} className={"w-full rounded-xl border p-3 text-left "+(selected===g.id?"border-teal-600 bg-teal-50":"bg-white")}><div className="flex items-center justify-between gap-2"><b className="text-sm">{g.name}</b><span className="text-xs text-slate-500">{g.enrolledCount}/{g.capacity}</span></div><p className="mt-1 text-xs text-slate-500">Curso {g.courseId} · Coach {g.coachId} · {g.status}</p></button>):<p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">No hay grupos. Crea el primero arriba.</p>}</div>
    <div className="space-y-4"><div className="rounded-2xl border bg-white p-4"><div className="flex items-center gap-2 font-bold"><CalendarDays size={18}/> {selectedGroup?.name||"Selecciona un grupo"}</div><p className="mt-1 text-xs text-slate-500">{selectedGroup? `Cupo disponible: ${Math.max(0,selectedGroup.capacity-selectedGroup.enrolledCount)}`:""}</p><form onSubmit={createSession} className="mt-3 grid gap-2 md:grid-cols-2"><input required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="rounded-lg border p-2 text-sm"/><input required type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="rounded-lg border p-2 text-sm"/><input value={room} onChange={e=>setRoom(e.target.value)} placeholder="Sala (opcional)" className="rounded-lg border p-2 text-sm"/><button disabled={!selected||busy} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Programar sesión</button></form><div className="mt-4 space-y-2">{sessions.map(s=><div key={s.id} className="rounded-lg bg-slate-50 p-3 text-xs"><b>{new Date(s.startsAt).toLocaleString()}</b> – {new Date(s.endsAt).toLocaleTimeString()} · {s.room||"Online"} · {s.status}</div>)}{!sessions.length&&<p className="text-xs text-slate-500">Todavía no hay sesiones.</p>}</div></div>
    <div className="rounded-2xl border bg-white p-4"><h3 className="font-bold"><Users size={17} className="mr-2 inline"/>Matrículas del grupo</h3><form onSubmit={enroll} className="mt-3 flex gap-2"><input required value={studentId} onChange={e=>setStudentId(e.target.value)} placeholder="UID Firebase del alumno" className="min-w-0 flex-1 rounded-lg border p-2 text-sm"/><button disabled={!selected||busy} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white">Reservar cupo</button></form><div className="mt-3 space-y-2">{enrollments.map(e=><div key={e.userId} className="rounded-lg bg-slate-50 p-2 text-xs">{e.studentName||e.userId} · {e.status}</div>)}{!enrollments.length&&<p className="text-xs text-slate-500">No hay alumnos matriculados.</p>}</div></div></div></div>
  </section>;
}

export function AcademicPerformanceView() {
  const [groups,setGroups]=useState<Group[]>([]),[groupId,setGroupId]=useState(""),[sessions,setSessions]=useState<Session[]>([]),[enrollments,setEnrollments]=useState<Enrollment[]>([]),[performance,setPerformance]=useState<Performance[]>([]);
  const [sessionId,setSessionId]=useState(""),[studentId,setStudentId]=useState(""),[status,setStatus]=useState("present"),[type,setType]=useState("quiz"),[score,setScore]=useState(""),[maxScore,setMaxScore]=useState("100"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const load=useCallback(async()=>{try{const data=await api<{items:Group[]}>("/api/admin/groups");setGroups(data.items||[]);if(!groupId&&data.items?.[0])setGroupId(data.items[0].id);}catch(e:any){setError(e.message);}},[groupId]);
  const loadGroup=useCallback(async()=>{if(!groupId)return;try{const [s,e,p]=await Promise.all([api<{items:Session[]}>(`/api/admin/groups/${groupId}/sessions`),api<{items:Enrollment[]}>(`/api/admin/groups/${groupId}/enrollments`),api<{items:Performance[]}>(`/api/admin/groups/${groupId}/performance`)]);setSessions(s.items||[]);setEnrollments(e.items||[]);setPerformance(p.items||[]);if(!sessionId&&s.items?.[0])setSessionId(s.items[0].id);}catch(e:any){setError(e.message);}},[groupId,sessionId]);
  useEffect(()=>{void load();},[load]);useEffect(()=>{void loadGroup();},[loadGroup]);
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setBusy(true);setError("");setNotice("");try{if(type==="attendance"){await api(`/api/admin/sessions/${sessionId}/attendance`,"POST",{studentId,status});setNotice("Asistencia registrada.");}else{await api("/api/admin/assessments","POST",{studentId,groupId,type,score:Number(score),maxScore:Number(maxScore),weight:1});setNotice("Evaluación registrada.");}await loadGroup();}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  return <section className="space-y-4"><header><h2 className="text-xl font-black text-slate-900">Rendimiento y asistencia</h2><p className="text-sm text-slate-500">Registro de asistencia, evaluaciones y umbrales para finalizar matrículas.</p></header>{error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{notice&&<p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}<div className="rounded-2xl border bg-white p-4"><label className="block text-xs font-semibold">Grupo<select value={groupId} onChange={e=>{setGroupId(e.target.value);setSessionId("");}} className="mt-1 w-full rounded-lg border p-2 text-sm">{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><form onSubmit={submit} className="mt-4 grid gap-2 md:grid-cols-3"><select value={type} onChange={e=>setType(e.target.value)} className="rounded-lg border p-2 text-sm"><option value="attendance">Asistencia</option><option value="quiz">Quiz</option><option value="exam">Examen</option><option value="project">Proyecto</option><option value="participation">Participación</option></select><select required value={studentId} onChange={e=>setStudentId(e.target.value)} className="rounded-lg border p-2 text-sm"><option value="">Seleccionar alumno</option>{enrollments.map(e=><option key={e.userId} value={e.userId}>{e.studentName||e.userId}</option>)}</select>{type==="attendance"?<><select required value={sessionId} onChange={e=>setSessionId(e.target.value)} className="rounded-lg border p-2 text-sm">{sessions.map(s=><option key={s.id} value={s.id}>{new Date(s.startsAt).toLocaleString()} · {s.status}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border p-2 text-sm"><option value="present">Presente</option><option value="absent">Ausente</option><option value="late">Tardanza</option><option value="excused">Justificado</option></select></>:<><input required type="number" min="0" value={score} onChange={e=>setScore(e.target.value)} placeholder="Nota obtenida" className="rounded-lg border p-2 text-sm"/><input required type="number" min="1" value={maxScore} onChange={e=>setMaxScore(e.target.value)} placeholder="Nota máxima" className="rounded-lg border p-2 text-sm"/></>}<button disabled={busy||!groupId||!studentId} className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><ClipboardCheck size={15} className="mr-1 inline"/>Guardar</button></form></div><div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Alumno UID</th><th className="p-3">Asistencia</th><th className="p-3">Promedio</th><th className="p-3">Último cálculo</th></tr></thead><tbody className="divide-y">{performance.map(p=><tr key={p.studentId}><td className="p-3">{p.studentId}</td><td className="p-3">{Number(p.attendancePct).toFixed(1)} %</td><td className="p-3">{Number(p.avgScorePct).toFixed(1)} %</td><td className="p-3 text-xs text-slate-500">{p.lastCalculatedAt?new Date(p.lastCalculatedAt).toLocaleString():"—"}</td></tr>)}{!performance.length&&<tr><td colSpan={4} className="p-8 text-center text-sm text-slate-500">Todavía no hay métricas. Registra asistencia o evaluaciones.</td></tr>}</tbody></table></div></section>;
}
