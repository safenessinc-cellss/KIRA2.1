import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Award, BadgeCheck, CalendarDays, CheckCircle2, Clock3, ShieldCheck, XCircle, AlertTriangle } from 'lucide-react';

interface VerificationResult {
  valid?: boolean;
  status?: string;
  certificate?: {
    studentName?: string;
    courseName?: string;
    courseTitle?: string;
    coachName?: string;
    academicHours?: number;
    hours?: number;
    issueDate?: string;
    issuedAt?: string;
    kiraNumber?: string;
    certificateNumber?: string;
  } | null;
}

export default function CertificateValidation() {
  const { code = '' } = useParams();
  const location = useLocation();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setResult(null);
    const params = new URLSearchParams(location.search);
    const signature = params.get('sig') || '';
    const legacy = location.pathname.startsWith('/validar-certificado/') && /^[a-f0-9]{48}$/.test(code);
    const endpoint = legacy
      ? '/api/certificates/validate/' + encodeURIComponent(code)
      : '/api/verify/' + encodeURIComponent(code) + '?sig=' + encodeURIComponent(signature);

    fetch(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok && response.status !== 404) throw new Error(data.error || 'Servicio de validación temporalmente no disponible.');
        return data as VerificationResult;
      })
      .then(data => { if (active) setResult(data); })
      .catch(error => {
        console.error('Certificate verification error', error);
        if (active) setResult({ valid: false, status: 'unavailable' });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code, location.pathname, location.search]);

  const certificate = result?.certificate;
  const isRevoked = result?.status === 'revoked';
  const isValid = result?.valid === true && !isRevoked;
  const issueDate = useMemo(() => {
    const raw = certificate?.issueDate || certificate?.issuedAt;
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [certificate?.issueDate, certificate?.issuedAt]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <header className="border-b border-slate-100 bg-white px-6 py-8 text-center sm:px-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-800"><ShieldCheck size={30}/></div>
          <p className="mt-4 text-2xl font-black tracking-[.16em] text-slate-900">KIRA COACH</p>
          <p className="mt-2 text-[10px] font-bold tracking-[.24em] text-slate-400">SAFENESS.INC · CENTRO DE VALIDACIÓN</p>
        </header>

        <div className="px-6 py-8 sm:px-10">
          {loading ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500"><Clock3 className="animate-pulse text-teal-700" size={30}/><p className="text-sm font-semibold">Verificando la firma criptográfica…</p></div> : isValid && certificate ? (
            <>
              <div className="flex flex-col items-center text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black tracking-wide text-emerald-800"><CheckCircle2 size={17}/> CERTIFICADO VÁLIDO Y AUTÉNTICO</span>
                <Award size={48} className="mt-7 text-teal-700"/>
                <p className="mt-4 text-xs font-bold uppercase tracking-[.2em] text-slate-400">Se certifica que</p>
                <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">{certificate.studentName || 'Estudiante'}</h1>
                <p className="mt-5 text-sm text-slate-500">Ha completado satisfactoriamente el programa</p>
                <h2 className="mt-2 text-xl font-bold text-teal-800 sm:text-2xl">{certificate.courseName || certificate.courseTitle || 'Programa certificado'}</h2>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-5 text-center sm:grid-cols-3">
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Coach responsable</p><p className="mt-2 text-sm font-semibold text-slate-800">{certificate.coachName || 'SAFENESS.INC'}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Carga horaria</p><p className="mt-2 text-sm font-semibold text-slate-800">{certificate.academicHours ?? certificate.hours ?? '—'} {certificate.academicHours || certificate.hours ? 'horas' : ''}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha de emisión</p><p className="mt-2 text-sm font-semibold text-slate-800">{issueDate ? issueDate.toLocaleDateString('es-ES') : 'No disponible'}</p></div>
              </div>
              <div className="mt-5 flex flex-col items-center gap-2 text-center">
                <p className="font-mono text-sm font-bold text-slate-800">{certificate.kiraNumber || certificate.certificateNumber || code}</p>
                <p className="inline-flex items-center gap-2 text-xs text-emerald-700"><BadgeCheck size={14}/> Firma HMAC-SHA256 verificada por SAFENESS.INC</p>
              </div>
            </>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              {isRevoked ? <AlertTriangle size={48} className="text-rose-600"/> : <XCircle size={48} className="text-rose-500"/>}
              <h1 className="mt-4 text-xl font-black text-slate-900">{isRevoked ? 'CERTIFICADO REVOCADO' : result?.status === 'invalid_signature' ? 'Firma criptográfica no válida' : result?.status === 'unavailable' ? 'Validación temporalmente no disponible' : 'Certificado no encontrado'}</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{isRevoked ? 'Este certificado fue revocado y ya no acredita una certificación vigente.' : result?.status === 'unavailable' ? 'No fue posible consultar el registro en este momento. Intenta nuevamente más tarde.' : 'El código o la firma no coinciden con un certificado auténtico emitido por SAFENESS.INC.'}</p>
            </div>
          )}
        </div>
        <footer className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 text-center text-[11px] font-medium text-slate-500"><ShieldCheck size={14}/> Validación pública · Registro institucional SAFENESS.INC</footer>
      </section>
    </main>
  );
}
