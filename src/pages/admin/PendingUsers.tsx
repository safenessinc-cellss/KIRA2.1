// src/pages/admin/PendingUsers.tsx
import React, { useState, useEffect } from 'react';
import { getPendingUsers, approveUser, rejectUser, getUserStats, PendingUser } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Mail,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  UserPlus,
  Calendar,
  Award,
  Shield,
  RefreshCw,
} from 'lucide-react';

export const PendingUsers: React.FC = () => {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'coach' | 'student' | 'admin'>('all');
  const [stats, setStats] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [pendingUsers, searchTerm, roleFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [users, statsData] = await Promise.all([
        getPendingUsers(),
        getUserStats(),
      ]);
      setPendingUsers(users);
      setFilteredUsers(users);
      setStats(statsData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar usuarios pendientes');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...pendingUsers];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(u =>
        u.displayName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleApprove = async (userId: string) => {
    if (!user) {
      toast.error('No has iniciado sesión');
      return;
    }

    try {
      setProcessing(userId);
      await approveUser(userId, user.uid);
      toast.success('✅ Usuario aprobado correctamente');
      await loadData();
    } catch (error: any) {
      console.error('Error al aprobar:', error);
      toast.error(error.message || 'Error al aprobar usuario');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!user) return;

    try {
      setProcessing(userId);
      await rejectUser(userId, rejectionReason || 'Rechazado por el administrador', user.uid);
      toast.success('Usuario rechazado');
      setShowRejectModal(null);
      setRejectionReason('');
      await loadData();
    } catch (error) {
      console.error('Error al rechazar:', error);
      toast.error('Error al rechazar usuario');
    } finally {
      setProcessing(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const config = {
      admin: { color: 'danger', icon: Shield, label: 'Admin' },
      coach: { color: 'info', icon: Award, label: 'Coach' },
      student: { color: 'success', icon: Users, label: 'Alumno' },
    };
    const c = config[role as keyof typeof config] || config.student;
    const Icon = c.icon;
    return (
      <span className={`badge bg-${c.color} d-flex align-items-center gap-1`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-3 text-muted">Cargando usuarios pendientes...</p>
      </div>
    );
  }

  return (
    <div className="pending-users-container">
      {/* Estadísticas */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="mb-0 text-white-50">Total Usuarios</h6>
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
            <div className="card bg-danger text-white">
              <div className="card-body d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="mb-0 text-white-50">Rechazados</h6>
                  <h3 className="mb-0">{stats.rejected}</h3>
                </div>
                <UserX size={32} className="opacity-50" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <Search size={18} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
              >
                <option value="all">Todos los roles</option>
                <option value="coach">Coaches</option>
                <option value="student">Alumnos</option>
                <option value="admin">Administradores</option>
              </select>
            </div>
            <div className="col-md-3 text-md-end">
              <button
                className="btn btn-outline-secondary"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw size={16} className={`me-1 ${loading ? 'spin' : ''}`} />
                Actualizar
              </button>
              <span className="badge bg-warning ms-2 p-2">
                <Clock size={14} className="me-1" />
                {filteredUsers.length} pendientes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      {filteredUsers.length === 0 ? (
        <div className="alert alert-success d-flex align-items-center">
          <CheckCircle size={24} className="me-3" />
          <div>
            <h6 className="mb-0">¡No hay usuarios pendientes!</h6>
            <p className="mb-0 small">Todos los usuarios han sido procesados.</p>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead className="table-light">
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Fecha de solicitud</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((pendingUser) => (
                <tr key={pendingUser.id}>
                  <td>
                    <div className="d-flex align-items-center">
                      {pendingUser.photoURL ? (
                        <img
                          src={pendingUser.photoURL}
                          alt={pendingUser.displayName}
                          className="rounded-circle me-2"
                          style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2"
                          style={{ width: '40px', height: '40px' }}
                        >
                          {pendingUser.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <strong>{pendingUser.displayName || 'Sin nombre'}</strong>
                        {pendingUser.specialty && (
                          <div className="text-muted small">{pendingUser.specialty}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{pendingUser.email}</td>
                  <td>{getRoleBadge(pendingUser.role)}</td>
                  <td>
                    <div className="d-flex align-items-center gap-1">
                      <Calendar size={14} className="text-muted" />
                      {pendingUser.createdAt ? 
                        format(pendingUser.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: es }) :
                        'N/A'
                      }
                    </div>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-success btn-sm d-flex align-items-center gap-1"
                        onClick={() => handleApprove(pendingUser.id)}
                        disabled={processing === pendingUser.id}
                      >
                        {processing === pendingUser.id ? (
                          <span className="spinner-border spinner-border-sm" />
                        ) : (
                          <>
                            <UserCheck size={14} />
                            Liberar
                          </>
                        )}
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                        onClick={() => setShowRejectModal(pendingUser.id)}
                        disabled={processing === pendingUser.id}
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de rechazo */}
      {showRejectModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">❌ Rechazar usuario</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectionReason('');
                  }}
                />
              </div>
              <div className="modal-body">
                <p className="text-muted">¿Por qué estás rechazando este usuario?</p>
                <textarea
                  className="form-control"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Escribe el motivo del rechazo..."
                  rows={3}
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectionReason('');
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleReject(showRejectModal)}
                  disabled={processing === showRejectModal}
                >
                  {processing === showRejectModal ? 'Procesando...' : 'Rechazar'}
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
