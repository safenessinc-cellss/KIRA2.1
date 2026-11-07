// src/firebase.ts
import { initializeApp } from 'firebase/app';
import firebaseAppletConfig from '../firebase-applet-config.json';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  updateProfile,  // 🔥 AÑADIR ESTA IMPORTACIÓN
  User,
  UserCredential
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  writeBatch,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

// 🔥 CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId,
};

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// 🔥 AUTH - Exportar TODAS las funciones necesarias
export const auth = getAuth(app);

// 🔥 FIRESTORE CON CACHE
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// 🔥 STORAGE
export const storage = getStorage(app);

// FCM is initialized lazily so browsers without Push API support never fail app startup.
export async function getBrowserMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    if (!(await isSupported())) return null;
    return getMessaging(app);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[FCM] Messaging no está disponible en este navegador.', error);
    }
    return null;
  }
}

// 🔥 EXPORTAR TODAS LAS FUNCIONES DE AUTH
export {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,  // 🔥 EXPORTAR updateProfile
};

// 🔥 EXPORTAR FUNCIONES DE FIRESTORE
export {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  writeBatch,
  Timestamp,
};

// 🔥 TIPOS
export type { User, UserCredential, DocumentData, QueryDocumentSnapshot };

// 🔥 ENUM Y HANDLER DE ERRORES
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    }
  };
  console.error('Firestore Error:', errInfo);
  throw new Error(JSON.stringify(errInfo));
}

console.log('✅ Firebase inicializado correctamente');
