import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Award, CheckCircle2, ShieldCheck, XCircle, AlertTriangle } from 'lucide-react';

export default function CertificateValidation() {
  const { code = '' } = useParams();
  const location = useLocation();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(location.search);
    const signature = params.get('sig') || '';
    fetch('/api/verify/' + encodeURIComponent(code) + '?sig=' + encodeURIComponent(signature))
      .then(async response => ({ ok: response.ok, data: await response.json() }))
      .then(({data}) => { if (active) setResult(data); })
      .catch(error => { console.error('Certificate verification error', error); if (active) setResult({valid:false,status:'unavailable'}); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code, location.search]);
  const certificate = result?.certificate;
  const date = certificate?.issueDate ? new Date(certificate.issueDate) : null;
  const revoked = result?.status === 'revoked';
  return <main className="min-h-screen bg-slate-50 px-4 py-10 flex items-center justify-center">
    <section className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-10">
      <div className="text-center border-b border-slate-100 pb-6">
        <div className="text-2xl font-black tracking-[.2em] text-teal-800">KIRA COACH</div>
        <div className="text-xs tracking-[.25em] text-slate-400 mt-2">CENTRO DE VALIDACIÓN DE CERTIFICADOS</div>
      </div>
      {loading ? <div className="py-16 text-center text-slate-500">Verificando firma criptográfica…</div> : certificate ? <>
        <div className={'flex items-center justify-center gap-2 font-bold mt-7 '+(revoked?'text-rose-700':'text-emerald-700')}>{revoked?<><AlertTriangle size={22}/> CERTIFICADO REVOCADO</>:<><CheckCircle2 size={22}/> CERTIFICADO AUTÉNTICO Y VIGENTE</>}</div>
        <div className="text-center py-8">
          <Award size={42} className="mx-auto text-teal-600 mb-4"/>
          <p className="text-xs uppercase tracking-widest text-slate-400">Se certifica que</p>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3">{certificate.studentName}</h1>
          <p className="text-slate-500 mt-5">Concluyó satisfactoriamente el curso</p>
          <h2 className="text-xl sm:text-2xl font-bold text-teal-800 mt-2">{certificate.courseName}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 rounded-2xl p-5 text-center">
          <div><div className="text-xs text-slate-400 uppercase">Coach</div><div className="font-semibold text-slate-800 mt-1">{certificate.coachName}</div></div>
          <div><div className="text-xs text-slate-400 uppercase">Carga horaria</div><div className="font-semibold text-slate-800 mt-1">{certificate.academicHours} horas</div></div>
          <div><div className="text-xs text-slate-400 uppercase">Fecha de emisión</div><div className="font-semibold text-slate-800 mt-1">{date ? date.toLocaleDateString('es-ES') : 'No disponible'}</div></div>
        </div>
        <div className="mt-6 text-center text-sm text-slate-500"><div className="font-bold text-slate-800">{certificate.kiraNumber}</div><div>Firma de verificación HMAC-SHA256: {result.valid ? 'válida' : 'no válida'}</div></div>
      </> : <div className="py-16 text-center"><XCircle size={42} className="mx-auto text-rose-500 mb-4"/><h1 className="text-xl font-bold text-slate-900">{result?.status==='invalid_signature'?'Firma de verificación inválida':'Certificado no encontrado'}</h1><p className="text-slate-500 mt-2">No fue posible confirmar la autenticidad de esta credencial.</p></div>}
      <div className="mt-8 pt-5 border-t border-slate-100 text-center text-xs text-slate-400 flex items-center justify-center gap-2"><ShieldCheck size={14}/> Verificación pública KIRA · Creado por SAFENESS.INC</div>
    </section>
  </main>;
}
