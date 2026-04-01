"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UploadArea from "../components/UploadArea";
import FormPanel from "../components/FormPanel";
import Button from "../components/Button";
import Loader from "../components/Loader";
import ImageResult from "../components/ImageResult";
import HistorySidebar from "../components/HistorySidebar";
import { Zap, LogOut, User, History, Sun, Moon } from "lucide-react";

export default function Home() {
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const [currentBlob, setCurrentBlob] = useState(null); 
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [formValues, setFormValues] = useState({
    ambiente: "Sala de Estar",
    customAmbiente: "",
    estilo: "Moderno",
    orcamento: "Médio",
    intensidade: "Média",
    preferencias: ""
  });
  const [theme, setTheme] = useState("light");

  const [resultImageUrl, setResultImageUrl] = useState(null);
  const resultRef = useRef(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
      } else {
        setUser(authUser);
        fetchProfile(authUser.id);
      }
    };
    getUser();

    const fetchProfile = async (userId) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setUserProfile(data);
      }
    };

    // Dark mode logic
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  useEffect(() => {
    if (status === "success" && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleFormChange = (name, value) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const saveGenerationToSupabase = async (blob, finalAmbiente, prefs) => {
    if (!user) return;

    try {
      const fileName = `${user.id}/${Date.now()}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generations')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('generations')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('generations')
        .insert({
          user_id: user.id,
          generated_image_url: publicUrl,
          settings: {
            ambiente: finalAmbiente,
            estilo: formValues.estilo,
            orcamento: formValues.orcamento,
            intensidade: formValues.intensidade,
            preferencias: prefs
          }
        });

      if (dbError) throw dbError;
      setRefreshHistory(prev => prev + 1);
    } catch (err) {
      console.error("Erro ao salvar histórico:", err);
    }
  };

  const handleStartProject = async () => {
    if (!selectedFile) {
      alert("Selecione uma imagem.");
      return;
    }

    setStatus("loading");
    setResultImageUrl(null);
    setCurrentBlob(null);

    const finalAmbiente = formValues.ambiente === "Outro" ? formValues.customAmbiente : formValues.ambiente;

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("ambiente", finalAmbiente);
    formData.append("estilo", formValues.estilo);
    formData.append("orcamento", formValues.orcamento);
    formData.append("intensidade", formValues.intensidade);
    formData.append("preferencias", formValues.preferencias);

    await performRequest(formData, finalAmbiente, formValues.preferencias);
  };

  const handleRefineChat = async (message) => {
    if (!currentBlob || !message) return;

    setStatus("loading");
    const finalAmbiente = formValues.ambiente === "Outro" ? formValues.customAmbiente : formValues.ambiente;
    
    const formData = new FormData();
    formData.append("image", currentBlob, "current-design.png");
    formData.append("ambiente", finalAmbiente);
    formData.append("estilo", formValues.estilo);
    formData.append("orcamento", formValues.orcamento);
    formData.append("intensidade", formValues.intensidade);
    formData.append("preferencias", message);

    await performRequest(formData, finalAmbiente, message);
  };

  const performRequest = async (formData, finalAmbiente, currentPrefs) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData,
      });

      if (response.status === 402) {
        setStatus("idle");
        if (confirm("Você atingiu seu limite de créditos diários ou não possui saldo. Deseja adquirir mais créditos ou assinar um plano?")) {
          router.push("/pricing");
        }
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro na geração.");
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      setCurrentBlob(blob);
      setResultImageUrl(imageUrl);
      setStatus("success");

      // Atualiza o perfil para refletir o crédito usado
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setUserProfile(updatedProfile);

      saveGenerationToSupabase(blob, finalAmbiente, currentPrefs);
    } catch (error) {
      console.error(error);
      alert("Erro ao gerar. Tente novamente.");
      setStatus("error");
    }
  };

  const handleHistorySelect = async (gen) => {
    setResultImageUrl(gen.generated_image_url);
    
    // Tenta fetch do blob para permitir chat de refinamento
    try {
      const resp = await fetch(gen.generated_image_url);
      const blob = await resp.blob();
      setCurrentBlob(blob);
    } catch (err) {
      console.error("Não foi possível carregar o blob original para refinamento.");
    }

    // Nota: No histórico, não temos a imagem "Original" salva separadamente (o n8n gera a nova).
    // Para simplificar, desativaremos o slider no histórico ou mostraremos a mesma imagem.
    setOriginalImageUrl(gen.generated_image_url);

    setFormValues({
      ambiente: gen.settings.ambiente || "Outro",
      customAmbiente: gen.settings.ambiente || "",
      estilo: gen.settings.estilo || "Moderno",
      orcamento: gen.settings.orcamento || "Médio",
      intensidade: gen.settings.intensidade || "Média",
      preferencias: gen.settings.preferencias || ""
    });

    setStatus("success");
    setHistoryOpen(false);
  };

  const handleReset = () => {
    setStatus("idle");
    setResultImageUrl(null);
    setCurrentBlob(null);
    setSelectedFile(null);
    setOriginalImageUrl(null);
  };

  return (
    <main className="app-container">
      <HistorySidebar 
        isOpen={historyOpen} 
        onClose={() => setHistoryOpen(!historyOpen)} 
        onSelect={handleHistorySelect}
        refreshTrigger={refreshHistory}
      />

      <header className="main-navbar fade-in">
        <div className="navbar-content">
          <div className="logo-section" onClick={handleReset} style={{ cursor: 'pointer' }}>
            <img src="/logo.png" alt="Reformei" className="app-logo" />
            <h1 className="logo-text">Reformei</h1>
          </div>

          {user && (
            <div className="nav-actions">
              {userProfile && (
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
              )}
              <div className="divider"></div>
              <Link href="/pricing" className="nav-link">Planos</Link>
              <div className="divider"></div>
              <button onClick={() => setHistoryOpen(true)} className="nav-btn history-btn">
                <History size={18} />
                <span className="hide-mobile">Histórico</span>
              </button>
              <button onClick={toggleTheme} className="nav-btn theme-btn">
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button onClick={handleLogout} className="nav-btn logout-btn">
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="hero-section fade-in">
        <p className="app-subtitle">Recrie seu espaço com Inteligência Artificial</p>
      </section>

      <section className="main-content">
        {status === "error" && <div className="error-message">Falha ao gerar o ambiente.</div>}

        {status === "idle" || status === "error" ? (
          <>
            <UploadArea onFileSelect={setSelectedFile} onPreview={setOriginalImageUrl} />
            <FormPanel values={formValues} onChange={handleFormChange} />
            <Button onClick={handleStartProject} disabled={!selectedFile}>
              <Zap size={20} /> Começar Projeto
            </Button>
          </>
        ) : null}

        {status === "loading" && <Loader text="Processando seu design..." />}

        {status === "success" && resultImageUrl && (
          <div ref={resultRef} className="width-full pt-8">
            <ImageResult 
              imageUrl={resultImageUrl} 
              beforeImage={originalImageUrl} 
              onChatSubmit={handleRefineChat} 
              onReset={handleReset} 
            />
          </div>
        )}
      </section>

      <style jsx>{`
        .main-navbar {
          width: 100%;
          padding: 1rem 0;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .navbar-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 1.5rem;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .app-logo {
          height: 32px;
          width: auto;
        }
        .logo-text {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--primary-color);
          margin: 0;
          letter-spacing: -0.5px;
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .credits-display {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0.4rem 0.8rem;
          background: rgba(0,0,0,0.03);
          border-radius: 50px;
        }
        .plan-badge {
          background: var(--accent-color);
          color: white;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.6rem;
          font-weight: 800;
        }
        .credits-text {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.8rem;
          white-space: nowrap;
        }
        .divider { width: 1px; height: 16px; background: rgba(0,0,0,0.1); margin: 0 0.5rem; }
        .nav-link {
          color: var(--text-primary);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.85rem;
          padding: 0.5rem 0.75rem;
          transition: color 0.2s;
        }
        .nav-link:hover { color: var(--accent-color); }
        .nav-btn { 
          background: none; 
          border: none; 
          color: var(--text-secondary); 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        .nav-btn:hover { background: rgba(0, 0, 0, 0.05); color: var(--text-primary); }
        .logout-btn:hover { color: var(--danger-color); }
        
        .hero-section {
          padding-top: 3rem;
          text-align: center;
        }
        .app-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
          font-weight: 300;
          max-width: 600px;
          margin: 0 auto 2rem;
        }

        @media (max-width: 768px) {
          .logo-text, .hide-mobile, .divider { display: none; }
          .navbar-content { padding: 0 1rem; }
        }
        .width-full { width: 100%; }
        .pt-8 { padding-top: 2rem; }
      `}</style>
    </main>
  );
}

