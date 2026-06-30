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
              <Clock size={32} className="opacity-50" />
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <h6 className="mb-0 text-white-50">Aprobados</h6>
                <h3 className="mb-0">{stats.approved}</h3>
              </div>
              <UserCheck size={32} className="opacity-50" />
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body d-flex align-items-center justify-content-between">
              <div>
                <h6 className="mb-0 text-white-50">Ingresos</h6>
                <h3 className="mb-0">${stats.totalRevenue.toFixed(2)}</h3>
              </div>
              <DollarSign size={32} className="opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={18} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Buscar alumno o curso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="approved">Aprobados</option>
                <option value="rejected">Rechazados</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
              >
                <option value="all">Todos los pagos</option>
                <option value="pending">Pendientes</option>
                <option value="paid">Pagados</option>
                <option value="free">Gratuitos</option>
              </select>
            </div>
            <div className="col-md-2 text-md-end">
              <span className="badge bg-secondary p-2">
                {filteredStudents.length} alumnos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de alumnos */}
      {filteredStudents.length === 0 ? (
        <div className="alert alert-info d-flex align-items-center">
          <AlertCircle size={24} className="me-3" />
          <div>
            <h6 className="mb-0">No hay alumnos inscritos</h6>
            <p className="mb-0 small">
              Los alumnos que se inscriban aparecerán aquí automáticamente.
            </p>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead className="table-light">
              <tr>
                <th>Alumno</th>
                <th>Curso</th>
                <th>Estado</th>
                <th>Pago</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div>
                      <strong>{student.studentName}</strong>
                      <div className="text-muted small">{student.studentEmail}</div>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <BookOpen size={14} className="text-muted" />
                      <span>{student.courseTitle}</span>
                    </div>
                  </td>
                  <td>{getStatusBadge(student.status)}</td>
                  <td>
                    <div>
                      {getPaymentBadge(student.paymentStatus)}
                      {student.paymentStatus === 'paid' && student.paymentAmount > 0 && (
                        <div className="text-success small">
                          ${student.paymentAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-1">
                      <Calendar size={14} className="text-muted" />
                      <small>
                        {format(student.enrolledAt.toDate(), 'dd/MM/yyyy', { locale: es })}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      {student.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-success btn-sm d-flex align-items-center gap-1"
                            onClick={() => handleApprove(student.id)}
                            disabled={processing === student.id}
                          >
                            <UserCheck size={14} />
                            Aprobar
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                            onClick={() => handleReject(student.id)}
                            disabled={processing === student.id}
                          >
                            <UserX size={14} />
                          </button>
                        </>
                      )}
                      {student.status === 'approved' && student.paymentStatus === 'pending' && (
                        <button
                          className="btn btn-info btn-sm d-flex align-items-center gap-1"
                          onClick={() => {
                            setSelectedStudent(student);
                            setPaymentAmount(student.paymentAmount || 99);
                            setShowPaymentModal(true);
                          }}
                          disabled={processing === student.id}
                        >
                          <DollarSign size={14} />
                          Registrar Pago
                        </button>
                      )}
                      <button
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                        onClick={() => setSelectedStudent(student)}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de detalles del alumno */}
      {selectedStudent && !showPaymentModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Detalles del Alumno</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedStudent(null)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Nombre:</strong> {selectedStudent.studentName}
                </div>
                <div className="mb-3">
                  <strong>Email:</strong> {selectedStudent.studentEmail}
                </div>
                <div className="mb-3">
                  <strong>Curso:</strong> {selectedStudent.courseTitle}
                </div>
                <div className="mb-3">
                  <strong>Estado:</strong> {getStatusBadge(selectedStudent.status)}
                </div>
                <div className="mb-3">
                  <strong>Pago:</strong> {getPaymentBadge(selectedStudent.paymentStatus)}
                </div>
                {selectedStudent.paymentStatus === 'paid' && (
                  <div className="mb-3">
                    <strong>Monto pagado:</strong> ${selectedStudent.paymentAmount?.toFixed(2)}
                  </div>
                )}
                <div className="mb-3">
                  <strong>Fecha de inscripción:</strong>{' '}
                  {format(selectedStudent.enrolledAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: es })}
                </div>
                {selectedStudent.progress !== undefined && (
                  <div className="mb-3">
                    <strong>Progreso:</strong> {selectedStudent.progress}%
                    <div className="progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${selectedStudent.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedStudent(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de registro de pago */}
      {showPaymentModal && selectedStudent && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">💰 Registrar Pago</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount(0);
                  }}
                />
              </div>
              <div className="modal-body">
                <p className="text-muted">
                  Registra el pago del alumno <strong>{selectedStudent.studentName}</strong> para el curso <strong>{selectedStudent.courseTitle}</strong>
                </p>
                <div className="mb-3">
                  <label className="form-label">Monto (USD)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount(0);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleRegisterPayment}
                  disabled={processing === selectedStudent.id}
                >
                  {processing === selectedStudent.id ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    'Registrar Pago'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
