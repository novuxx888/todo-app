import { useEffect, useState } from 'react';
import { auth, provider } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u || null));
    return () => unsub();
  }, []);

  if (!user) {
    return (
      <div style={{ minHeight:'100vh', display:'grid', placeItems:'center' }}>
        <button onClick={() => signInWithPopup(auth, provider)}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', gap: 8 }}>
      <div>Signed in as {user.displayName}</div>
      <button onClick={() => signOut(auth)}>Sign out</button>
    </div>
  );
}
