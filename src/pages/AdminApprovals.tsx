// src/pages/AdminApprovals.tsx
import React, { useState, useEffect } from 'react';
import { getAllUsers, approveUser, rejectUser, UserData } from '../services/adminService';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Shield,
  UserCog
} from 'lucide-react';

export const AdminApprovals: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'coach' | 'student' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredUsers = () => {
    let filtered = [...users];

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

    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === statusFilter);
    }

    return filtered;
  };

  const handleApprove = async (userId: string) => {
    if (!user) return;
    try {
      setProcessing(userId);
      await approveUser(userId, user.uid);
      toast.success('✅ Usuario aprobado');
      await loadUsers();
    } catch (error) {
      toast.error('Error al aprobar usuario');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!user) return;
    try {
      setProcessing(userId);
      await rejectUser(userId, 'Rechazado por el administrador', user.uid);
      toast.success('Usuario rechazado');
      await loadUsers();
    } catch (error) {
      toast.error('Error al rechazar usuario');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'warning', icon: Clock, label: 'Pendiente' },
      approved: { color: 'success', icon: UserCheck, label: 'Aprobado' },
      rejected: { color: 'danger', icon: UserX, label: 'Rechazado' },
    };
    const c = config[status as keyof typeof config] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`badge bg-${c.color}`}>
        <Icon size={12} className="me-1" />
        {c.label}
      </span>
    );
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

  const filteredUsers = getFilteredUsers();

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 text-muted">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="admin-approvals">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">🛡️ Control de Identidad</h3>
          <p className="text-muted small mb-0">
            Gestión de usuarios y aprobaciones
          </p>
        </div>
        <div className="d-flex gap-2">
          <span className="badge bg-warning p-2">
            <Clock size={14} className="me-1" />
            {users.filter(u => u.status === 'pending').length} pendientes
          </span>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={loadUsers}
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="input-group">
            <span className="input-group-text bg-white border-end-0">
              <Search size={18} className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Buscar usuario..."
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
        <div className="col-md-2 text-md-end">
          <span className="text-muted small">
            {filteredUsers.length} usuarios
          </span>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="table-responsive">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Solicitado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <React.Fragment key={u.id}>
                <tr>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                        style={{ width: '32px', height: '32px', fontSize: '14px' }}
                      >
                        {u.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span>{u.displayName || 'Sin nombre'}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td>{getStatusBadge(u.status)}</td>
                  <td>
                    {u.createdAt ? format(u.createdAt.toDate(), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                  </td>
                  <td>
                    {u.status === 'pending' && (
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApprove(u.id)}
                          disabled={processing === u.id}
                        >
                          {processing === u.id ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            <UserCheck size={14} />
                          )}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleReject(u.id)}
                          disabled={processing === u.id}
                        >
                          <UserX size={14} />
                        </button>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                        >
                          {expandedUser === u.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    )}
                    {u.status !== 'pending' && (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                      >
                        {expandedUser === u.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedUser === u.id && (
                  <tr>
                    <td colSpan={6}>
                      <div className="bg-light p-3 rounded">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <strong>Detalles del usuario</strong>
                            <ul className="list-unstyled mt-2 mb-0">
                              <li><span className="text-muted">ID:</span> {u.id}</li>
                              <li><span className="text-muted">Teléfono:</span> {u.phoneNumber || 'No registrado'}</li>
                              <li><span className="text-muted">Especialidad:</span> {u.specialty || 'No registrada'}</li>
                              {u.approvedBy && (
                                <li><span className="text-muted">Aprobado por:</span> {u.approvedBy}</li>
                              )}
                              {u.approvedAt && (
                                <li><span className="text-muted">Fecha de aprobación:</span> {format(u.approvedAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: es })}</li>
                              )}
                              {u.rejectionReason && (
                                <li><span className="text-danger">Motivo de rechazo:</span> {u.rejectionReason}</li>
                              )}
                            </ul>
                          </div>
                          <div className="col-md-6">
                            <strong>Biografía</strong>
                            <p className="mt-2 mb-0">{u.bio || 'Sin biografía'}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-5">
          <Users size={48} className="text-muted mb-3" />
          <p className="text-muted">No se encontraron usuarios con los filtros aplicados.</p>
        </div>
      )}
