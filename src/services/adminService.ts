// src/services/adminService.ts
import { db, auth } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
  limit,
  DocumentData,
  QueryDocumentSnapshot,
  setDoc,
} from 'firebase/firestore';

// ============================================
// 🔥 INTERFACES
// ============================================

export interface PendingUser {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'coach' | 'student';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectionReason?: string;
  photoURL?: string;
  phoneNumber?: string;
  specialty?: string;
  bio?: string;
  paymentStatus?: 'pending' | 'paid' | 'free';
  enrollmentDate?: Timestamp;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  courseCoachId: string;
  courseCoachName: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'free' | 'refunded';
  paymentAmount: number;
  paymentDate?: Timestamp;
  enrolledAt: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  completionDate?: Timestamp;
  progress?: number;
}

// ============================================
// 📋 USUARIOS PENDIENTES DE APROBACIÓN
// ============================================

/**
 * Obtener todos los usuarios pendientes
 */
export const getPendingUsers = async (limitCount: number = 100): Promise<PendingUser[]> => {
  try {
    console.log('🔍 [Admin] Obteniendo usuarios pendientes...');
    
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const users: PendingUser[] = [];
    
    snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      } as PendingUser);
    });
    
    console.log(`✅ [Admin] ${users.length} usuarios pendientes encontrados`);
    return users;
  } catch (error) {
    console.error('❌ [Admin] Error al obtener usuarios pendientes:', error);
    throw error;
  }
};

/**
 * Aprobar un usuario (liberar acceso)
 */
export const approveUser = async (userId: string, adminId: string): Promise<void> => {
  try {
    console.log(`🔍 [Admin] Aprobando usuario ${userId}...`);
    
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('Usuario no encontrado');
    }
    
    const userData = userSnap.data();
    
    if (userData.status !== 'pending') {
      throw new Error(`El usuario no está pendiente. Estado actual: ${userData.status}`);
    }
    
    // 🔥 ACTUALIZAR ESTADO DEL USUARIO
    await updateDoc(userRef, {
      status: 'approved',
      approvedBy: adminId,
      approvedAt: Timestamp.now(),
    });
    
    // 🔥 CREAR NOTIFICACIÓN PARA EL USUARIO
    await addDoc(collection(db, 'notifications'), {
      userId: userId,
      title: '¡Bienvenido a KiraCoach! 🎉',
      message: 'Tu cuenta ha sido aprobada. Ya puedes acceder a todos los cursos y funcionalidades.',
      type: 'system',
      read: false,
      createdAt: Timestamp.now(),
    });
    
    console.log(`✅ [Admin] Usuario ${userId} aprobado`);
  } catch (error) {
    console.error('❌ [Admin] Error al aprobar usuario:', error);
    throw error;
  }
};

/**
 * Rechazar un usuario
 */
export const rejectUser = async (userId: string, reason: string, adminId: string): Promise<void> => {
  try {
    console.log(`🔍 [Admin] Rechazando usuario ${userId}...`);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'rejected',
      rejectionReason: reason || 'Rechazado por el administrador',
      approvedBy: adminId,
      approvedAt: Timestamp.now(),
    });
    
    console.log(`✅ [Admin] Usuario ${userId} rechazado`);
  } catch (error) {
    console.error('❌ [Admin] Error al rechazar usuario:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de usuarios
 */
export const getUserStats = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let total = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let coaches = 0;
    let students = 0;
    let admins = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      total++;
      
      if (data.status === 'pending') pending++;
      else if (data.status === 'approved') approved++;
      else if (data.status === 'rejected') rejected++;
      
      if (data.role === 'coach') coaches++;
      else if (data.role === 'student') students++;
      else if (data.role === 'admin') admins++;
    });
    
    return {
      total,
      pending,
      approved,
      rejected,
      coaches,
      students,
      admins,
    };
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    throw error;
  }
};

// ============================================
// 📋 ALUMNOS INSCRITOS POR CURSO (COACH)
// ============================================

/**
 * Obtener alumnos inscritos en los cursos de un coach
 */
