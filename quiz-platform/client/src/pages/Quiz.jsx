import { useState } from 'react';
import { api } from '../api';
export default function Quiz() {
  const [topic, setTopic] = useState(''); const [result, setResult] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (e) => { e.preventDefault(); setBusy(true); setError(''); try { setResult(await api('/quizzes/generate', { method: 'POST', body: JSON.stringify({ topic, difficulty: 'medium', count: 5 }) })); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <main><section className="hero compact"><span className="eyebrow">GEMINI POWERED</span><h1>สร้างแบบทดสอบใหม่</h1></section><form className="panel" onSubmit={submit}><label>หัวข้อที่ต้องการ<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="เช่น พื้นฐาน JavaScript" required /></label><button disabled={busy}>{busy ? 'กำลังสร้าง…' : 'สร้างคำถาม'}</button>{error && <p className="error">{error}</p>}</form>{result && <pre className="result">{JSON.stringify(result.quiz, null, 2)}</pre>}</main>;
}
