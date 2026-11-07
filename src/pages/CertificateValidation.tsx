import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Award, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';

export default function CertificateValidation() {
  const { code = '' } = useParams();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch('/api/certificates/validate/' + encodeURIComponent(code))
      .then(response => response.json())
      .then(result => { if (active) setCertificate(result.valid ? result.certificate : null); })
      .catch(error => console.error('Certificate validation error', error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code]);
  const date = certificate?.issuedAt?.toDate ? certificate.issuedAt.toDate() : certificate?.issuedAt ? new Date(certificate.issuedAt) : null;
  return <main className="min-h-screen bg-slate-50 px-4 py-10 flex items-center justify-center">
    <section className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-10">
      <div className="text-center border-b border-slate-100 pb-6">
        <div className="text-2xl font-black tracking-[.2em] text-teal-800">KIRA COACH</div>
        <div className="text-xs tracking-[.25em] text-slate-400 mt-2">CENTRO DE VALIDACIÓN DE CERTIFICADOS</div>
      </div>
      {loading ? <div className="py-16 text-center text-slate-500">Verificando credencial…</div> : certificate ? <>
        <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold mt-7"><CheckCircle2 size={22}/> CERTIFICADO AUTÉNTICO Y VIGENTE</div>
        <div className="text-center py-8">
          <Award size={42} className="mx-auto text-teal-600 mb-4"/>
          <p className="text-xs uppercase tracking-widest text-slate-400">Se certifica que</p>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3">{certificate.studentName}</h1>
          <p className="text-slate-500 mt-5">Concluyó satisfactoriamente el curso</p>
          <h2 className="text-xl sm:text-2xl font-bold text-teal-800 mt-2">{certificate.courseTitle}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 rounded-2xl p-5 text-center">
          <div><div className="text-xs text-slate-400 uppercase">Coach</div><div className="font-semibold text-slate-800 mt-1">{certificate.coachName}</div></div>
          <div><div className="text-xs text-slate-400 uppercase">Carga horaria</div><div className="font-semibold text-slate-800 mt-1">{certificate.hours} horas</div></div>
          <div><div className="text-xs text-slate-400 uppercase">Fecha de emisión</div><div className="font-semibold text-slate-800 mt-1">{date ? date.toLocaleDateString() : 'No disponible'}</div></div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-5 items-center justify-between">
          <div className="text-sm text-slate-500"><div className="font-bold text-slate-800">{certificate.certificateNumber}</div><div>Emitido por {certificate.issuerName}</div><div className="mt-1 text-xs">Registro institucional electrónico KIRA COACH</div></div>
          <img className="w-28 h-28 border border-slate-200 rounded-xl p-1" alt="QR de validación" src={'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(window.location.href)}/>
        </div>
        <button onClick={() => window.print()} className="mt-8 w-full py-3 rounded-xl bg-teal-700 text-white font-bold print:hidden">Imprimir / Guardar como PDF</button>
      </> : <div className="py-16 text-center"><XCircle size={42} className="mx-auto text-rose-500 mb-4"/><h1 className="text-xl font-bold text-slate-900">Certificado no encontrado</h1><p className="text-slate-500 mt-2">El código no existe o la credencial no está emitida.</p></div>}
      <div className="mt-8 pt-5 border-t border-slate-100 text-center text-xs text-slate-400 flex items-center justify-center gap-2"><ShieldCheck size={14}/> Validación pública de KIRA COACH · SAFENESS.INC</div>
    </section>
  </main>;
}
