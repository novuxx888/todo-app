import { useEffect, useMemo, useState } from 'react';
import { auth, db, provider } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [text, setText] = useState('');
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // Subscribe to this user's todos
  useEffect(() => {
    if (!user) { setTodos([]); setLoading(false); return; }
    setLoading(true);
    const todosRef = collection(db, 'users', user.uid, 'todos');
    const q = query(todosRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleAdd = async (e) => {
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
  };

  const toggleTodo = async (id, completed) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'todos', id);
    await updateDoc(ref, { completed: !completed, updatedAt: serverTimestamp() });
  };

  const removeTodo = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'todos', id));
  };

  const left = useMemo(() => todos.filter(t => !t.completed).length, [todos]);

  if (!user) {
    return (
      <div style={{minHeight:'100vh',display:'grid',placeItems:'center'}}>
        <button onClick={() => signInWithPopup(auth, provider)}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div style={{maxWidth:520, margin:'40px auto', fontFamily:'system-ui, sans-serif'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <h1 style={{fontSize:22, fontWeight:700}}>TD · Todo</h1>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          {user.photoURL && <img src={user.photoURL} alt="" style={{width:32, height:32, borderRadius:999}} />}
          <button onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </header>

      <form onSubmit={handleAdd} style={{display:'flex', gap:8}}>
        <input
          placeholder="Add a task…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{flex:1, padding:'8px 10px'}}
        />
        <button type="submit">Add</button>
      </form>

      <div style={{marginTop:8, color:'#666', fontSize:14}}>{left} left</div>

      <ul style={{marginTop:12, padding:0, listStyle:'none'}}>
        {loading ? (
          <li style={{padding:'24px 0', textAlign:'center', color:'#999'}}>Loading…</li>
        ) : todos.length === 0 ? (
          <li style={{padding:'24px 0', textAlign:'center', color:'#999'}}>No tasks yet. Add one above.</li>
        ) : (
          todos.map(t => (
            <li key={t.id} style={{display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderTop:'1px solid #eee'}}>
              <input
                type="checkbox"
                checked={!!t.completed}
                onChange={() => toggleTodo(t.id, !!t.completed)}
              />
              <span style={{flex:1, textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? '#999' : 'inherit'}}>
                {t.text}
              </span>
              <button onClick={() => removeTodo(t.id)} style={{color:'#d11'}}>Delete</button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
