"use client";

import { useState, useRef, useEffect } from "react";
import UploadArea from "../components/UploadArea";
import FormPanel from "../components/FormPanel";
import Button from "../components/Button";
import Loader from "../components/Loader";
import ImageResult from "../components/ImageResult";
import { Zap } from "lucide-react";

export default function Home() {
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentBlob, setCurrentBlob] = useState(null); // Armazena o blob real da imagem atual
  const [formValues, setFormValues] = useState({
    ambiente: "Sala de Estar",
    customAmbiente: "",
    estilo: "Moderno",
    orcamento: "Médio",
    preferencias: ""
  });

  const [resultImageUrl, setResultImageUrl] = useState(null);

  const resultRef = useRef(null);

  useEffect(() => {
    if (status === "success" && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  const handleFormChange = (name, value) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleStartProject = async () => {
    if (!selectedFile) {
      alert("Por favor, selecione uma imagem do seu ambiente.");
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
    formData.append("preferencias", formValues.preferencias);

    await performRequest(formData);
  };

  const handleRefineChat = async (message) => {
    if (!currentBlob || !message) return;

    setStatus("loading");

    const finalAmbiente = formValues.ambiente === "Outro" ? formValues.customAmbiente : formValues.ambiente;

    const formData = new FormData();
    // Enviamos a imagem atual (blob) de volta para o webhook
    formData.append("image", currentBlob, "current-design.png");
    formData.append("ambiente", finalAmbiente);
    formData.append("estilo", formValues.estilo);
    formData.append("orcamento", formValues.orcamento);
    // Aqui enviamos a mensagem do chat como preferências de refinamento
    formData.append("preferencias", message);

    await performRequest(formData);
  };


  const performRequest = async (formData) => {
    try {
      console.log("Enviando requisição...", formData);
      const response = await fetch("https://automacoes-n8n.infrassys.com/webhook/ambientai", {
        method: "POST",
        body: formData,
      });

      console.log("Status da resposta:", response.status);
      console.log("Content-Type retornado:", response.headers.get("content-type"));

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const blob = await response.blob();
      console.log("Tamanho do Blob recebido (bytes):", blob.size);
      console.log("Tipo do Blob:", blob.type);

      if (blob.size === 0) {
        throw new Error("O webhook retornou um arquivo vazio (0 bytes). Verifique no n8n se o nó 'Respond to Webhook' está devolvendo a imagem binária na opção 'Respond With > Binary File'.");
      }

      const imageUrl = URL.createObjectURL(blob);

      setCurrentBlob(blob);
      setResultImageUrl(imageUrl);
      setStatus("success");
    } catch (error) {
      console.error("Falha na execução:", error);
      alert("Erro no detalhe: " + error.message);
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setResultImageUrl(null);
    setCurrentBlob(null);
    setSelectedFile(null);
  };

  return (
    <main className="app-container">
      <header className="app-header fade-in">
        <h1 className="app-title">Ambient AI</h1>
        <p className="app-subtitle">Recrie seu espaço com Inteligência Artificial</p>
      </header>

      <section className="main-content">
        {status === "error" && (
          <div className="error-message">
            Erro ao gerar ambiente, tente novamente
          </div>
        )}

        {status === "idle" || status === "error" ? (
          <>
            <UploadArea onFileSelect={setSelectedFile} />
            <FormPanel values={formValues} onChange={handleFormChange} />
            <Button
              onClick={handleStartProject}
              disabled={!selectedFile}
              className="fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              <Zap size={20} />
              Começar Projeto
            </Button>
          </>
        ) : null}

        {status === "loading" && (
          <Loader text="Processando seu design..." />
        )}

        {status === "success" && resultImageUrl && (
          <div ref={resultRef} style={{ width: '100%', paddingTop: "2rem" }}>
            <ImageResult
              imageUrl={resultImageUrl}
              onChatSubmit={handleRefineChat}
              onReset={handleReset}
            />
          </div>
        )}
      </section>
    </main>
  );
}

