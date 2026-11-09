import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';

export type UserRole = 'admin' | 'coach' | 'alumno' | 'hr_admin' | 'company_admin' | 'company_member' | null;

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc = () => {};
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          const docRef = doc(db, 'users', u.uid);
          
          unsubDoc(); // Unsubscribe previous if exists
          
          unsubDoc = onSnapshot(docRef, async (docSnap) => {
            try {
              let userData = {
                uid: u.uid,
                email: u.email,
                displayName: u.displayName,
                photoURL: u.photoURL,
                emailVerified: u.emailVerified,
              };

              const requestedRole = sessionStorage.getItem('requestedRole');
              sessionStorage.removeItem('requestedRole');
              const requestedName = sessionStorage.getItem('requestedName');
              sessionStorage.removeItem('requestedName');

              if (docSnap.exists()) {
                const firestoreData = docSnap.data();
                
                let currentRole = firestoreData.role as UserRole;
                if (u.email?.toLowerCase() === 'safeness.c.a@gmail.com' && u.emailVerified && currentRole !== 'admin') {
                  currentRole = 'admin';
                  try {
                    await updateDoc(docRef, { role: 'admin' });
                  } catch (e) {
                    console.error("Failed to force admin role", e);
                  }
                }

                // If displayName is the email username, override it to 'Kira Coach' for the safeness email
                let resolvedDisplayName = firestoreData.displayName || firestoreData.name || userData.displayName || '';
                const emailLower = u.email?.toLowerCase();
                if (emailLower === 'safeness.c.a@gmail.com') {
                  const resolvedLower = resolvedDisplayName.toLowerCase().trim();
                  if (!resolvedDisplayName || resolvedLower === 'safeness.c.a' || resolvedLower === 'safeness' || resolvedLower === 'safeness.c.a@gmail.com') {
                    resolvedDisplayName = 'Kira Coach';
                  }
                }

                setRole(currentRole);
                setUser({
                  ...userData,
                  ...firestoreData,
                  displayName: resolvedDisplayName,
                  role: currentRole,
                  uid: u.uid
                });

                const publicCoachRef = doc(db, 'coachPublicProfiles', u.uid);
                if (currentRole === 'coach' && firestoreData.approvalStatus === 'approved') {
                  const publicMediaItems = Array.isArray(firestoreData.mediaItems)
                    ? firestoreData.mediaItems
                        .filter((item: any) => item && item.isPublic === true && Number(item.pointCost || 0) === 0 && typeof item.url === 'string')
                        .map((item: any) => ({ id: String(item.id || item.title || ''), title: String(item.title || ''), type: String(item.type || 'link'), url: item.url }))
                    : [];
                  void setDoc(publicCoachRef, {
                    uid: u.uid,
                    displayName: resolvedDisplayName,
                    photoURL: firestoreData.photoURL || userData.photoURL || '',
                    specialty: firestoreData.specialty || '',
                    bio: firestoreData.bio || '',
                    specialties: firestoreData.specialties || [],
                    languages: firestoreData.languages || '',
                    socialLinks: firestoreData.socialLinks || {},
                    rating: Number(firestoreData.rating || 0),
                    studentCount: Number(firestoreData.studentCount || 0),
                    mediaItems: publicMediaItems,
                    approvalStatus: 'approved',
                    status: 'published',
                    updatedAt: new Date()
                  }, { merge: true }).catch(err => console.warn('Public coach profile sync failed:', err));
                } else {
                  void deleteDoc(publicCoachRef).catch(err => console.warn('Public coach profile cleanup failed:', err));
                }

                // Update activity with a throttle (e.g. only if lastActivityAt is older than 1 minute)
                const lastActivity = firestoreData.lastActivityAt?.toDate ? firestoreData.lastActivityAt.toDate() : null;
                const lastLogin = firestoreData.lastLoginAt?.toDate ? firestoreData.lastLoginAt.toDate() : null;
                const now = new Date();
                const authLoginAt = u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime) : now;
                const loginNeedsUpdate = !lastLogin || Math.abs(lastLogin.getTime() - authLoginAt.getTime()) > 1000;
                const activityNeedsUpdate = !lastActivity || (now.getTime() - lastActivity.getTime()) > 60000;
                if (loginNeedsUpdate || activityNeedsUpdate || firestoreData.isEmailVerified !== u.emailVerified) {
                  try {
                    await updateDoc(docRef, {
                      ...(loginNeedsUpdate ? { lastLoginAt: authLoginAt } : {}),
                      ...(activityNeedsUpdate ? { lastActivityAt: now } : {}),
                      isEmailVerified: u.emailVerified
                    });
                  } catch (e) {
                    console.error('Failed to update metadata:', e);
                  }
                }
              } else {
                const isWhitelistedAdmin = u.email?.toLowerCase() === 'safeness.c.a@gmail.com' && u.emailVerified;
                const newRole = isWhitelistedAdmin ? 'admin' : (requestedRole === 'coach' ? 'coach' : 'alumno');
                const initialApprovalStatus = isWhitelistedAdmin ? 'approved' : 'pending';
                
                const newUser = {
                  uid: u.uid,
                  email: u.email,
                  displayName: u.displayName || requestedName || (u.email?.toLowerCase() === 'safeness.c.a@gmail.com' ? 'Kira Coach' : (u.email?.split('@')[0] || '')),
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
            } catch (err) {
              console.error('Error handling doc snapshot:', err);
            } finally {
              setLoading(false);
            }
          }, (err) => {
            console.error('onSnapshot error:', err);
            setLoading(false);
          });
        } else {
          unsubDoc();
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth handler error:', err);
        setLoading(false);
      }
    });
    
    return () => {
      unsubscribe();
      unsubDoc();
    };
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
