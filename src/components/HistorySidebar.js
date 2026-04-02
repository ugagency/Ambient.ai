"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { History, X, ChevronRight, Image as ImageIcon } from "lucide-react";
import "./HistorySidebar.css";

export default function HistorySidebar({ isOpen, onClose, onSelect = () => {}, refreshTrigger }) {
  const [generations, setGenerations] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchHistory();
  }, [isOpen, refreshTrigger]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setGenerations(data);
    setLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <button className="toggle-history" onClick={onClose} title="Histórico">
        <History size={20} />
      </button>

      <aside className={`history-sidebar ${isOpen ? "open" : ""}`}>
        <div className="history-header">
          <h2 className="history-title">
            <History size={20} /> Histórico
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="history-list">
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>Carregando...</p>
          ) : generations.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2rem' }}>
              Nenhuma geração encontrada.
            </p>
          ) : (
            generations.map((gen) => (
              <div key={gen.id} className="history-item" onClick={() => onSelect(gen)}>
                <img 
                  src={gen.generated_image_url} 
                  alt="Thumb" 
                  className="history-thumb"
                  onError={(e) => e.target.src = "https://placehold.co/60x60?text=Error"}
                />
                <div className="history-info">
                  <span className="history-room">{gen.settings.ambiente || "Ambiente"}</span>
                  <span className="history-date">{formatDate(gen.created_at)}</span>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--border-color)' }} />
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
