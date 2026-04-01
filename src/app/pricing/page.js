"use client";

import React from 'react';
import { Check, Zap, Star, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import './pricing.css';

const pricingPlans = [
  {
    name: "Free",
    price: "R$ 0",
    description: "Para quem quer começar a planejar.",
    features: [
      "5 gerações por dia",
      "Qualidade Padrão",
      "Com marca d'água",
      "Exportação Básica"
    ],
    buttonText: "Começar Grátis",
    highlight: false,
    icon: <Zap size={24} className="text-secondary" />,
    priceId: null,
    isSubscription: true
  },
  {
    name: "Essencial",
    price: "R$ 9,90",
    period: "/mês",
    description: "Ideal para reformas residenciais.",
    features: [
      "15 gerações por dia",
      "Resolução Alta (HD)",
      "Sem marca d'água",
      "Acesso a todos os estilos",
      "Histórico de projetos"
    ],
    buttonText: "Assinar Agora",
    highlight: true,
    icon: <Star size={24} className="text-accent" />,
    priceId: 'price_1THW4U1tAfcMYbld1UOuAo7R',
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
    icon: <ShieldCheck size={24} className="text-primary" />,
    priceId: 'price_1THW4o1tAfcMYbldQLyLUbFl',
    isSubscription: true
  }
];

const creditPacks = [
  { credits: 20, price: "R$ 4,90", tag: "Econômico", priceId: 'price_1THW5J1tAfcMYbldZW8gLrYB', isSubscription: false },
  { credits: 60, price: "R$ 9,90", tag: "Popular", priceId: 'price_1THW5e1tAfcMYbldHRcZDVB8', isSubscription: false },
  { credits: 150, price: "R$ 19,90", tag: "Melhor Valor", priceId: 'price_1THW611tAfcMYbldU3gfadnR', isSubscription: false }
];

export default function PricingPage() {
  const [loading, setLoading] = React.useState(null);

  const handleCheckout = async (priceId, isSubscription, index) => {
    if (!priceId) return; // Free plan
    
    setLoading(index);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, isSubscription }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erro ao iniciar pagamento: " + data.error);
        setLoading(null);
      }
    } catch (error) {
      console.error(error);
      alert("Houve um erro na conexão.");
      setLoading(null);
    }
  };

  return (
    <main className="app-container">
      <nav className="pricing-nav">
        <Link href="/" className="back-link">
          ← Voltar para a Home
        </Link>
      </nav>

      <header className="pricing-header fade-in">
        <div className="logo-container">
          <img src="/logo.png" alt="Reformei" className="app-logo" />
        </div>
        <h1 className="title">Escolha o plano ideal para sua obra</h1>
        <p className="subtitle">Transforme sua casa com a ajuda da Inteligência Artificial</p>
      </header>

      <section className="plans-grid slide-up">
        {pricingPlans.map((plan, index) => (
          <div key={index} className={`plan-card ${plan.highlight ? 'highlight' : ''}`}>
            {plan.highlight && <div className="popular-badge">MAIS POPULAR</div>}
            <div className="plan-icon">{plan.icon}</div>
            <h3 className="plan-name">{plan.name}</h3>
            <div className="plan-price">
              <span className="amount">{plan.price}</span>
              {plan.period && <span className="period">{plan.period}</span>}
            </div>
            <p className="plan-description">{plan.description}</p>
            
            <ul className="features-list">
              {plan.features.map((feature, fIndex) => (
                <li key={fIndex}>
                  <Check size={16} className="check-icon" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button 
              className={`plan-btn ${plan.highlight ? 'btn-accent' : 'btn-outline'}`}
              disabled={loading !== null || !plan.priceId}
              onClick={() => handleCheckout(plan.priceId, plan.isSubscription, index)}
            >
              {loading === index ? "Carregando..." : plan.buttonText}
            </button>
          </div>
        ))}
      </section>

      <section className="extra-credits slide-up">
        <div className="credits-header">
          <h2>Precisa de mais?</h2>
          <p>Créditos avulsos que nunca expiram. Use quando acabar o limite diário.</p>
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
                <button 
                  className="buy-btn"
                  disabled={loading !== null}
                  onClick={() => handleCheckout(pack.priceId, pack.isSubscription, `pack-${index}`)}
                >
                  {loading === `pack-${index}` ? "..." : "Comprar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="pricing-footer">
        <p>Pagamento seguro via Stripe. Cancele sua assinatura a qualquer momento.</p>
      </footer>
    </main>
  );
}
