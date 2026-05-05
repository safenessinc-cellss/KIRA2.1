import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

export default function AdminApprovals() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Aprobar al usuario ${userEmail}?`)) return;
    
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved',
        role: 'user',
        approvedBy: 'JJxNTvf3paNb0JWqDW7I9fhn6RC2',
        approvedAt: new Date(),
        updatedAt: new Date()
      });
      alert(`✅ Usuario ${userEmail} aprobado correctamente`);
      fetchPendingUsers(); // Recargar lista
    } catch (error) {
      console.error('Error approving user:', error);
      alert('❌ Error al aprobar usuario');
    }
  };

  const rejectUser = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Rechazar al usuario ${userEmail}?`)) return;
    
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'rejected',
        rejectedBy: 'JJxNTvf3paNb0JWqDW7I9fhn6RC2',
        rejectedAt: new Date()
      });
      alert(`❌ Usuario ${userEmail} rechazado`);
      fetchPendingUsers(); // Recargar lista
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('❌ Error al rechazar usuario');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">Cargando usuarios pendientes...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">👥 Aprobación de Usuarios</h1>
        <p className="text-gray-600 mt-2">Gestiona los registros pendientes de aprobación</p>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg">
          🎉 ¡No hay usuarios pendientes de aprobación! Todos los usuarios están activos.
        </div>
      ) : (
        <>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg mb-6">
            ⚠️ Hay {pendingUsers.length} usuario(s) pendiente(s) de aprobación
          </div>
          
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Registro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button
                        onClick={() => approveUser(user.id, user.email)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        ✅ Aprobar
                      </button>
                      <button
                        onClick={() => rejectUser(user.id, user.email)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors ml-2"
                      >
                        ❌ Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
