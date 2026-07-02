import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '../hooks/useToast';
import { 
  FileText, Award, Download, Printer, UserPlus, Trash2, Edit2, Check, X, 
  Search, Eye, Share2, Star, Calendar, RefreshCw, FileSpreadsheet, Layers, Image as ImageIcon, Loader2
} from 'lucide-react';

interface Certificate {
  id?: string;
  coachId: string;
  coachName: string;
  participantName: string;
  courseTitle: string;
  issueDate: string;
  serialNumber: string;
  logoUrl: string;
  watermarkText: string;
  createdAt?: any;
}

export default function CertificateGenerator() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  
  // States
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Form fields
  const [participantName, setParticipantName] = useState('');
  const [courseTitle, setCourseTitle] = useState('Máster en Liderazgo Consciente');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [logoUrl, setLogoUrl] = useState('KIRA COACH'); // Can be a text prefix or URL
  const [watermarkText, setWatermarkText] = useState('KIRA ECOSISTEMA DE BIENESTAR');
  const [serialNumber, setSerialNumber] = useState('');
  
  // Selection & UI control
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [editModeId, setEditModeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('Todos');

  const certificateRef = useRef<HTMLDivElement>(null);

  const coachName = user?.displayName || 'ROBERT TERÁN';

  // Available courses list
  const coursesList = [
    'Máster en Liderazgo Consciente',
    'Programa de Arteterapia y Sanación Emocional',
    'Taller de Respiración Consciente y Mindfulness',
    'Certificación en Coaching Ontológico del Ser',
    'Despertar Espiritual y Bienestar Holístico',
    'Sistemas de Gestión de Vida & ISO Personal'
  ];

  // Fetch certificates from Firestore
  const fetchCertificates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'certificates'), where('coachId', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certificate));
      // Sort by creation or serial number
      list.sort((a, b) => b.serialNumber.localeCompare(a.serialNumber));
      setCertificates(list);
      
      // Auto-generate the next serial number
      generateNextSerial(list);
    } catch (e: any) {
      console.error("Error fetching certificates:", e);
      // Fallback to local storage
      const local = localStorage.getItem(`certificates_${user.uid}`);
      if (local) {
        const parsed = JSON.parse(local);
        setCertificates(parsed);
        generateNextSerial(parsed);
      } else {
        setCertificates([]);
        generateNextSerial([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [user]);

  // Generate sequence number: KIRA-YYYY-XXXXX
  const generateNextSerial = (currentList: Certificate[], customDate?: string) => {
    const year = new Date(customDate || issueDate).getFullYear();
    const prefix = `KIRA-${year}-`;
    
    // Find highest serial number for this year
    const yearSerials = currentList
      .filter(c => c.serialNumber.startsWith(prefix))
      .map(c => {
        const parts = c.serialNumber.split('-');
        if (parts.length === 3) {
          const num = parseInt(parts[2], 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      });
      
    const maxNum = yearSerials.length > 0 ? Math.max(...yearSerials) : 0;
    const nextNum = String(maxNum + 1).padStart(5, '0');
    setSerialNumber(`${prefix}${nextNum}`);
  };

  // Recalculate serial if date changes
  useEffect(() => {
    generateNextSerial(certificates, issueDate);
  }, [issueDate, certificates]);

  // Handle Add/Edit Participant
  const handleSaveCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!participantName.trim()) {
      toastError("El nombre del participante es obligatorio");
      return;
    }

    setSaving(true);
    const certificateData: Certificate = {
      coachId: user.uid,
      coachName: coachName,
      participantName: participantName.trim(),
      courseTitle: courseTitle,
      issueDate: issueDate,
      serialNumber: serialNumber,
      logoUrl: logoUrl,
      watermarkText: watermarkText,
      createdAt: new Date().toISOString()
    };

    try {
      if (editModeId) {
        // Update existing
        await updateDoc(doc(db, 'certificates', editModeId), { ...certificateData });
        toastSuccess("Certificado actualizado con éxito");
        setEditModeId(null);
      } else {
        // Create new
        const docRef = await addDoc(collection(db, 'certificates'), certificateData);
        certificateData.id = docRef.id;
        toastSuccess("Certificado generado y guardado");
      }
      
      // Clean form
      setParticipantName('');
      
      // Refetch
      await fetchCertificates();
    } catch (err: any) {
      console.error("Error saving certificate:", err);
      // Local fallback saving
      const updatedList = [...certificates];
      if (editModeId) {
        const idx = updatedList.findIndex(c => c.id === editModeId);
        if (idx !== -1) {
          updatedList[idx] = { ...certificateData, id: editModeId };
        }
        setEditModeId(null);
      } else {
        certificateData.id = `local_${Date.now()}`;
        updatedList.push(certificateData);
      }
      localStorage.setItem(`certificates_${user.uid}`, JSON.stringify(updatedList));
      setCertificates(updatedList);
      setParticipantName('');
      generateNextSerial(updatedList);
      toastSuccess("Guardado en almacenamiento local (Sin conexión)");
    } finally {
      setSaving(false);
    }
  };

  // Delete certificate
  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este certificado?")) return;
    try {
      await deleteDoc(doc(db, 'certificates', id));
      toastSuccess("Certificado eliminado correctamente");
      fetchCertificates();
    } catch (e) {
      console.error("Error deleting:", e);
      const updated = certificates.filter(c => c.id !== id);
      localStorage.setItem(`certificates_${user?.uid}`, JSON.stringify(updated));
      setCertificates(updated);
      toastSuccess("Eliminado del almacenamiento local");
    }
  };

  // Populate form for editing
  const handleEdit = (cert: Certificate) => {
    setEditModeId(cert.id || null);
    setParticipantName(cert.participantName);
    setCourseTitle(cert.courseTitle);
    setIssueDate(cert.issueDate);
    setLogoUrl(cert.logoUrl);
    setWatermarkText(cert.watermarkText);
    setSerialNumber(cert.serialNumber);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Preview helper
  const handlePreview = (cert: Certificate) => {
    setSelectedCertificate(cert);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (certificates.length === 0) {
      toastError("No hay certificados para exportar");
      return;
    }
    
    const headers = ["Nº", "Participante", "Curso/Taller", "Fecha de Emisión", "Número de Serie", "Facilitador"];
    const rows = certificates.map((c, i) => [
      i + 1,
      c.participantName,
      c.courseTitle,
      c.issueDate,
      c.serialNumber,
      c.coachName
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kira_certificados_${coachName.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess("Lista de certificados exportada en CSV");
  };

  // Export PDF via html2canvas + jsPDF
  const handleDownloadPDF = async (cert: Certificate) => {
    const uniqueId = cert.id || 'preview';
    setDownloadingId(uniqueId);

    // Create temporary hidden container designed precisely with landscape dimensions for high quality print resolution
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '-9999px';
    element.style.width = '11in';
    element.style.height = '8.5in';
    element.innerHTML = generateCertificateHTML(cert);
    document.body.appendChild(element);

    try {
      // Load libraries dynamically at runtime
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = await import('jspdf');

      // Allow slight delay for custom fonts and images to load
      await new Promise((resolve) => setTimeout(resolve, 600));

      const canvas = await html2canvas(element, {
        scale: 2, // Retains high crisp premium resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#F0F4FA'
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: 'letter'
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 11, 8.5);
      pdf.save(`certificado_${cert.serialNumber}_${cert.participantName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
      
      document.body.removeChild(element);
      toastSuccess("PDF descargado correctamente");
    } catch (err: any) {
      console.error("PDF generation error:", err);
      if (document.body.contains(element)) {
        document.body.removeChild(element);
      }
      toastError("No se pudo exportar a PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  // Standard Web Printing
  const handlePrint = (cert: Certificate) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toastError("El navegador bloqueó la ventana de impresión. Por favor, habilita los popups.");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Certificado - ${cert.participantName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; }
              @page { size: letter landscape; margin: 0; }
            }
            .glow-star {
              filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
            }
          </style>
        </head>
        <body class="m-0 p-0 bg-white">
          ${generateCertificateHTML(cert)}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // High Fidelity Certificate HTML Generator
  const generateCertificateHTML = (cert: Certificate) => {
    const formattedDate = new Date(cert.issueDate + 'T00:00:00').toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const isLogoUrl = cert.logoUrl.startsWith('http://') || cert.logoUrl.startsWith('https://') || cert.logoUrl.startsWith('data:');

    return `
      <div class="relative w-[11in] h-[8.5in] flex flex-col justify-between p-12 bg-[#F0F4FA] text-[#142B44] font-sans border-[16px] border-[#142B44] overflow-hidden" style="box-sizing: border-box;">
        
        <!-- Elegant Inner Gold Border -->
        <div class="absolute inset-4 border border-[#C9A84C]/40 pointer-events-none rounded-lg"></div>
        <div class="absolute inset-6 border-2 border-[#C9A84C]/60 pointer-events-none rounded-lg"></div>

        <!-- Watermark Background -->
        <div class="absolute inset-0 flex items-center justify-center opacity-[0.06] select-none pointer-events-none z-0">
          <div class="text-center transform -rotate-12">
            <h1 class="text-7xl font-black tracking-widest leading-none mb-4 uppercase">${cert.watermarkText || 'KIRA ECOSYSTEM'}</h1>
            <h1 class="text-5xl font-extrabold tracking-widest uppercase">EXCELENCIA DE BIENESTAR</h1>
          </div>
        </div>

        <!-- Top Header & Logo Area -->
        <div class="relative z-10 flex flex-col items-center text-center mt-4">
          <div class="mb-4">
            ${isLogoUrl ? `
              <img src="${cert.logoUrl}" alt="Logo" class="h-14 object-contain" />
            ` : `
              <div class="flex items-center gap-2">
                <span class="text-2xl font-black tracking-tighter text-[#142B44]">${cert.logoUrl}</span>
                <span class="w-2.5 h-2.5 bg-[#C9A84C] rounded-full"></span>
                <span class="text-xs font-black tracking-widest text-[#2D527A] uppercase">Ecosistema de Bienestar</span>
              </div>
            `}
          </div>
          <h2 class="text-xs font-black tracking-[0.3em] text-[#C9A84C] uppercase mb-1">KIRA COACH CERTIFICATION SYSTEM</h2>
          <div class="w-16 h-[2px] bg-[#C9A84C]"></div>
        </div>

        <!-- Main Body -->
        <div class="relative z-10 flex flex-col items-center text-center px-16 my-auto">
          <h1 class="text-[38px] font-black tracking-[0.15em] text-[#142B44] uppercase mb-2" style="font-family: 'Inter', sans-serif;">
            CERTIFICADO DE PARTICIPACIÓN
          </h1>
          
          <!-- Sparkling validation stars with golden glow -->
          <div class="flex gap-2.5 mb-6 justify-center">
            <span class="text-2xl glow-star" style="color: #FFD700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.8)">★</span>
            <span class="text-2xl glow-star" style="color: #FFD700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.8)">★</span>
            <span class="text-2xl glow-star" style="color: #FFD700; text-shadow: 0 0 12px rgba(255, 215, 0, 0.9)">★</span>
            <span class="text-2xl glow-star" style="color: #FFD700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.8)">★</span>
            <span class="text-2xl glow-star" style="color: #FFD700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.8)">★</span>
          </div>

          <p class="text-[13px] text-[#2D527A] tracking-wider font-semibold uppercase mb-3">Concede con honor el presente reconocimiento a:</p>
          
          <!-- Participant Name with golden framed underlines -->
          <div class="w-full max-w-2xl py-2 px-6 border-b-4 border-double border-[#C9A84C] mb-5">
            <h2 class="text-4xl font-extrabold text-[#142B44] tracking-tight" style="font-family: 'Playfair Display', serif; font-style: italic;">
              ${cert.participantName}
            </h2>
          </div>

          <div class="max-w-2xl">
            <p class="text-sm text-[#2D527A] font-medium leading-relaxed">
              Por haber completado con éxito y demostrado excepcional dedicación académica y práctica en el taller de formación premium:
            </p>
            <h3 class="text-xl font-black text-[#142B44] tracking-tight mt-2 mb-4 italic">
              « ${cert.courseTitle} »
            </h3>
            <p class="text-xs text-[#2D527A] tracking-wide font-semibold uppercase">
              Emitido con fecha del ${formattedDate}
            </p>
          </div>
        </div>

        <!-- Footer Area (Signatures, Seals, & Serial Validation) -->
        <div class="relative z-10 grid grid-cols-3 items-end w-full px-12 mb-4">
          
          <!-- Left: Signature -->
          <div class="flex flex-col items-center">
            <div class="w-48 border-b border-[#2D527A]/40 mb-2"></div>
            <p class="text-xs font-black text-[#142B44] uppercase tracking-wider">${cert.coachName}</p>
            <p class="text-[10px] text-[#2D527A] font-bold uppercase tracking-widest">Facilitador · KIRA COACH</p>
          </div>

          <!-- Middle: Serial Number & Verification -->
          <div class="flex flex-col items-center">
            <div class="px-5 py-2 bg-[#142B44] text-[#FFFFFF] rounded-xl border border-[#C9A84C]/30 flex flex-col items-center gap-0.5">
              <span class="text-[9px] font-black text-[#C9A84C] tracking-[0.2em] uppercase">CÓDIGO DE VALIDACIÓN</span>
              <span class="text-xs font-mono font-black tracking-widest">${cert.serialNumber}</span>
            </div>
            <p class="text-[8px] text-[#2D527A] mt-1 font-bold uppercase tracking-widest">Verificación oficial KIRA.COACH</p>
          </div>

          <!-- Right: Official Seal -->
          <div class="flex flex-col items-center">
            <div class="w-14 h-14 rounded-full border-2 border-double border-[#C9A84C] flex items-center justify-center bg-white/80 shadow-md">
              <span class="text-2xl filter drop-shadow-sm">🏅</span>
            </div>
            <p class="text-[10px] text-[#C9A84C] font-black uppercase tracking-wider mt-2">SELLO DE EXCELENCIA</p>
          </div>

        </div>

      </div>
    `;
  };

  // Filtered certificates list
  const filteredCertificates = certificates.filter(c => {
    const matchesSearch = c.participantName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourseFilter === 'Todos' || c.courseTitle === selectedCourseFilter;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-slate-800">
      
      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Hand: Configurator Form */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/60 p-8 rounded-[32px] shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Award size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {editModeId ? 'Editar Certificado' : 'Nuevo Certificado'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Completa los campos para generar el documento de acreditación.</p>
              </div>
            </div>

            <form onSubmit={handleSaveCertificate} className="space-y-4">
              {/* Logo / Text Custom */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>Logo superior (Texto o URL de imagen)</span>
                  <span className="text-[10px] font-bold text-indigo-600 lowercase">ej: KIRA COACH</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <ImageIcon size={14} />
                  </span>
                  <input 
                    type="text" 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Escribe KIRA COACH o pega URL de imagen"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Participant Name */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Nombre completo del participante <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Ej: Ana María Silva"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition placeholder-slate-400"
                />
              </div>

              {/* Course Selector or custom */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Curso / Taller Realizado
                </label>
                <select 
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition mb-2"
                >
                  {coursesList.map((course, idx) => (
                    <option key={idx} value={course}>{course}</option>
                  ))}
                  <option value="custom">-- Escribir otro taller manualmente --</option>
                </select>
                
                {/* Fallback manual write option */}
                {courseTitle === 'custom' || !coursesList.includes(courseTitle) ? (
                  <input 
                    type="text" 
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Escribe el nombre del taller manualmente"
                    className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 transition placeholder-slate-400 mt-2"
                  />
                ) : null}
              </div>

              {/* Date & Watermark Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Fecha de Emisión
                  </label>
                  <input 
                    type="date" 
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Marca de agua fondo
                  </label>
                  <input 
                    type="text" 
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Ej: KIRA COACH"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Serial Number (Autogenerated & visual helper) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Número de serie (Autogenerado)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly
                    value={serialNumber}
                    className="flex-1 px-4 py-3 bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl text-sm font-mono font-bold cursor-not-allowed"
                  />
                  <button 
                    type="button"
                    onClick={() => generateNextSerial(certificates, issueDate)}
                    title="Regenerar correlativo"
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3">
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} /> {editModeId ? 'Actualizar Alumno' : 'Agregar participante'}
                    </>
                  )}
                </button>
                
                {editModeId && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditModeId(null);
                      setParticipantName('');
                      generateNextSerial(certificates);
                    }}
                    className="px-4 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Quick Realtime Preview Panel */}
          <div className="bg-slate-900 text-white p-6 rounded-[32px] border border-slate-800 shadow-sm">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Eye size={14} className="text-[#C9A84C]" /> Previsualización en Tiempo Real
            </h4>
            <div className="border border-white/10 rounded-2xl p-4 bg-slate-950/60 text-center flex flex-col items-center justify-center py-8">
              <p className="text-[10px] uppercase font-black tracking-widest text-[#C9A84C] mb-2">Diseño Seleccionado</p>
              <h5 className="font-extrabold text-lg line-clamp-1 mb-1">{participantName || 'Nombre del Alumno'}</h5>
              <p className="text-xs text-slate-400 line-clamp-1 mb-5">« {courseTitle} »</p>
              
              <button 
                onClick={() => handlePreview({
                  coachId: user?.uid || '',
                  coachName: coachName,
                  participantName: participantName || 'Ana María Silva',
                  courseTitle: courseTitle,
                  issueDate: issueDate,
                  serialNumber: serialNumber,
                  logoUrl: logoUrl,
                  watermarkText: watermarkText
                })}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
              >
                <Eye size={13} /> Ver Certificado Completo
              </button>
            </div>
          </div>
        </div>

        {/* Right Hand: Participants Table & Global Stats */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/90 border border-slate-200/60 p-6 rounded-3xl shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">TOTAL CERTIFICADOS</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{certificates.length}</span>
                <span className="text-xs font-semibold text-emerald-500">Emitidos</span>
              </div>
            </div>
            <div className="bg-white/90 border border-slate-200/60 p-6 rounded-3xl shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">FACILITADOR ACTIVO</span>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-black text-slate-900 line-clamp-1" title={coachName}>{coachName}</span>
              </div>
            </div>
            <div className="bg-white/90 border border-slate-200/60 p-6 rounded-3xl shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">SISTEMA VALIDACIÓN</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-mono font-black text-indigo-600">KIRA-YYYY-XXXXX</span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/60 p-8 rounded-[32px] shadow-sm flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Registro de Certificados</h3>
                <p className="text-xs text-slate-500 font-medium">Historial completo y exportación para auditoría de talleres.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportCSV}
                  className="px-4 py-2.5 bg-emerald-50 border border-emerald-200/60 text-emerald-700 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={14} /> Exportar CSV
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Search size={14} />
                </span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, curso o código..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <select 
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="Todos">Filtrar por Curso: Todos</option>
                {coursesList.map((course, idx) => (
                  <option key={idx} value={course}>{course}</option>
                ))}
              </select>
            </div>

            {/* Real Data Table */}
            <div className="flex-1 overflow-x-auto min-h-[300px]">
              {loading ? (
                <div className="h-full flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
              ) : filteredCertificates.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                  <Award size={48} className="text-slate-300 mb-3" />
                  <p className="text-sm font-black text-slate-500">Ningún participante encontrado</p>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">Crea tu primer certificado utilizando el panel izquierdo para poblar la lista.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-12 text-center">Nº</th>
                      <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Participante</th>
                      <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Curso / Taller</th>
                      <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-28">Fecha</th>
                      <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-36">Cód. Serie</th>
                      <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-28 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCertificates.map((cert, index) => (
                      <tr key={cert.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-3 text-xs font-black text-slate-400 text-center">{index + 1}</td>
                        <td className="py-3 px-3 text-xs font-black text-slate-900">{cert.participantName}</td>
                        <td className="py-3 px-3 text-xs font-bold text-slate-500 max-w-[200px] truncate">{cert.courseTitle}</td>
                        <td className="py-3 px-3 text-xs font-semibold text-slate-500">{cert.issueDate}</td>
                        <td className="py-3 px-3 text-xs font-mono font-bold text-indigo-600">{cert.serialNumber}</td>
                        <td className="py-3 px-3">
                          <div className="flex justify-center gap-1.5">
                            <button 
                              onClick={() => handlePreview(cert)}
                              title="Visualizar Certificado"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              onClick={() => handleEdit(cert)}
                              title="Editar datos"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(cert.id!)}
                              title="Eliminar"
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Total Registrados: {filteredCertificates.length} de {certificates.length}</span>
              <span>KIRA COACH OFFICIAL HUB</span>
            </div>
          </div>
        </div>

      </div>

      {/* FULL CERTIFICATE DISPLAY & ACTIONS MODAL */}
      {selectedCertificate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] w-full max-w-5xl shadow-2xl relative">
            
            {/* Modal Header & Actions Panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-white font-black text-lg flex items-center gap-2">
                  <Award className="text-[#C9A84C]" /> Certificado de {selectedCertificate.participantName}
                </h4>
                <p className="text-xs text-slate-400 font-medium">Comprobante de autenticidad: {selectedCertificate.serialNumber}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleDownloadPDF(selectedCertificate)}
                  disabled={downloadingId === (selectedCertificate.id || 'preview')}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {downloadingId === (selectedCertificate.id || 'preview') ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Procesando...
                    </>
                  ) : (
                    <>
                      <Download size={14} /> Descargar PDF
                    </>
                  )}
                </button>
                <button 
                  onClick={() => handlePrint(selectedCertificate)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} /> Imprimir
                </button>
                <button 
                  onClick={() => setSelectedCertificate(null)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* High Fidelity Certificate Interactive Viewer (Rendered exactly inside page for absolute design preview) */}
            <div className="w-full overflow-x-auto p-4 bg-slate-950 rounded-2xl shadow-inner flex justify-center">
              <div 
                ref={certificateRef}
                className="transform scale-75 sm:scale-90 md:scale-100 origin-center shrink-0 shadow-2xl border animate-in zoom-in-95 duration-300"
                style={{ width: '11in', height: '8.5in' }}
                dangerouslySetInnerHTML={{ __html: generateCertificateHTML(selectedCertificate) }}
              />
            </div>

            {/* Technical Verification Details */}
            <div className="mt-6 p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span>Firma autorizada por: <strong>{selectedCertificate.coachName}</strong></span>
              </div>
              <div>
                <span>Este certificado se puede verificar escaneando el código de validación único en la base de datos de KIRA COACH.</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
