// src/helpers/notificationsHelper.ts
import { db } from '../firebase/firebase'; // Ajusta la ruta según tu configuración
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: number; // Timestamp en milisegundos
  [key: string]: any; // Para otros campos
}

/**
 * Carga notificaciones con fallback automático
 * Si el índice no está listo, usa ordenamiento en el cliente
 */
export function cargarNotificacionesConFallback(
  userId: string,
  onData: (notificaciones: Notification[]) => void,
  onError?: (error: Error) => void
) {
  console.log('🔄 Iniciando carga de notificaciones...');

  try {
    // Consulta principal (requiere índice compuesto)
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // ÉXITO: Índice disponible
        const notificaciones = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];
        
        onData(notificaciones);
        console.log('✅ Notificaciones cargadas con índice', notificaciones.length);
      },
      (error) => {
        // ERROR: Probablemente índice en construcción
        if (error.code === 'failed-precondition') {
          console.warn('⏳ Índice no disponible, usando fallback...');
          
          // FALLBACK: Consulta sin orderBy
          const qFallback = query(
            collection(db, 'notifications'),
            where('userId', '==', userId)
          );

          const fallbackUnsubscribe = onSnapshot(
            qFallback,
            (snapshot) => {
              // Ordenar manualmente en el cliente
              const notificaciones = snapshot.docs
                .map(doc => ({
                  id: doc.id,
                  ...doc.data()
                })) as Notification[];
              
              // Ordenar por createdAt (más reciente primero)
              notificaciones.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
              
              onData(notificaciones);
              console.log('🟡 Fallback activo', notificaciones.length);
            },
            (fallbackError) => {
              console.error('❌ Error en fallback:', fallbackError);
              if (onError) onError(fallbackError);
            }
          );

          // Retornamos el unsubscribe del fallback
          return fallbackUnsubscribe;
        } else {
          // Otro tipo de error
          console.error('❌ Error crítico:', error);
          if (onError) onError(error);
          onData([]);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error al configurar listener:', error);
    if (onError) onError(error as Error);
    return () => {};
  }
}

/**
 * Versión para carga única (sin tiempo real)
 */
export async function cargarNotificacionesUnaVez(
  userId: string
): Promise<Notification[]> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
  } catch (error: any) {
    if (error.code === 'failed-precondition') {
      console.warn('⏳ Índice no disponible, usando fallback en carga única...');
      
      // Fallback sin orderBy
      const qFallback = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(qFallback);
      const notificaciones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      // Ordenar manualmente
      notificaciones.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      return notificaciones;
    }
    throw error;
  }
}
