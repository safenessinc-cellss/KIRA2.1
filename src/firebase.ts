import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

// Configuración CORRECTA de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAZ3rzWYvaXYv0Wbc061Hahz6yir-L8rw8",
  authDomain: "kira2-a6a20.firebaseapp.com",
  projectId: "kira2-a6a20",
  storageBucket: "kira2-a6a20.firebasestorage.app",
  messagingSenderId: "981129066179",
  appId: "1:981129066179:web:568a570bb67402cfa01476",
  measurementId: "G-HDF2RLJGHB"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Nota: enableIndexedDbPersistence está deprecado, no lo uses por ahora
// Si necesitas offline, usa: import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
async function testConnection() {
  try {
    if (typeof window !== 'undefined') {
      await getDoc(doc(db, 'test', 'connection'));
      console.log("✅ Firebase connection established successfully.");
    }
  } catch (error) {
    console.error("❌ Firebase connection error:", error);
  }
}
testConnection();
