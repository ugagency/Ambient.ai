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
import { Zap, LogOut, User, Menu } from "lucide-react";

export default function Home() {
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [selectedFile, setSelectedFile] = useState(null);
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
  }, []);

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
            <User size={16} />
            <span>{user.email}</span>
            <div className="divider"></div>
            <button onClick={handleLogout} className="logout-btn" title="Sair">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </nav>

      <header className="app-header fade-in">
        <h1 className="app-title">Ambient AI</h1>
        <p className="app-subtitle">Recrie seu espaço com Inteligência Artificial</p>
      </header>

      <section className="main-content">
        {status === "error" && <div className="error-message">Falha ao gerar o ambiente.</div>}

        {status === "idle" || status === "error" ? (
          <>
            <UploadArea onFileSelect={setSelectedFile} />
            <FormPanel values={formValues} onChange={handleFormChange} />
            <Button onClick={handleStartProject} disabled={!selectedFile}>
              <Zap size={20} /> Começar Projeto
            </Button>
          </>
        ) : null}

        {status === "loading" && <Loader text="Processando seu design..." />}

        {status === "success" && resultImageUrl && (
          <div ref={resultRef} className="width-full pt-8">
            <ImageResult imageUrl={resultImageUrl} onChatSubmit={handleRefineChat} onReset={handleReset} />
          </div>
        )}
      </section>

      <style jsx>{`
        .user-nav {
          width: 100%;
          display: flex;
          justify-content: flex-end;
          margin-bottom: -1rem;
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg-panel);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          border: 1px solid var(--border-color);
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .divider { width: 1px; height: 14px; background: var(--border-color); }
        .logout-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; padding: 2px; }
        .logout-btn:hover { color: var(--danger-color); }
        .width-full { width: 100%; }
        .pt-8 { padding-top: 2rem; }
      `}</style>
    </main>
  );
}

