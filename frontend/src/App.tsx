import { Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/Authpage.tsx";
import LobbyPage from "./pages/LobbyPage.tsx";
import ChatPage from "./pages/ChatPage.tsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth" />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/lobby" element={<LobbyPage />} />
      <Route path="/chat/:roomId" element={<ChatPage />} />
    </Routes>
  );
}

export default App;