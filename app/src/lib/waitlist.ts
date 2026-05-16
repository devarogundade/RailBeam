import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb, WAITLIST_COLLECTION } from "@/lib/firebase";

export function subscribeWaitlistCount(onCount: (count: number) => void): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) {
    onCount(0);
    return null;
  }

  const coll = collection(db, WAITLIST_COLLECTION);
  return onSnapshot(
    coll,
    (snapshot) => onCount(snapshot.size),
    () => onCount(0),
  );
}

export async function joinWaitlist(email: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error("Waitlist is not configured.");
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Enter a valid email address.");
  }

  await setDoc(
    doc(db, WAITLIST_COLLECTION, normalized),
    {
      email: normalized,
      agreed: true,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}
