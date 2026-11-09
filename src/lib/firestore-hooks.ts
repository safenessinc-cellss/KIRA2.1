import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type Query,
  type QueryDocumentSnapshot,
  type CollectionReference,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import type { Role, User } from "../../types";

type SnapshotState<T> = { data: T | null; loading: boolean; error: Error | null };

export function useDocument<T = DocumentData>(reference: DocumentReference<T> | null): SnapshotState<T> {
  const [state, setState] = useState<SnapshotState<T>>({ data: null, loading: Boolean(reference), error: null });
  useEffect(() => {
    if (!reference) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState(current => ({ ...current, loading: true, error: null }));
    return onSnapshot(reference, snapshot => {
      setState({ data: snapshot.exists() ? snapshot.data() : null, loading: false, error: null });
    }, cause => setState({ data: null, loading: false, error: cause }));
  }, [reference]);
  return state;
}

export function useCollection<T = DocumentData>(source: Query<T> | CollectionReference<T> | null): {
  data: Array<T & { id: string }>;
  loading: boolean;
  error: Error | null;
} {
  const [state, setState] = useState<{ data: Array<T & { id: string }>; loading: boolean; error: Error | null }>({
    data: [], loading: Boolean(source), error: null,
  });
  useEffect(() => {
    if (!source) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState(current => ({ ...current, loading: true, error: null }));
    return onSnapshot(source, snapshot => {
      setState({
        data: snapshot.docs.map((item: QueryDocumentSnapshot<T>) => ({ id: item.id, ...item.data() })),
        loading: false,
        error: null,
      });
    }, cause => setState({ data: [], loading: false, error: cause }));
  }, [source]);
  return state;
}

export function useUser() {
  const { user, loading } = useAuth();
  const ref = user?.uid ? doc(db, "users", user.uid) : null;
  const profile = useDocument<User>(ref);
  return { user: profile.data, loading: loading || profile.loading, error: profile.error };
}

export function useRole(): { role: Role | null; loading: boolean } {
  const { role, loading } = useAuth();
  return { role: role as Role | null, loading };
}
