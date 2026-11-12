import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Deterministic identifier for a 1:1 conversation between two users.
 * Both participants derive the same value, so the chat document can be
 * created idempotently from either side.
 */
export function buildChatId(firstUid: string, secondUid: string): string {
  return [firstUid, secondUid].sort().join('_');
}

/**
 * Firestore rules only let a participant read or write a conversation whose
 * `chats/{chatId}.participants` document lists them, so the conversation
 * document must exist before the first message is written.
 * Creating it twice is harmless: the second write is a no-op read.
 */
export async function ensureChatDocument(chatId: string, participants: [string, string]): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);
  try {
    const snapshot = await getDoc(chatRef);
    if (snapshot.exists()) return;
    await setDoc(chatRef, {
      participants,
      createdAt: new Date(),
      lastMessageAt: new Date(),
    });
  } catch (error) {
    // Never block the message on the chat document: rules will reject the
    // message write itself if the participant is not allowed to send.
    console.warn('[chat] Could not ensure chat document:', error);
  }
}
