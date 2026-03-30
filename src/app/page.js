"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
      }
    };
    getUser();

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
      const response = await fetch(process.env.NEXT_PUBLIC_WEBHOOK_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Erro na rede.");

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      
      setCurrentBlob(blob);
      setResultImageUrl(imageUrl);
      setStatus("success");

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

      <nav className="user-nav fade-in">
        {user && (
          <div className="user-info">
            <button onClick={() => setHistoryOpen(true)} className="nav-btn" title="Histórico">
              <History size={16} />
              <span>Histórico</span>
            </button>
            <div className="divider"></div>
            <div className="user-details">
              <User size={16} />
              <span>{user.email}</span>
            </div>
            <div className="divider"></div>
            <button onClick={toggleTheme} className="nav-btn theme-btn" title="Alternar Tema">
              {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              <span>{theme === "light" ? "Modo Escuro" : "Modo Claro"}</span>
            </button>
            <div className="divider"></div>
            <button onClick={handleLogout} className="nav-btn logout-btn" title="Sair">
              <LogOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        )}
      </nav>

      <header className="app-header fade-in">
        <div className="logo-container">
          <img src="/logo.png" alt="Reformei" className="app-logo" />
        </div>
        <p className="app-subtitle">Recrie seu espaço com Inteligência Artificial</p>
      </header>

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
        .user-nav {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
          z-index: 10;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 0.5rem 0.75rem;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .user-details {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0 0.5rem;
          opacity: 0.8;
        }
        .divider { width: 1px; height: 16px; background: rgba(0,0,0,0.1); margin: 0 0.25rem; }
        .nav-btn { 
          background: none; 
          border: none; 
          color: var(--text-secondary); 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 100px;
          transition: all 0.2s ease;
          font-weight: 500;
        }
        .nav-btn:hover { 
          background: rgba(255, 255, 255, 0.4);
          color: var(--text-primary); 
        }
        .logout-btn:hover { color: var(--danger-color); }
        .logo-container {
          margin-bottom: 1rem;
          display: flex;
          justify-content: center;
        }
        .app-logo {
          height: 60px;
          width: auto;
          object-fit: contain;
        }
        .width-full { width: 100%; }
        .pt-8 { padding-top: 2rem; }
      `}</style>
    </main>
  );
}

