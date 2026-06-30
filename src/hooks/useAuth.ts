// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { 
  auth, 
  db,
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  updateProfile,
} from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

type UserRole = 'student' | 'coach' | 'admin';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          
          // 🔥 VERIFICAR SI ES SUPER ADMIN POR EMAIL
          const isSuperAdmin = firebaseUser.email === 'safeness.c.a@gmail.com';
          
          // Obtener datos del usuario de Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // 🔥 SI ES SUPER ADMIN Y NO ES ADMIN, ACTUALIZAR AUTOMÁTICAMENTE
            if (isSuperAdmin && userData.role !== 'admin') {
              console.log('🔑 Super Admin detectado, actualizando rol...');
              await updateDoc(doc(db, 'users', firebaseUser.uid), {
                role: 'admin',
                status: 'approved',
                approvedAt: new Date().toISOString(),
              });
              setRole('admin');
            } else {
              setRole(userData.role || 'student');
            }
          } else {
            // 🔥 CREAR USUARIO NUEVO CON ROLE CORRECTO
            const requestedRole = sessionStorage.getItem('requestedRole') as UserRole || 'student';
            const name = sessionStorage.getItem('requestedName') || firebaseUser.displayName || 'Usuario';
            
            // 🔥 SI ES SUPER ADMIN, CREAR COMO ADMIN
            const newRole = isSuperAdmin ? 'admin' : requestedRole;
            const newStatus = isSuperAdmin ? 'approved' : 'pending';
            
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              displayName: name,
              email: firebaseUser.email,
              role: newRole,
              status: newStatus,
              createdAt: new Date().toISOString(),
              photoURL: firebaseUser.photoURL || null,
            });
            
            setRole(newRole);
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (err) {
        console.error('Auth handler error:', err);
      } finally {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  const login = async (requestedRole?: UserRole) => {
    if (loading) return;
    if (requestedRole) {
      sessionStorage.setItem('requestedRole', requestedRole);
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.warn('Login popup was closed before completion or another request was pending.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        console.log('User closed the login popup.');
      } else {
        console.error('Authentication Error:', error);
        throw error;
      }
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Email login error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, requestedRole: UserRole) => {
    if (requestedRole) {
      sessionStorage.setItem('requestedRole', requestedRole);
    }
    sessionStorage.setItem('requestedName', name);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      return userCredential.user;
    } catch (error: any) {
      console.error('Email signup error:', error);
      throw error;
    }
  };
  
  const logout = async () => {
    await signOut(auth);
  };

  return { user, role, loading, login, loginWithEmail, signUpWithEmail, logout };
}
