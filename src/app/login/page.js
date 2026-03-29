"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import "./login.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { data, error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      if (isSignUp) {
        setMessage({ type: "success", text: "Verifique seu e-mail para confirmar o cadastro!" });
      } else {
        router.push("/");
        router.refresh();
      }
    }
    setLoading(false);
  };

  return (
    <main className="app-container">
      <div className="login-container fade-in">
        <header className="app-header">
          <h1 className="app-title">Ambient AI</h1>
          <p className="app-subtitle">Sua jornada de design começa aqui</p>
        </header>

        <div className="login-card slide-up">
          <div className="login-header">
            <h2 className="login-title">{isSignUp ? "Criar Conta" : "Entrar"}</h2>
            <p className="login-subtitle">
              {isSignUp ? "Registre-se para salvar seu histórico" : "Faça login no seu painel de design"}
            </p>
          </div>

          <form className="login-form" onSubmit={handleAuth}>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="form-input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {message && (
              <div className={`message message-${message.type}`}>
                {message.text}
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "Processando..." : (isSignUp ? "Cadastrar" : "Entrar")}
            </Button>
          </form>

          <footer className="login-footer">
            <p>
              {isSignUp ? "Já tem uma conta?" : "Não tem uma conta?"}{" "}
              <span className="login-link" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? "Faça login" : "Cadastre-se"}
              </span>
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
