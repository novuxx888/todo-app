// src/App.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import Sprite from './components/Sprite';
import { auth, db, provider } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  setDoc,
  getDoc,
  runTransaction,
  increment,
} from 'firebase/firestore';

const XP_PER_TASK = 10;

// Celebration animation settings
const CELEB_FRAMES = 6;            // your celebrate sheet has 6 frames
const CELEB_FPS = 3;               // slower, satisfying pace
const CELEB_DURATION = CELEB_FRAMES / CELEB_FPS; // seconds (6/3 = 2.0s)

// Level curve helpers
function xpNeededFor(level) { return level * 100; }
function levelFromTotalXP(totalXP) {
  let level = 1, remaining = totalXP;
  while (remaining >= xpNeededFor(level)) { remaining -= xpNeededFor(level); level += 1; }
  return { level, intoLevelXP: remaining, needed: xpNeededFor(level) };
}

export default function App() {
  const [user, setUser] = useState(null);

  // Todos
  const [text, setText] = useState('');
  const [todos, setTodos] = useState([]);
  const [loadingTodos, setLoadingTodos] = useState(true);

  // Profile / XP
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [progress, setProgress] = useState({ intoLevelXP: 0, needed: 100 });

  // Celebration state
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0); // force remount to restart animation

  // unsub refs
  const todosUnsubRef = useRef(null);
  const profileUnsubRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      // cleanup old listeners
      todosUnsubRef.current?.();
      profileUnsubRef.current?.();

      setUser(u || null);
      if (!u) {
        setTodos([]);
        setLoadingTodos(false);
        setXP(0); setLevel(1); setProgress({ intoLevelXP: 0, needed: 100 });
        setCelebrate(false);
        return;
      }

      await ensureProfile(u.uid);
      attachProfileListener(u.uid);
      attachTodosListener(u.uid);
    });

    return () => { unsub(); todosUnsubRef.current?.(); profileUnsubRef.current?.(); };
  }, []);

  function attachTodosListener(uid) {
    setLoadingTodos(true);
    const todosRef = collection(db, 'users', uid, 'todos');
    const qy = query(todosRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(qy, (snap) => {
      setTodos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingTodos(false);
    });
    todosUnsubRef.current = unsub;
  }

  function attachProfileListener(uid) {
    const pRef = doc(db, 'users', uid);
    const unsub = onSnapshot(pRef, (snap) => {
      if (!snap.exists()) return;
      const totalXP = snap.data()?.xp || 0;
      const curve = levelFromTotalXP(totalXP);
      setXP(totalXP); setLevel(curve.level);
      setProgress({ intoLevelXP: curve.intoLevelXP, needed: curve.needed });
    });
    profileUnsubRef.current = unsub;
  }

  async function ensureProfile(uid) {
    const pRef = doc(db, 'users', uid);
    const snap = await getDoc(pRef);
    if (!snap.exists()) {
      await setDoc(pRef, {
        xp: 0,
        level: 1, // optional; UI derives from xp
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  async function handleAdd(e) {
    e?.preventDefault();
    const textTrim = text.trim();
    if (!user || !textTrim) return;
    await addDoc(collection(db, 'users', user.uid, 'todos'), {
      text: textTrim,
      completed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setText('');
  }

  // Complete = award XP + delete task (transaction: read BEFORE writes)
  async function toggleTodo(id) {
    if (!user) return;
    const todoRef = doc(db, 'users', user.uid, 'todos', id);
    const profileRef = doc(db, 'users', user.uid);

    await runTransaction(db, async (trx) => {
      const todoSnap = await trx.get(todoRef); // READ FIRST
      if (!todoSnap.exists()) throw new Error('Todo missing');

      // Award XP, then delete task doc so it disappears
      trx.update(profileRef, {
        xp: increment(XP_PER_TASK),
        updatedAt: serverTimestamp(),
      });
      trx.delete(todoRef);
    });

    // Start celebration: force remount so animation restarts from frame 0
    setCelebrateKey(k => k + 1);
    setCelebrate(true);
    // We DO NOT set a timeout here. We flip back to idle on animation end (see onEnd below).
  }

  async function removeTodo(id) {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'todos', id));
  }

  const left = useMemo(() => todos.length, [todos]); // active tasks only
  const pct = Math.max(0, Math.min(100, Math.round((progress.intoLevelXP / progress.needed) * 100)));

  if (!user) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', gap: 12 }}>
      <button onClick={() => signInWithPopup(auth, provider)}>Sign in with Google</button>
    </div>
  );
}

return (
  <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'system-ui, sans-serif' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {/* Wrapper stage for the sprite */}
        <div
          style={{
            width: 256,   // 👈 bigger box the sprite lives in
            height: 256,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f0f0f0',
            borderRadius: 12,
          }}
        >
          {celebrate ? (
            <Sprite
              key={`celebrate-${celebrateKey}`}      // force remount on each celebration
              src="/sprites/hero_celebrate.png"
              frameWidth={32}
              frameHeight={32}
              frameCount={CELEB_FRAMES}
              durationSecs={CELEB_DURATION}          // explicit duration (2.0s at 3 fps)
              scale={4}                              // character size (128×128)
              playing={true}
              loop={false}
              horizontal={true}                       // frames laid out left→right
              frameGap={0}                            // change to 1 if there’s spacing
              alt="Hero celebrates"
              onEnd={() => setCelebrate(false)}       // return to idle exactly when animation ends
            />
          ) : (
            <Sprite
              src="/sprites/hero_idle.png"
              frameWidth={32}
              frameHeight={32}
              frameCount={1}
              fps={1}
              scale={4}
              playing={true}
              loop={true}
              horizontal={true}
              alt="Hero idle"
            />
          )}
        </div>

          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>TD · Todo</h1>
            <div style={{ fontSize: 14, color: '#555' }}>Level {level} · {xp} XP</div>
            <div style={{ height: 8, background: '#eee', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#60a5fa' }} />
            </div>
            <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>
              {progress.intoLevelXP}/{progress.needed} XP to next level
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: 999 }} />}
          <button onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </header>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Add a task…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1, padding: '8px 10px' }}
        />
        <button type="submit">Add</button>
      </form>

      <div style={{ marginTop: 8, color: '#666', fontSize: 14 }}>{left} left</div>

      <ul style={{ marginTop: 12, padding: 0, listStyle: 'none' }}>
        {loadingTodos ? (
          <li style={{ padding: '24px 0', textAlign: 'center', color: '#999' }}>Loading…</li>
        ) : todos.length === 0 ? (
          <li style={{ padding: '24px 0', textAlign: 'center', color: '#999' }}>
            No tasks yet. Add one above.
          </li>
        ) : (
          todos.map((t) => (
            <li
              key={t.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid #eee' }}
            >
              <input
                type="checkbox"
                checked={false /* active tasks only, always unchecked */}
                onChange={() => toggleTodo(t.id)}
              />
              <span style={{ flex: 1 }}>{t.text}</span>
              <button onClick={() => removeTodo(t.id)} style={{ color: '#d11' }}>
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
