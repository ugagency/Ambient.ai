import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Inicialização direta do Supabase com Service Role para ignorar RLS no webhook
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mapeamento de IDs do Stripe para planos e créditos
const PRICE_TO_PLAN = {
  'price_1THW4U1tAfcMYbld1UOuAo7R': 'essencial',
  'price_1THW4o1tAfcMYbldQLyLUbFl': 'pro'
};

const PRICE_TO_CREDITS = {
  'price_1THW5J1tAfcMYbldZW8gLrYB': 20,
  'price_1THW5e1tAfcMYbldHRcZDVB8': 60,
  'price_1THW611tAfcMYbldU3gfadnR': 150
};

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Lógica para quando o checkout é concluído com sucesso
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { user_id, is_subscription, price_id } = session.metadata;

    if (is_subscription === 'true') {
      // Atualiza o plano recorrente
      const plan = PRICE_TO_PLAN[price_id];
      await supabaseAdmin
        .from('profiles')
        .update({ 
          plan_type: plan,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription
        })
        .eq('id', user_id);
      
      console.log(`Usuário ${user_id} atualizado para o plano ${plan}`);
    } else {
      // Adiciona créditos avulsos
      const creditsToAdd = PRICE_TO_CREDITS[price_id] || 0;
      
      // Busca saldo atual
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('extra_credits_balance')
        .eq('id', user_id)
        .single();

      const newBalance = (profile?.extra_credits_balance || 0) + creditsToAdd;

      await supabaseAdmin
        .from('profiles')
        .update({ extra_credits_balance: newBalance })
        .eq('id', user_id);

      console.log(`Adicionados ${creditsToAdd} créditos para o usuário ${user_id}`);
    }
  }

  return NextResponse.json({ received: true });
}
