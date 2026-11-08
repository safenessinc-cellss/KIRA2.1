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
  const [branding, setBranding] = useState<any>({});
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
      const userRows = u.docs.map(d => ({ id:d.id, ...d.data() }));
      setStudents(userRows.filter(x => x.role === 'alumno'));
      setCoaches(userRows.filter(x => x.role === 'coach' && x.approvalStatus === 'approved'));
      setCourses(c.docs.map(d => ({ id:d.id, ...d.data() })).filter(x => x.status === 'published'));
      setEnrollments(e.docs.map(d => ({ id:d.id, ...d.data() })));
      const settings = s.docs.find(d => d.id === 'certificateBranding');
      if (settings) setBranding(settings.data());
    }).catch(e => setError(e?.message || 'No se pudieron cargar los datos de KIRA.'));
    return () => { alive = false; };
  }, []);
  useEffect(() => onSnapshot(collection(db,'certificates'), snap => {
    setCertificates(snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => String(b.issueDate || '').localeCompare(String(a.issueDate || ''))));
  }, e => setError(e?.message || 'No se pudo cargar el registro de certificados.')), []);
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900"><FileText size={18}/> Registro de certificados</h3>{certificates.length===0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">Todavía no hay solicitudes.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-400"><th className="p-2">N.º KIRA</th><th className="p-2">Alumno</th><th className="p-2">Curso</th><th className="p-2">Fecha</th><th className="p-2">Estado</th></tr></thead><tbody>{certificates.map(c=><tr key={c.id} className="border-b last:border-0"><td className="p-2 font-mono text-xs">{c.kiraNumber || c.certificateNumber || c.id}</td><td className="p-2">{c.studentName}</td><td className="p-2">{c.courseName || c.courseTitle}</td><td className="p-2">{c.issueDate ? new Date(c.issueDate).toLocaleDateString() : c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : '—'}</td><td className="p-2"><span className={c.status==='revoked'?'text-rose-700':'text-emerald-700'}>{c.status}</span></td></tr>)}</tbody></table></div>}</section>
  </div>;
}
