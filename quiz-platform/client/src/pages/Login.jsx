import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export default function Login() {
  const { user, loginWithGoogle } = useAuth();
  const button = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const initialize = () => {
      window.google?.accounts.id.initialize({ client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, callback: ({ credential }) => loginWithGoogle(credential).catch((e) => setError(e.message)) });
      window.google?.accounts.id.renderButton(button.current, { theme: 'outline', size: 'large', shape: 'pill' });
    };
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.onload = initialize; document.head.appendChild(script);
    return () => script.remove();
  }, [loginWithGoogle]);
  if (user) return <Navigate to="/" replace />;
  return <main className="center"><section className="login-card"><span className="eyebrow">AI QUIZ PLATFORM</span><h1>เรียนรู้จากคำถาม<br/>ที่สร้างมาเพื่อคุณ</h1><p>เข้าสู่ระบบด้วยบัญชี Google เพื่อสร้างและประเมินแบบทดสอบด้วย Gemini AI</p><div ref={button} className="google-button" />{error && <p className="error">{error}</p>}</section></main>;
}
