import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { Award, FileCheck2, FileText, Loader2, ShieldCheck, UploadCloud } from 'lucide-react';

type Row = { id: string; [key: string]: any };
const PRIVATE_PREFIX = 'certificates/private/';
export function CertificateManagementView() {
  const [students, setStudents] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [coaches, setCoaches] = useState<Row[]>([]);
  const [enrollments, setEnrollments] = useState<Row[]>([]);
  const [certificates, setCertificates] = useState<Row[]>([]);
  const [requests, setRequests] = useState<Row[]>([]);
  const [branding, setBranding] = useState<any>({});
  const [previewAssets, setPreviewAssets] = useState<any>(null);
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isSuperAdmin = auth.currentUser?.email?.toLowerCase() === 'safeness.c.a@gmail.com' && auth.currentUser?.emailVerified === true;

  useEffect(() => {
    let alive = true;
    Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'courses')),
      getDocs(collection(db, 'enrollments')),
      getDocs(collection(db, 'settings'))
    ]).then(([u,c,e,s]) => {
      if (!alive) return;
      const userRows: Row[] = u.docs.map(d => ({ id:d.id, ...d.data() } as Row));
      setStudents(userRows.filter(x => x.role === 'alumno'));
      setCoaches(userRows.filter(x => x.role === 'coach' && x.approvalStatus === 'approved'));
      setCourses(c.docs.map(d => ({ id:d.id, ...d.data() } as Row)).filter(x => x.status === 'published'));
      setEnrollments(e.docs.map(d => ({ id:d.id, ...d.data() } as Row)));
      const settings = s.docs.find(d => d.id === 'certificateBranding');
      if (settings) setBranding(settings.data());
    }).catch(e => setError(e?.message || 'No se pudieron cargar los datos de KIRA.'));
    return () => { alive = false; };
  }, []);
  useEffect(() => onSnapshot(collection(db,'certificates'), snap => {
    setCertificates(snap.docs.map(d => ({ id:d.id, ...d.data() } as Row)).sort((a,b) => String(b.issueDate || '').localeCompare(String(a.issueDate || ''))));
  }, e => setError(e?.message || 'No se pudo cargar el registro de certificados.')), []);
  useEffect(() => onSnapshot(collection(db,'certificateRequests'), snap => {
    setRequests(snap.docs.map(d => ({id:d.id,...d.data()} as Row)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))));
  }, e => setError(e?.message || 'No se pudieron cargar las solicitudes.')), []);
  const selectRequest = (request:Row) => {
    setStudentId(String(request.userId||''));
    setCourseId(String(request.courseId||''));
    setEnrollmentId(String(request.enrollmentId||''));
    setMessage('Solicitud '+request.id+' seleccionada. Revisa los datos y emite cuando los activos estén configurados.');
  };
  const selectedEnrollment = useMemo(() => enrollments.find(e => e.id === enrollmentId), [enrollments,enrollmentId]);
  const eligibleEnrollments = useMemo(() => enrollments.filter(e => e.userId === studentId && e.courseId === courseId && (e.courseCompleted === true || e.completed === true || Number(e.progress) >= 100)), [enrollments,studentId,courseId]);
  useEffect(() => {
    if (!eligibleEnrollments.some(e => e.id === enrollmentId)) setEnrollmentId(eligibleEnrollments[0]?.id || '');
  }, [eligibleEnrollments,enrollmentId]);
  useEffect(() => {
    const course = courses.find(c => c.id === courseId);
    if (course) { setCoachId(String(course.coachId || '')); setHours(String(course.hours || course.durationHours || '')); }
  }, [courseId,courses]);

  const uploadAsset = async (kind: 'logo'|'admin'|'coach', file?: File) => {
    if (!file || !auth.currentUser) return;
    if (file.type !== 'image/png' || file.size > 2*1024*1024) { setError('Usa un archivo PNG de hasta 2 MB.'); return; }
    if (kind === 'coach' && !coachId) { setError('Selecciona primero el coach.'); return; }
    setUploading(kind); setError(''); setMessage('');
    try {
      const path = kind === 'logo' ? PRIVATE_PREFIX+'branding/kira-logo.png' : kind === 'admin' ? PRIVATE_PREFIX+'signatures/superadmin.png' : PRIVATE_PREFIX+'signatures/coaches/'+coachId+'.png';
      await uploadBytes(ref(storage,path),file,{contentType:'image/png',customMetadata:{ownerUid:auth.currentUser.uid,assetType:'certificate-'+kind}});
      const next = {...branding, ...(kind === 'logo' ? {logoStoragePath:path} : kind === 'admin' ? {adminSignatureStoragePath:path} : {coachSignaturePaths:{...(branding.coachSignaturePaths || {}),[coachId]:path}}), updatedAt:new Date().toISOString()};
      await setDoc(doc(db,'settings','certificateBranding'),next,{merge:true});
      setBranding(next); setMessage('Archivo institucional guardado en almacenamiento privado.');
    } catch(e:any) { setError(e?.message || 'No se pudo guardar el archivo.'); }
    finally { setUploading(''); }
  };
  const issue = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (!isSuperAdmin) { setError('Solo el superadministrador verificado puede emitir certificados.'); return; }
    if (!studentId || !courseId || !coachId || !enrollmentId || !Number.isInteger(Number(hours)) || Number(hours)<1 || Number(hours)>999) { setError('Completa alumno, curso, matrícula finalizada, coach y horas (1–999).'); return; }
    setBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/certificates',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({studentId,courseId,coachId,enrollmentId,academicHours:Number(hours),notes:notes.trim()})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No fue posible emitir el certificado.');
      setMessage('Certificado emitido: '+result.kiraNumber+' · PDF seguro disponible para el alumno y administración.');
      setNotes('');
      if (result.pdfUrl) window.open(result.pdfUrl,'_blank','noopener,noreferrer');
    } catch(e:any) { setError(e?.message || 'No se pudo emitir el certificado.'); }
    finally { setBusy(false); }
  };
  const revoke = async (kiraNumber:string) => {
    if (!isSuperAdmin || !window.confirm('¿Revocar definitivamente el certificado '+kiraNumber+'?')) return;
    try {
      const token=await auth.currentUser?.getIdToken();
      const response=await fetch('/api/certificates/'+encodeURIComponent(kiraNumber)+'/revoke',{method:'POST',headers:{Authorization:'Bearer '+token}});
      const data=await response.json(); if(!response.ok) throw new Error(data.error||'No se pudo revocar.');
      setMessage('Certificado '+kiraNumber+' revocado. La página pública mostrará el estado revocado.');
    } catch(e:any) { setError(e?.message||'No se pudo revocar el certificado.'); }
  };
  useEffect(() => {
    let alive=true;
    setPreviewAssets(null);
    if(!coachId || !branding.logoStoragePath || !branding.adminSignatureStoragePath || !branding.coachSignaturePaths?.[coachId]) return;
    (async()=>{
      try{
        const token=await auth.currentUser?.getIdToken();
        const response=await fetch('/api/certificates/preview-assets?coachId='+encodeURIComponent(coachId),{headers:{Authorization:'Bearer '+token}});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||'No se pudieron cargar los activos.');
        if(alive)setPreviewAssets(data);
      }catch(e:any){if(alive)setError(e?.message||'No se pudo preparar la vista previa.');}
    })();
    return ()=>{alive=false;};
  },[coachId,branding.logoStoragePath,branding.adminSignatureStoragePath,branding.coachSignaturePaths]);
  const selectedStudent = students.find(x => x.id === studentId);
  const selectedCourse = courses.find(x => x.id === courseId);
  const selectedCoach = coaches.find(x => x.id === coachId);
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-teal-50 p-3 text-teal-700"><Award size={24}/></div><div><h2 className="text-xl font-black text-slate-900">Emisión y verificación de certificados</h2><p className="mt-1 text-sm text-slate-500">Registro real en Firestore, PDF A4 horizontal, marca de agua y QR firmado por el servidor.</p></div></div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Emitidos: {certificates.length}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Firma HMAC-SHA256</span><span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">QR validado en servidor</span></div>
    </section>
    {!isSuperAdmin && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">La emisión está reservada al superadministrador verificado.</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><UploadCloud size={18}/> Activos institucionales privados</h3>
      <p className="mb-3 text-xs text-slate-500">PNG, máximo 2 MB. Los archivos se guardan en Storage privado; nunca se publica una URL de firma.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="rounded-xl border border-dashed border-slate-300 p-3 text-sm"><span className="block font-semibold">Logo KIRA</span><span className="text-xs text-slate-500">{branding.logoStoragePath ? 'Configurado' : 'Requerido'}</span><input className="mt-2 block w-full text-xs" type="file" accept="image/png" disabled={!isSuperAdmin || !!uploading} onChange={e=>uploadAsset('logo',e.target.files?.[0])}/></label>
        <label className="rounded-xl border border-dashed border-slate-300 p-3 text-sm"><span className="block font-semibold">Firma superadministrador</span><span className="text-xs text-slate-500">{branding.adminSignatureStoragePath ? 'Configurada' : 'Requerida'}</span><input className="mt-2 block w-full text-xs" type="file" accept="image/png" disabled={!isSuperAdmin || !!uploading} onChange={e=>uploadAsset('admin',e.target.files?.[0])}/></label>
        <label className="rounded-xl border border-dashed border-slate-300 p-3 text-sm"><span className="block font-semibold">Firma del coach seleccionado</span><span className="text-xs text-slate-500">{branding.coachSignaturePaths?.[coachId] ? 'Configurada' : 'Requerida'}</span><input className="mt-2 block w-full text-xs" type="file" accept="image/png" disabled={!isSuperAdmin || !coachId || !!uploading} onChange={e=>uploadAsset('coach',e.target.files?.[0])}/></label>
      </div>
      {uploading && <p className="mt-2 text-xs text-teal-700">Guardando {uploading}…</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-bold text-slate-900">Solicitudes de certificados</h3>
      {requests.length===0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Todavía no hay solicitudes.</p> : <div className="space-y-2">{requests.map(r=><button key={r.id} type="button" onClick={()=>selectRequest(r)} className="flex w-full flex-col gap-1 rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-500 hover:bg-teal-50/40 sm:flex-row sm:items-center sm:justify-between"><span><strong className="block text-sm text-slate-800">{r.courseTitle||r.courseName||r.courseId}</strong><span className="text-xs text-slate-500">Alumno: {r.studentName||r.userName||r.userId} · {r.hours||r.courseHours||'horas por validar'}</span></span><span className="text-xs font-semibold text-teal-700">{r.status||'pending'} · Cargar en formulario</span></button>)}</div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-bold text-slate-900">Vista previa A4 horizontal · 297 × 210 mm</h3>
      {previewAssets ? <div className="relative mx-auto aspect-[297/210] w-full max-w-5xl overflow-hidden border-[5px] border-double border-[#a68b52] bg-[#faf9f6] p-[3%] shadow-inner">
        <img src={previewAssets.logo} alt="Logo KIRA" className="absolute left-[5%] top-[5%] h-[11%] max-w-[15%] object-contain"/>
        <img src={previewAssets.logo} alt="" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[55%] w-[42%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.10]"/>
        <div className="relative flex h-full flex-col items-center justify-between text-center text-slate-700">
          <div className="pt-[1%]"><p className="font-serif text-[clamp(10px,1.7vw,19px)] tracking-[0.22em] text-slate-800">KIRA COACH</p><h4 className="mt-2 font-serif text-[clamp(12px,2.4vw,25px)] font-bold tracking-wide">CERTIFICADO DE CONCLUSIÓN</h4></div>
          <div className="w-[82%]"><p className="text-[clamp(8px,1vw,12px)]">Se certifica que</p><p className="mt-1 break-words font-serif text-[clamp(16px,3vw,32px)] text-teal-900">{selectedStudent?.displayName || selectedStudent?.name || 'Nombre completo del alumno'}</p><p className="mt-2 text-[clamp(8px,1vw,12px)]">ha concluido satisfactoriamente el curso</p><p className="mt-1 break-words text-[clamp(11px,1.8vw,20px)] font-bold text-teal-900">{selectedCourse?.title || selectedCourse?.name || 'Nombre del curso'}</p><p className="mt-1 text-[clamp(8px,1vw,12px)]">{hours || '—'} horas académicas · Coach: {selectedCoach?.displayName || selectedCoach?.name || 'Coach'}</p></div>
          <div className="grid w-full grid-cols-[1fr_1fr_auto] items-end gap-2 px-[3%] text-[clamp(6px,0.8vw,10px)]">
            <div className="text-center"><img src={previewAssets.adminSignature} alt="Firma superadministrador" className="mx-auto h-[clamp(18px,4vw,38px)] max-w-[85%] object-contain"/><div className="border-t border-slate-400 pt-1 font-bold">EMISOR AUTORIZADO</div><div>Superadministrador KIRA</div></div>
            <div className="text-center"><img src={previewAssets.coachSignature} alt="Firma del coach" className="mx-auto h-[clamp(18px,4vw,38px)] max-w-[85%] object-contain"/><div className="border-t border-slate-400 pt-1 font-bold">COACH RESPONSABLE</div><div>KIRA COACH</div></div>
            <div className="flex flex-col items-center justify-end"><div className="flex h-[clamp(34px,7vw,66px)] w-[clamp(34px,7vw,66px)] items-center justify-center border border-dashed border-slate-400 p-1 text-center text-[7px] text-slate-500">QR firmado al emitir</div></div>
          </div>
          <div className="text-[clamp(6px,0.8vw,10px)] text-slate-500">Fecha de emisión: se asigna al emitir · Verificación pública mediante QR · Creado por SAFENESS.INC</div>
        </div>
      </div> : <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Carga el logo institucional y las dos firmas privadas, y selecciona un coach para generar la vista previa real.</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900"><FileCheck2 size={19}/> Emitir nuevo certificado</h3>
      <p className="mb-4 text-xs text-slate-500">Solo permite matrículas concluidas y datos comprobados en Firebase. La fecha y el número se asignan en el servidor.</p>
      <form onSubmit={issue} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Alumno<select required value={studentId} onChange={e=>{setStudentId(e.target.value);setEnrollmentId('');setCourseId('');}} className="mt-1 w-full rounded-xl border border-slate-300 p-3"><option value="">Seleccionar alumno</option>{students.map(s=><option key={s.id} value={s.id}>{s.displayName || s.name || s.email || s.id}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Curso<select required value={courseId} onChange={e=>setCourseId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"><option value="">Seleccionar curso</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title || c.name || c.id}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Coach responsable<input readOnly value={selectedCoach?.displayName || selectedCoach?.name || (coachId ? coachId : '')} placeholder="Se obtiene del curso" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3"/></label>
        <label className="text-sm font-semibold text-slate-700">Matrícula concluida<select required value={enrollmentId} onChange={e=>setEnrollmentId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"><option value="">Seleccionar finalización</option>{eligibleEnrollments.map(x=><option key={x.id} value={x.id}>{x.id} · {x.progress || 100}%</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">Horas académicas (1–999)<input required type="number" min="1" max="999" value={hours} onChange={e=>setHours(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"/></label>
        <label className="text-sm font-semibold text-slate-700">Fecha de emisión<input readOnly value="Se asigna al emitir (servidor)" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3"/></label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">Observaciones internas (no se imprimen)<textarea rows={2} maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 p-3"/></label>
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><span>Alumno: {selectedStudent?.displayName || selectedStudent?.name || '—'} · Curso: {selectedCourse?.title || '—'} · Coach: {selectedCoach?.displayName || selectedCoach?.name || '—'}</span><button disabled={!isSuperAdmin || busy || !branding.logoStoragePath || !branding.adminSignatureStoragePath || !branding.coachSignaturePaths?.[coachId]} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? <Loader2 className="animate-spin" size={16}/> : <ShieldCheck size={16}/>} {busy ? 'Emitiendo…' : 'Emitir certificado'}</button></div>
      </form>
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {selectedEnrollment && <p className="mt-2 text-xs text-slate-400">Matrícula verificada: {selectedEnrollment.id}</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><FileText size={18}/> Registro de certificados</h3>{certificates.length===0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">Todavía no hay solicitudes.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">N.º KIRA</th><th className="p-2">Alumno</th><th className="p-2">Curso</th><th className="p-2">Fecha</th><th className="p-2">Estado</th></tr></thead><tbody>{certificates.map(c=><tr key={c.id} className="border-b last:border-0"><td className="p-2 font-mono text-xs">{c.kiraNumber || c.certificateNumber || c.id}</td><td className="p-2">{c.studentName}</td><td className="p-2">{c.courseName || c.courseTitle}</td><td className="p-2">{c.issueDate ? new Date(c.issueDate).toLocaleDateString() : c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : '—'}</td><td className="p-2"><span className={c.status==='revoked'?'text-rose-700':'text-emerald-700'}>{c.status}</span>{c.status==='issued' && <button type="button" onClick={()=>revoke(c.kiraNumber||c.id)} className="ml-2 rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700">Revocar</button>}</td></tr>)}</tbody></table></div>}</section>
  </div>;
}
