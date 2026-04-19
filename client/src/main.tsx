import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ToastProvider } from "@/components/ui/Toast";
import { LoginGate } from "@/components/LoginGate";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { WordlePage } from "@/pages/Wordle";
import { GachaPage } from "@/pages/Gacha";
import { ScribblePage } from "@/pages/Scribble";
import { WhiteboardPage } from "@/pages/Whiteboard";
import { LeaderboardPage } from "@/pages/Leaderboard";
import { AdminPage } from "@/pages/Admin";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <LoginGate>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="wordle" element={<WordlePage />} />
                  <Route path="gacha" element={<GachaPage />} />
                  <Route path="scribble" element={<ScribblePage />} />
                  <Route path="whiteboard" element={<WhiteboardPage />} />
                  <Route path="leaderboard" element={<LeaderboardPage />} />
                  <Route path="admin" element={<AdminPage />} />
                </Route>
              </Routes>
            </LoginGate>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