export const getCoachStudents = async (coachId: string): Promise<StudentEnrollment[]> => {
  try {
    console.log(`🔍 [Coach] Obteniendo alumnos para coach ${coachId}...`);
    
    // 1. Obtener todos los cursos del coach
    const coursesRef = collection(db, 'courses');
    const coursesQuery = query(
      coursesRef,
      where('coachId', '==', coachId),
      where('status', 'in', ['published', 'draft'])
    );
    const coursesSnapshot = await getDocs(coursesQuery);
    const courseIds = coursesSnapshot.docs.map(doc => doc.id);
    
    if (courseIds.length === 0) {
      console.log('ℹ️ [Coach] No hay cursos para este coach');
      return [];
    }
    
    // 2. Obtener inscripciones de esos cursos
    const enrollmentsRef = collection(db, 'enrollments');
    const enrollmentsQuery = query(
      enrollmentsRef,
      where('courseId', 'in', courseIds),
      orderBy('enrolledAt', 'desc')
    );
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    
    const students: StudentEnrollment[] = [];
    
    for (const doc of enrollmentsSnapshot.docs) {
      const data = doc.data();
      
      // 3. Obtener datos del estudiante
      const userRef = doc(db, 'users', data.studentId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      
      // 4. Obtener datos del curso
      const courseRef = doc(db, 'courses', data.courseId);
      const courseSnap = await getDoc(courseRef);
      const courseData = courseSnap.exists() ? courseSnap.data() : {};
      
      students.push({
        id: doc.id,
        studentId: data.studentId,
        studentName: userData.displayName || 'Sin nombre',
        studentEmail: userData.email || '',
        courseId: data.courseId,
        courseTitle: courseData.title || 'Curso sin título',
        courseCoachId: courseData.coachId || coachId,
        courseCoachName: courseData.coachName || 'Coach',
        status: data.status || 'pending',
        paymentStatus: data.paymentStatus || 'pending',
        paymentAmount: data.paymentAmount || 0,
        paymentDate: data.paymentDate || null,
        enrolledAt: data.enrolledAt || Timestamp.now(),
        approvedBy: data.approvedBy || null,
        approvedAt: data.approvedAt || null,
        progress: data.progress || 0,
      });
    }
    
    console.log(`✅ [Coach] ${students.length} alumnos encontrados`);
    return students;
  } catch (error) {
    console.error('❌ [Coach] Error al obtener alumnos:', error);
    throw error;
  }
};

/**
 * Obtener alumnos pendientes de aprobación para un coach
 */
export const getPendingEnrollments = async (coachId: string): Promise<StudentEnrollment[]> => {
  try {
    console.log(`🔍 [Coach] Obteniendo inscripciones pendientes...`);
    
    const students = await getCoachStudents(coachId);
    const pending = students.filter(s => s.status === 'pending');
    
    console.log(`✅ [Coach] ${pending.length} inscripciones pendientes`);
    return pending;
  } catch (error) {
    console.error('❌ [Coach] Error al obtener inscripciones pendientes:', error);
    throw error;
  }
};

/**
 * Aprobar inscripción de alumno
 */
export const approveEnrollment = async (
  enrollmentId: string,
  coachId: string
): Promise<void> => {
  try {
    console.log(`🔍 [Coach] Aprobando inscripción ${enrollmentId}...`);
    
    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    const enrollmentSnap = await getDoc(enrollmentRef);
    
    if (!enrollmentSnap.exists()) {
      throw new Error('Inscripción no encontrada');
    }
    
    const data = enrollmentSnap.data();
    
    // Verificar que el coach tiene permiso
    if (data.courseCoachId !== coachId) {
      throw new Error('No tienes permiso para aprobar esta inscripción');
    }
    
    await updateDoc(enrollmentRef, {
      status: 'approved',
      approvedBy: coachId,
      approvedAt: Timestamp.now(),
    });
    
    // Crear notificación para el estudiante
    await addDoc(collection(db, 'notifications'), {
      userId: data.studentId,
      title: '¡Inscripción aprobada! 🎉',
      message: `Tu inscripción al curso "${data.courseTitle}" ha sido aprobada.`,
      type: 'system',
      read: false,
      createdAt: Timestamp.now(),
    });
    
    console.log(`✅ [Coach] Inscripción ${enrollmentId} aprobada`);
  } catch (error) {
    console.error('❌ [Coach] Error al aprobar inscripción:', error);
    throw error;
  }
};

/**
 * Rechazar inscripción de alumno
 */
export const rejectEnrollment = async (
  enrollmentId: string,
  coachId: string,
  reason?: string
): Promise<void> => {
  try {
    console.log(`🔍 [Coach] Rechazando inscripción ${enrollmentId}...`);
    
    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    await updateDoc(enrollmentRef, {
      status: 'rejected',
      rejectionReason: reason || 'Rechazado por el coach',
      approvedBy: coachId,
      approvedAt: Timestamp.now(),
    });
    
    console.log(`✅ [Coach] Inscripción ${enrollmentId} rechazada`);
  } catch (error) {
    console.error('❌ [Coach] Error al rechazar inscripción:', error);
    throw error;
  }
};

/**
 * Registrar pago de un alumno
 */
export const registerPayment = async (
  enrollmentId: string,
  amount: number,
  coachId: string
): Promise<void> => {
  try {
    console.log(`🔍 [Coach] Registrando pago de ${amount} para ${enrollmentId}...`);
    
    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    await updateDoc(enrollmentRef, {
      paymentStatus: 'paid',
      paymentAmount: amount,
      paymentDate: Timestamp.now(),
    });
    
    // Registrar transacción
    await addDoc(collection(db, 'transactions'), {
      enrollmentId,
      amount,
      type: 'course_payment',
      status: 'completed',
      coachId,
      createdAt: Timestamp.now(),
    });
    
    console.log(`✅ [Coach] Pago registrado para ${enrollmentId}`);
  } catch (error) {
    console.error('❌ [Coach] Error al registrar pago:', error);
    throw error;
  }
};
