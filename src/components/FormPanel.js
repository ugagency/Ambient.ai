"use client";
import './FormPanel.css';

export default function FormPanel({ values, onChange, planType = 'free' }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  const getFilteredStyles = () => {
    const allStyles = [
      { id: "moderno",       label: "Moderno",           tier: "free" },
      { id: "contemporaneo", label: "Contemporâneo",      tier: "free" },
      { id: "aconchegante",  label: "Aconchegante",       tier: "free" },
      { id: "rustico",       label: "Rústico",            tier: "free" },
      { id: "minimalista",   label: "Minimalista",        tier: "free" },
      { id: "classico",      label: "Clássico Elegante",  tier: "paid" },
      { id: "boho",          label: "Boho",               tier: "paid" },
      { id: "industrial",    label: "Industrial",         tier: "paid" },
    ];

    const isPaid = planType === 'essencial' || planType === 'pro';
    return isPaid ? allStyles : allStyles.filter(s => s.tier === 'free');
  };

  const filteredStyles = getFilteredStyles();

  return (
    <div className="form-panel fade-in" style={{ animationDelay: "0.1s" }}>
      <div className="form-group">
        <label className="form-label" htmlFor="ambiente">
          Qual ambiente é este?
        </label>
        <select 
          id="ambiente" 
          name="ambiente" 
          className="form-select" 
          value={values.ambiente} 
          onChange={handleChange}
        >
          <option value="Sala de Estar">Sala de Estar</option>
          <option value="Quarto">Quarto</option>
          <option value="Cozinha">Cozinha</option>
          <option value="Banheiro">Banheiro</option>
          <option value="Escritório">Escritório</option>
          <option value="Varanda">Varanda</option>
          <option value="Outro">Outro...</option>
        </select>
      </div>

      {values.ambiente === "Outro" && (
        <div className="form-group slide-up">
          <label className="form-label" htmlFor="customAmbiente">
            Especifique o cômodo
          </label>
          <input 
            type="text" 
            id="customAmbiente" 
            name="customAmbiente" 
            className="form-input" 
            placeholder="Ex: Sótão, Adega, Hall de Entrada..." 
            value={values.customAmbiente} 
            onChange={handleChange}
            autoFocus
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="estilo">
          Estilo Desejado
        </label>
        <select 
          id="estilo" 
          name="estilo" 
          className="form-select" 
          value={values.estilo} 
          onChange={handleChange}
        >
          {filteredStyles.map((style) => (
            <option key={style.id} value={style.label}>
              {style.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="orcamento">
          Faixa de Orçamento
        </label>
        <select 
          id="orcamento" 
          name="orcamento" 
          className="form-select" 
          value={values.orcamento} 
          onChange={handleChange}
        >
          <option value="Baixo">Econômico (Baixo)</option>
          <option value="Médio">Padrão (Médio)</option>
          <option value="Alto">Premium (Alto)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="intensidade">
          Intensidade de Mudança
        </label>
        <select 
          id="intensidade" 
          name="intensidade" 
          className="form-select" 
          value={values.intensidade} 
          onChange={handleChange}
        >
          <option value="Baixa">Discreta (Baixa)</option>
          <option value="Média">Equilibrada (Média)</option>
          <option value="Alta">Transformadora (Alta)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="preferencias">
          Preferências Especiais
        </label>
        <textarea 
          id="preferencias" 
          name="preferencias" 
          className="form-textarea" 
          placeholder="Ex: Tons pastéis, bastante iluminação, espaço para home office..." 
          value={values.preferencias} 
          onChange={handleChange}
        ></textarea>
      </div>
    </div>
  );
}
