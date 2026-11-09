import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/** Updates an existing enrollment atomically; Firestore rules remain the authority for who may write. */
export async function updateProgress(enrollmentId: string, progress: number): Promise<void> {
  if (!enrollmentId.trim()) throw new Error("La matrícula no es válida.");
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) throw new Error("El progreso debe estar entre 0 y 100.");
  const reference = doc(db, "enrollments", enrollmentId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new Error("La matrícula ya no existe.");
    const current = Number(snapshot.data().progress || 0);
    if (progress < current) throw new Error("El progreso no puede retroceder.");
    transaction.update(reference, {
      progress,
      completed: progress >= 100,
      updatedAt: serverTimestamp(),
    });
  });
}
