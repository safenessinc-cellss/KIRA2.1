import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  db,
  doc,
  getDoc,
  setDoc
} from '../firebase';

interface AuthContextType {
  user: any | null;
  role: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role || 'alumno');
          } else {
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              photoURL: firebaseUser.photoURL || '',
              role: 'alumno',
              createdAt: new Date(),
              approvalStatus: 'approved',
              points: 0
            });
            setRole('alumno');
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole('alumno');
        }
      } else {
        setRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        setRole(userDoc.data().role);
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', result.user.uid), {
        email,
        displayName: name,
        photoURL: '',
        role: 'alumno',
        createdAt: new Date(),
        approvalStatus: 'approved',
        points: 0
      });
      setRole('alumno');
    } catch (error) {
      console.error("SignUp error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setRole(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          photoURL: firebaseUser.photoURL || '',
          role: 'alumno',
          createdAt: new Date(),
          approvalStatus: 'approved',
          points: 0
        });
        setRole('alumno');
      } else {
        setRole(userDoc.data().role);
      }
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    role,
    loading,
    login,
    signUp,
    logout,
    signInWithGoogle
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
