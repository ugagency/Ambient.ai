"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import "../login/login.css";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [session, setSession] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Verificar se o usuário tem uma sessão ativa (vinda do link de recuperação)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setMessage({ type: "error", text: "Link de recuperação expirado ou inválido." });
      }
    });
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "As senhas não coincidem." });
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Senha atualizada com sucesso! Redirecionando..." });
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <main className="app-container">
      <div className="login-container fade-in">
        <header className="app-header">
          <div className="logo-container">
            <img src="/logo.png" alt="Reformei" className="app-logo" />
          </div>
          <p className="app-subtitle">Sua jornada de reforma começa aqui</p>
        </header>

        <div className="login-card slide-up">
          <div className="login-header">
            <h2 className="login-title">Nova Senha</h2>
            <p className="login-subtitle">Escolha uma nova senha segura para sua conta</p>
          </div>

          <form className="login-form" onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">Nova Senha</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Confirmar Nova Senha</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {message && (
              <div className={`message message-${message.type}`}>
                {message.text}
              </div>
            )}

            <Button type="submit" disabled={loading || !session}>
              {loading ? "Atualizando..." : "Definir Nova Senha"}
            </Button>
          </form>

          {(!session && !loading) && (
            <footer className="login-footer">
              <p>
                <span className="login-link" onClick={() => router.push("/login")}>
                  Voltar para o Login
                </span>
              </p>
            </footer>
          )}
        </div>
      </div>
    </main>
  );
}
