import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

export type UserRole = 'admin' | 'coach' | 'alumno' | null;

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          const docRef = doc(db, 'users', u.uid);
          try {
            const docSnap = await getDoc(docRef);
            let userData = {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
              emailVerified: u.emailVerified,
            };

            const requestedRole = sessionStorage.getItem('requestedRole');
            sessionStorage.removeItem('requestedRole');

            if (docSnap.exists()) {
              const firestoreData = docSnap.data();
              
              let currentRole = firestoreData.role as UserRole;
              if (u.email === 'safeness.c.a@gmail.com' && currentRole !== 'admin') {
                currentRole = 'admin';
                try {
                  await updateDoc(docRef, { role: 'admin' });
                } catch (e) {
                  console.error("Failed to force admin role", e);
                }
              }

              setRole(currentRole);
              setUser({ ...userData, ...firestoreData, role: currentRole, uid: u.uid });
              
              // If they requested coach but are alumno, alert them (they must apply manually as update is blocked by rules)
              if (requestedRole === 'coach' && currentRole !== 'coach' && u.email !== 'safeness.c.a@gmail.com') {
                alert("Ya tienes una cuenta de alumno. Para solicitar ser Coach, contacta al soporte.");
              }

              // Update activity
              try {
                await updateDoc(docRef, { 
                  lastLoginAt: new Date(),
                  lastActivityAt: new Date(),
                  isEmailVerified: u.emailVerified
                });
              } catch (e) {
                console.error('Failed to update metadata:', e);
              }
            } else {
              const isWhitelistedAdmin = u.email === 'safeness.c.a@gmail.com';
              const newRole = isWhitelistedAdmin ? 'admin' : (requestedRole === 'coach' ? 'coach' : 'alumno');
              const initialApprovalStatus = isWhitelistedAdmin ? 'approved' : 'pending';
              
              const newUser = {
                uid: u.uid,
                email: u.email,
                displayName: u.displayName || '',
                photoURL: u.photoURL || '',
                role: newRole,
                approvalStatus: initialApprovalStatus,
                theme: 'teal',
                isEmailVerified: u.emailVerified,
                createdAt: new Date(),
                lastActivityAt: new Date(),
                points: 0
              };

              await setDoc(docRef, newUser);
              setRole(newRole);
              setUser({ ...userData, ...newUser });
              
              if (!isWhitelistedAdmin) {
                alert(`¡Gracias por registrarte! Tu cuenta de ${newRole === 'coach' ? 'Coach' : 'Alumno'} está pendiente de aprobación por un administrador.`);
              }
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `users/${u.uid}`);
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
      }
    }
  };
  
  const logout = async () => {
    await signOut(auth);
  };

  return { user, role, loading, login, logout };
}
