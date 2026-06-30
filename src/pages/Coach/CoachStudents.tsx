// src/pages/coach/CoachStudents.tsx
import React, { useState, useEffect } from 'react';
import {
  getCoachStudents,
  approveEnrollment,
  rejectEnrollment,
  registerPayment,
  StudentEnrollment,
} from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Search,
  DollarSign,
  CheckCircle,
  XCircle,
  Calendar,
  BookOpen,
  CreditCard,
  Eye,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

export const CoachStudents: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'free'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentEnrollment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  useEffect(() => {
    if (user) {
      loadStudents();
    }
  }, [user]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, statusFilter, paymentFilter]);

  const loadStudents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getCoachStudents(user.uid);
      setStudents(data);
      setFilteredStudents(data);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      toast.error('Error al cargar alumnos');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(s =>
        s.studentName.toLowerCase().includes(term) ||
        s.studentEmail.toLowerCase().includes(term) ||
        s.courseTitle.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(s => s.paymentStatus === paymentFilter);
    }

    setFilteredStudents(filtered);
  };

  const handleApprove = async (enrollmentId: string) => {
    if (!user) return;

    try {
      setProcessing(enrollmentId);
      await approveEnrollment(enrollmentId, user.uid);
      toast.success('✅ Inscripción aprobada');
      await loadStudents();
    } catch (error) {
      console.error('Error al aprobar:', error);
      toast.error('Error al aprobar inscripción');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (enrollmentId: string) => {
    if (!user) return;

    try {
      setProcessing(enrollmentId);
      await rejectEnrollment(enrollmentId, user.uid);
      toast.success('Inscripción rechazada');
      await loadStudents();
    } catch (error) {
      console.error('Error al rechazar:', error);
      toast.error('Error al rechazar inscripción');
    } finally {
      setProcessing(null);
    }
  };

  const handleRegisterPayment = async () => {
    if (!user || !selectedStudent) return;

    try {
      setProcessing(selectedStudent.id);
      await registerPayment(selectedStudent.id, paymentAmount, user.uid);
      toast.success(`✅ Pago de $${paymentAmount} registrado`);
      setShowPaymentModal(false);
      setPaymentAmount(0);
      await loadStudents();
    } catch (error) {
      console.error('Error al registrar pago:', error);
      toast.error('Error al registrar pago');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'warning', icon: Clock, label: 'Pendiente' },
      approved: { color: 'success', icon: CheckCircle, label: 'Aprobado' },
      rejected: { color: 'danger', icon: XCircle, label: 'Rechazado' },
      completed: { color: 'info', icon: CheckCircle, label: 'Completado' },
    };
    const c = config[status as keyof typeof config] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`badge bg-${c.color} d-flex align-items-center gap-1`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const config = {
      pending: { color: 'warning', icon: Clock, label: 'Pendiente' },
      paid: { color: 'success', icon: CheckCircle, label: 'Pagado' },
      free: { color: 'info', icon: CreditCard, label: 'Gratuito' },
      refunded: { color: 'danger', icon: XCircle, label: 'Reembolsado' },
    };
    const c = config[status as keyof typeof config] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`badge bg-${c.color} d-flex align-items-center gap-1`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  // Estadísticas
  const stats = {
    total: students.length,
    pending: students.filter(s => s.status === 'pending').length,
    approved: students.filter(s => s.status === 'approved').length,
    paid: students.filter(s => s.paymentStatus === 'paid').length,
    totalRevenue: students
      .filter(s => s.paymentStatus === 'paid')
      .reduce((sum, s) => sum + (s.paymentAmount || 0), 0),
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-3 text-muted">Cargando alumnos...</p>
      </div>
    );
  }

  return (
    <div className="coach-students-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">📚 Alumnos Inscritos</h3>
          <p className="text-muted small">
            Gestiona los alumnos inscritos en tus cursos y su estado de pago
          </p>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={loadStudents}
          disabled={loading}
        >
          <RefreshCw size={16} className={`me-1 ${loading ? 'spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <h6 className="mb-0 text-white-50">Total Alumnos</h6>
                <h3 className="mb-0">{stats.total}</h3>
              </div>
              <Users size={32} className="opacity-50" />
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-dark">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <h6 className="mb-0 text-dark-50">Pendientes</h6>
                <h3 className="mb-0">{stats.pending}</h3>
              </div>
              <Clock size={32
