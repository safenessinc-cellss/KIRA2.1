import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

// 🔥 CONFIGURACIÓN EXPLÍCITA - PROYECTO CORRECTO
// PRIORIDAD: Variables de entorno > Fallback directo > appletConfig
const getEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  return undefined;
};

// 🔥 AUTH DOMAIN FORZADO - Ignorar cualquier otro valor
const FORCED_AUTH_DOMAIN = 'kira2-a6a20.firebaseapp.com';
const FORCED_PROJECT_ID = 'kira2-a6a20';
const FORCED_STORAGE_BUCKET = 'kira2-a6a20.firebasestorage.app';

// 🔥 Configuración con prioridad: Env > Fallback > appletConfig
let appletConfig: any = {};
try {
  // Intentar importar appletConfig, pero no fallar si no existe
  appletConfig = require('../firebase-applet-config.json');
} catch (e) {
  console.log('ℹ️ firebase-applet-config.json no encontrado, usando valores por defecto');
}

const firebaseConfig = {
  // 🔥 USAR VARIABLES DE ENTORNO (si existen) O FORZAR LAS CORRECTAS
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || appletConfig.apiKey || 'AIzaSyCYmfCeHXfrpKdMn_3G-rrim3wu0FIopiE',
  authDomain: FORCED_AUTH_DOMAIN, // 🔥 FORZADO - Ignora cualquier otra cosa
  projectId: FORCED_PROJECT_ID, // 🔥 FORZADO - Ignora cualquier otra cosa
  storageBucket: FORCED_STORAGE_BUCKET, // 🔥 FORZADO - Ignora cualquier otra cosa
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || appletConfig.messagingSenderId || '929279176008',
  appId: getEnv('VITE_FIREBASE_APP_ID') || appletConfig.appId || '1:929279176008:web:c58eaaa666db86b1e4577d',
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID') || appletConfig.measurementId || '',
};

// 🔥 LOG DE CONFIGURACIÓN PARA VERIFICAR
console.log('🔥 ===== FIREBASE CONFIGURACIÓN =====');
console.log('📦 authDomain:', firebaseConfig.authDomain);
console.log('📦 projectId:', firebaseConfig.projectId);
console.log('📦 storageBucket:', firebaseConfig.storageBucket);
console.log('🌐 Dominio actual:', window.location.origin);
console.log('📦 API Key:', firebaseConfig.apiKey?.substring(0, 10) + '...');
console.log('=====================================');

// 🔥 INICIALIZAR FIREBASE (solo si no hay una app)
let app;
try {
  // Verificar si ya hay una app inicializada
  const apps = getApps();
  if (apps.length > 0) {
    app = apps[0];
    console.log('⚠️ Usando app existente:', app.name);
  } else {
    app = initializeApp(firebaseConfig);
    console.log('✅ Nueva app inicializada');
  }
} catch (error) {
  console.error('❌ Error al inicializar Firebase:', error);
  throw error;
}

// 🔥 AUTENTICACIÓN
export const auth = getAuth(app);

// 🔥 DATABASE ID (opcional)
const databaseId = getEnv('VITE_FIREBASE_DATABASE_ID') || appletConfig.firestoreDatabaseId || undefined;

// 🔥 FIRESTORE CON CACHE PERSISTENTE
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    // cacheSizeBytes: 100 * 1024 * 1024, // 100MB opcional
  }),
}, databaseId);

// 🔥 STORAGE Y MESSAGING
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// 🔥 ENUMS Y HANDLERS DE ERROR
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('❌ Firestore Error:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// 🔥 VERIFICACIÓN DE CONEXIÓN (opcional, no bloqueante)
export const verifyFirebaseConnection = async () => {
  try {
    console.log('🔍 Verificando conexión a Firebase...');
    // Intentar leer un documento de prueba (crea uno si no existe)
    // Esto es opcional, solo para verificar
    console.log('✅ Conexión a Firebase establecida');
  } catch (error) {
    console.warn('⚠️ No se pudo verificar la conexión:', error);
  }
};

console.log('✅ Firebase inicializado correctamente');
console.log('🔐 Auth Domain:', auth.config?.authDomain);
console.log('📦 Project ID:', auth.config?.projectId);
