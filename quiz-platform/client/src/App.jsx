import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './state/AuthContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Quiz from './pages/Quiz';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="center">กำลังตรวจสอบสิทธิ์…</main>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, logout } = useAuth();
  return <div className="app-shell">
    <header><NavLink className="brand" to="/">Quiz Studio</NavLink>{user && <nav><NavLink to="/">ภาพรวม</NavLink><NavLink to="/quiz">สร้างแบบทดสอบ</NavLink><button className="link" onClick={logout}>ออกจากระบบ</button></nav>}</header>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/quiz" element={<Protected><Quiz /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </div>;
}
