// src/pages/admin/PendingUsers.tsx
import React, { useState, useEffect } from 'react';
import { getPendingUsers, approveUser, rejectUser, UserData } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  UserCheck, 
  UserX, 
  Clock, 
  Mail, 
  User as UserIcon,
  Calendar,
  Search,
  Filter
} from 'lucide-react';

export const PendingUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'coach' | 'student' | 'admin'>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getPendingUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      toast.error('Error al cargar usuarios pendientes');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filtro por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(u => 
        u.displayName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    }

    // Filtro por rol
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleApprove = async (userId: string) => {
    if (!user) return;
    
    try {
      setProcessing(userId);
      await approveUser(userId, user.uid);
      toast.success('✅ Usuario aprobado correctamente');
      await loadUsers();
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
      await loadUsers();
    } catch (error) {
      console.error('Error al rechazar:', error);
      toast.error('Error al rechazar usuario');
    } finally {
      setProcessing(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const config = {
      admin: { color: 'danger', label: 'Admin' },
      coach: { color: 'info', label: 'Coach' },
      student: { color: 'success', label: 'Alumno' },
    };
    const c = config[role as keyof typeof config] || config.student;
    return <span className={`badge bg-${c.color}`}>{c.label}</span>;
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
    <div className="pending-users">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">👥 Usuarios Pendientes</h3>
          <p className="text-muted small mb-0">
            {users.length} usuarios esperando aprobación
          </p>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={loadUsers}
          disabled={loading}
        >
          <span className="me-1">🔄</span> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="row g-3 mb-4">
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
          <span className="badge bg-warning fs-6 p-2">
            <Clock size={14} className="me-1" />
            {filteredUsers.length} pendientes
          </span>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="alert alert-success d-flex align-items-center">
          <UserCheck size={24} className="me-3" />
          <div>
            <h6 className="mb-0">¡No hay usuarios pendientes!</h6>
            <p className="mb-0 small">Todos los usuarios han sido procesados.</p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {filteredUsers.map((pendingUser) => (
            <div key={pendingUser.id} className="col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm hover-shadow">
                <div className="card-body">
                  <div className="d-flex align-items-start justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      {pendingUser.photoURL ? (
                        <img
                          src={pendingUser.photoURL}
                          alt={pendingUser.displayName}
                          className="rounded-circle border"
                          style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                          style={{ width: '48px', height: '48px', fontSize: '20px' }}
                        >
                          {pendingUser.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <h6 className="mb-0">{pendingUser.displayName || 'Sin nombre'}</h6>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          {getRoleBadge(pendingUser.role)}
                          <span className="badge bg-warning text-dark">
                            <Clock size={12} className="me-1" />
                            Pendiente
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-top">
                    <div className="d-flex align-items-center gap-2 text-muted small">
                      <Mail size={14} />
                      <span>{pendingUser.email}</span>
                    </div>
                    {pendingUser.createdAt && (
                      <div className="d-flex align-items-center gap-2 text-muted small mt-1">
                        <Calendar size={14} />
                        <span>Solicitado: {format(pendingUser.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                      </div>
                    )}
                    {pendingUser.specialty && (
                      <div className="mt-1">
                        <span className="badge bg-light text-dark">
                          {pendingUser.specialty}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 d-flex gap-2">
                    <button
                      className="btn btn-success btn-sm flex-grow-1"
                      onClick={() => handleApprove(pendingUser.id)}
                      disabled={processing === pendingUser.id}
                    >
                      {processing === pendingUser.id ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <>
                          <UserCheck size={16} className="me-1" />
                          Aprobar
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setShowRejectModal(pendingUser.id)}
                      disabled={processing === pendingUser.id}
                    >
                      <UserX size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de rechazo */}
      {showRejectModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
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
        .hover-shadow {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .hover-shadow:hover {
          transform: translateY(-4px);
          box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15) !important;
        }
      `}</style>
    </div>
  );
};
