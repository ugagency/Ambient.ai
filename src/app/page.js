"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Upload, 
  RefreshCw, 
  Download, 
  History, 
  LogOut, 
  Zap, 
  Moon, 
  Sun, 
  User, 
  ChevronRight,
  Check,
  Star
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import UploadArea from '@/components/UploadArea';
import FormPanel from '@/components/FormPanel';
import HistorySidebar from '@/components/HistorySidebar';
import ImageResult from '@/components/ImageResult';
import Button from '@/components/Button';

export default function Home() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle, uploading, generating, success, error
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const [formValues, setFormValues] = useState({
    ambiente: "Sala de Estar",
    customAmbiente: "",
    estilo: "Moderno",
    orcamento: "Médio",
    intensidade: "Média",
    preferencias: ""
  });

  const [resultImageUrl, setResultImageUrl] = useState(null);
  const resultRef = useRef(null);
  const supabase = createClient();
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        fetchProfile();
      } else {
        router.push("/login");
      }
    });

    const checkUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        fetchProfile();
      }
    };
    checkUser();

    async function fetchProfile() {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
        } else {
          console.error("Erro ao carregar perfil:", response.statusText);
        }
      } catch (err) {
        console.error("Erro na requisição do perfil:", err);
      }
    }

    document.documentElement.setAttribute("data-theme", "light");
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleFormChange = (name, value) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setStatus("idle");
    setSelectedFile(null);
    setOriginalImageUrl(null);
    setResultImageUrl(null);
  };

  const handleChatSubmit = async (message) => {
    if (!message.trim()) return;
    setStatus("generating");
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("image", selectedFile);
      } else if (resultImageUrl) {
        // Send the current result image URL for iterative refinement
        const response = await fetch(resultImageUrl);
        const blob = await response.blob();
        formData.append("image", blob, "current-design.png");
      }
      formData.append("ambiente", formValues.ambiente === "Outro" ? formValues.customAmbiente : formValues.ambiente);
      formData.append("estilo", formValues.estilo);
      formData.append("orcamento", formValues.orcamento);
      formData.append("intensidade", formValues.intensidade);
      formData.append("preferencias", message);

      const { data: { session } } = await supabase.auth.getSession();
      
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData,
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Erro na geração");
      }

      const contentType = resp.headers.get("content-type");
      if (contentType && contentType.includes("image")) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        setResultImageUrl(url);
      } else {
        const data = await resp.json();
        setResultImageUrl(data.image_url);
      }
      
      setStatus("success");
      setRefreshHistory(prev => prev + 1);
      fetchProfile();
    } catch (error) {
      console.error("Chat error:", error);
      setStatus("success"); // Keep showing result even on chat error
      alert(error.message);
    }
  };

  const handleStartProject = async () => {
    if (!selectedFile) return;

    setStatus("generating");
    
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("ambiente", formValues.ambiente === "Outro" ? formValues.customAmbiente : formValues.ambiente);
      formData.append("estilo", formValues.estilo);
      formData.append("orcamento", formValues.orcamento);
      formData.append("intensidade", formValues.intensidade);
      formData.append("preferencias", formValues.preferencias);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na geração");
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("image")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setResultImageUrl(url);
      } else {
        const data = await response.json();
        setResultImageUrl(data.image_url);
      }
      
      setStatus("success");
      setRefreshHistory(prev => prev + 1);
      
      // Update profile locally to show new credit count
      fetchProfile();

    } catch (error) {
      console.error("Error:", error);
      setStatus("error");
      alert(error.message);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
    }
  };

  return (
    <main className="app-container">
      <HistorySidebar 
        isOpen={historyOpen} 
        onClose={() => setHistoryOpen(false)} 
        onSelect={(gen) => {
          setOriginalImageUrl(gen.original_image_url);
          setResultImageUrl(gen.generated_image_url);
          setStatus("success");
          setHistoryOpen(false);
        }}
        refreshTrigger={refreshHistory}
      />

      <header className="page-header fade-in">
        <div className="logo-container" onClick={handleReset} style={{ cursor: 'pointer' }}>
          <img src="/logo.png" alt="Logo" className="app-logo-large" />
        </div>
      </header>

      <nav className="glass-navbar fade-in">
        <div className="navbar-content">
          <div className="nav-actions">
            {userProfile ? (
              <div className="credits-display">
                <span className="plan-badge">{userProfile.plan_type.toUpperCase()}</span>
                <span className="credits-text">
                  {userProfile.plan_type === 'pro' ? (
                    "∞ Créditos"
                  ) : (
                    <>
                      {Math.max(0, (userProfile.plan_type === 'essencial' ? 15 : 5) - userProfile.daily_credits_used)} Diários 
                      {userProfile.extra_credits_balance > 0 && ` + ${userProfile.extra_credits_balance} Extras`}
                    </>
                  )}
                </span>
              </div>
            ) : (
              <div className="credits-display loading">Carregando...</div>
            )}
            
            <div className="divider"></div>
            <Link href="/pricing" className="nav-link">Planos</Link>
            <div className="divider"></div>
            
            <button onClick={() => setHistoryOpen(true)} className="nav-btn">
              <History size={18} />
              <span className="hide-mobile">Histórico</span>
            </button>
            <button onClick={handleLogout} className="nav-btn logout-btn">
              <LogOut size={18} />
              <span className="hide-mobile">Sair</span>
            </button>
          </div>
        </div>
      </nav>

      <section className="hero-section fade-in">
        <p className="app-subtitle">Recrie seu espaço com Inteligência Artificial</p>
      </section>

      <section className="main-content">
        {status === "error" && <div className="error-message">Falha ao gerar o ambiente.</div>}

        {status === "idle" || status === "error" ? (
          <>
            <UploadArea onFileSelect={setSelectedFile} onPreview={setOriginalImageUrl} />
            <FormPanel 
              values={formValues} 
              onChange={handleFormChange} 
              planType={userProfile?.plan_type}
            />
            <Button onClick={handleStartProject} disabled={!selectedFile}>
              <Zap size={20} /> Começar Projeto
            </Button>
          </>
        ) : status === "generating" ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h3>Transformando seu ambiente...</h3>
            <p>Isso pode levar até 30 segundos.</p>
          </div>
        ) : (
          <ImageResult 
            imageUrl={resultImageUrl} 
            beforeImage={originalImageUrl}
            onChatSubmit={handleChatSubmit}
            onReset={handleReset}
          />
        )}
      </section>

      <style jsx>{`
        .page-header {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 2.5rem 0 1rem;
        }
        .app-logo-large {
          height: 55px;
          width: auto;
        }
        .glass-navbar {
          width: fit-content;
          margin: 0 auto 2.5rem;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 100px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 1.5rem;
          z-index: 100;
          padding: 0.4rem 1.2rem;
        }
        .navbar-content {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .credits-display {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0.5rem 1rem;
          background: rgba(16, 101, 88, 0.05);
          border-radius: 50px;
        }
        .credits-display.loading { font-size: 0.7rem; opacity: 0.5; }
        .plan-badge {
          background: var(--accent-color);
          color: white;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .credits-text {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 0.85rem;
          white-space: nowrap;
        }
        .divider { width: 1px; height: 20px; background: rgba(0,0,0,0.08); margin: 0 0.4rem; }
        .nav-link {
          color: var(--text-primary);
          text-decoration: none;
          font-weight: 700;
          font-size: 0.85rem;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          transition: all 0.2s;
        }
        .nav-link:hover { background: rgba(0,0,0,0.03); color: var(--accent-color); }
        .nav-btn { 
          background: none; 
          border: none; 
          color: var(--text-secondary); 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          transition: all 0.2s ease;
          font-weight: 600;
          font-size: 0.85rem;
        }
        .nav-btn:hover { background: rgba(0, 0, 0, 0.03); color: var(--text-primary); }
        .logout-btn:hover { color: var(--danger-color); background: rgba(220, 38, 38, 0.05); }
        
        .hero-section { text-align: center; margin-bottom: 3rem; }
        .app-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
          font-weight: 400;
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .hide-mobile, .divider { display: none; }
          .glass-navbar { width: 95%; padding: 0.3rem 0.8rem; }
          .app-logo-large { height: 45px; }
        }

        .app-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem 5rem;
          min-height: 100vh;
        }
        .main-content {
          max-width: 700px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          width: 100%;
        }
        .loading-container {
          text-align: center;
          padding: 4rem 2rem;
          background: var(--bg-panel);
          border-radius: 24px;
          width: 100%;
          border: 1px solid var(--border-color);
        }
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(16, 101, 88, 0.1);
          border-top: 4px solid var(--accent-color);
          border-radius: 50%;
          margin: 0 auto 1.5rem;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .error-message {
          background: #fee2e2;
          color: #b91c1c;
          padding: 1rem;
          border-radius: 12px;
          width: 100%;
          text-align: center;
          font-weight: 500;
        }
      `}</style>
    </main>
  );
}
