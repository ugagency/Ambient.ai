"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Star, Zap, ShieldCheck, ChevronLeft, LogOut, History, User as UserIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import './pricing.css';

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "",
    description: "Para começar a explorar.",
    features: [
      "5 gerações por dia",
      "Qualidade Padrão",
      "Histórico de 3 dias",
      "Marca d'água discreta"
    ],
    buttonText: "Plano Atual",
    highlight: false,
    icon: <Zap size={24} />,
    priceId: null,
    isSubscription: false
  },
  {
    name: "Essencial",
    price: "R$ 9,90",
    period: "/mês",
    description: "Perfeito para renovações rápidas.",
    features: [
      "15 gerações por dia",
      "Resolução Alta (HD)",
      "Sem marca d'água",
      "Acesso a todos os estilos",
      "Histórico de projetos"
    ],
    buttonText: "Assinar Agora",
    highlight: true,
    icon: <Star size={24} />,
    priceId: 'price_1THoKF1CEUKhflhBf4xteaXJ',
    isSubscription: true
  },
  {
    name: "Pro",
    price: "R$ 19,90",
    period: "/mês",
    description: "Para quem não quer limites.",
    features: [
      "Gerações Ilimitadas",
      "Qualidade Ultra HD",
      "Suporte Prioritário",
      "Sem marca d'água",
      "Funcionalidades Pro"
    ],
    buttonText: "Assinar Pro",
    highlight: false,
    icon: <ShieldCheck size={24} />,
    priceId: 'price_1THoKJ1CEUKhflhBsUzaGm6z',
    isSubscription: true
  }
];

const creditPacks = [
  {
    credits: 20,
    price: "R$ 14,90",
    priceId: 'price_1THoKH1CEUKhflhBxJlp3COc',
    tag: "Pacote Básico"
  },
  {
    credits: 60,
    price: "R$ 29,90",
    priceId: 'price_1THoKG1CEUKhflhBlVOWZR01',
    tag: "Mais Popular"
  },
  {
    credits: 150,
    price: "R$ 49,90",
    priceId: 'price_1THoKG1CEUKhflhBfwbXQVDo',
    tag: "Melhor Valor"
  }
];

export default function PricingPage() {
  const [loading, setLoading] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch('/api/profile', {
            headers: {
              'Authorization': `Bearer ${session?.access_token}`
            }
          });
          if (response.ok) {
            const profile = await response.json();
            setUserProfile(profile);
          }
        } catch (err) {
          console.error("Erro ao carregar perfil:", err);
        }
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleCheckout = async (priceId, isSubscription, index) => {
    if (!priceId) return;
    setLoading(index);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, isSubscription }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      alert("Erro ao conectar com o servidor.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="pricing-container fade-in">
      <header className="page-header">
        <div className="logo-container" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <img src="/logo.png" alt="Logo" className="app-logo-large" />
        </div>
      </header>

      <nav className="glass-navbar">
        <div className="navbar-content">
          <Link href="/" className="nav-link back-link">
            <ChevronLeft size={18} />
            <span>Voltar</span>
          </Link>
          
          {user && (
            <div className="nav-actions">
              <div className="divider"></div>
              {userProfile && (
                <div className="credits-display">
                  <span className="plan-badge">{userProfile.plan_type.toUpperCase()}</span>
                  <span className="credits-text">
                    {userProfile.plan_type === 'pro' ? "∞" : (userProfile.plan_type === 'essencial' ? 15 : 5) - userProfile.daily_credits_used} Diários
                  </span>
                </div>
              )}
              <div className="divider"></div>
              <button onClick={handleLogout} className="nav-btn logout-btn">
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </nav>

      <header className="pricing-header">
        <p className="subtitle">Escolha o plano ideal para transformar seus ambientes</p>
      </header>

      <section className="plans-grid slide-up">
        {plans.map((plan, index) => (
          <div key={index} className={`plan-card ${plan.highlight ? 'highlight' : ''}`}>
            {plan.highlight && <div className="popular-badge">Popular</div>}
            <div className="plan-icon">{plan.icon}</div>
            <h3 className="plan-name">{plan.name}</h3>
            <div className="plan-price">
              <span className="amount">{plan.price}</span>
              {plan.period && <span className="period">{plan.period}</span>}
            </div>
            <p className="plan-description">{plan.description}</p>
            <ul className="features-list">
              {plan.features.map((f, i) => <li key={i}><Check size={16} className="check-icon" />{f}</li>)}
            </ul>
            <button 
              className={`btn-plan ${plan.highlight ? 'btn-accent' : 'btn-outline'}`}
              disabled={loading !== null || !plan.priceId}
              onClick={() => handleCheckout(plan.priceId, plan.isSubscription, index)}
            >
              {loading === index ? "..." : plan.buttonText}
            </button>
          </div>
        ))}
      </section>

      <section className="extra-credits slide-up">
        <div className="credits-header">
          <h2>Créditos Extras</h2>
          <p>Para quando seu limite diário acabar. Nunca expiram.</p>
        </div>
        <div className="credits-grid">
          {creditPacks.map((pack, index) => (
            <div key={index} className="credit-item">
              <div className="credit-info">
                <span className="credit-count">{pack.credits} Créditos</span>
                <span className="credit-tag">{pack.tag}</span>
              </div>
              <div className="credit-price-row">
                <span className="price">{pack.price}</span>
                <button className="buy-btn" disabled={loading !== null} onClick={() => handleCheckout(pack.priceId, false, `pack-${index}`)}>
                  {loading === `pack-${index}` ? "..." : "Comprar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="pricing-footer">
        <p>Pagamento seguro via Stripe. Cancele quando quiser.</p>
      </footer>
    </main>
  );
}
