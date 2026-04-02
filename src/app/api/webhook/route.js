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
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`✅ Webhook recebido: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    console.log('📦 Session metadata:', JSON.stringify(session.metadata));
    console.log('📦 Session customer:', session.customer);
    console.log('📦 Session subscription:', session.subscription);

    const user_id = session.metadata?.user_id;
    const is_subscription = session.metadata?.is_subscription;
    const price_id = session.metadata?.price_id;

    if (!user_id) {
      console.error('❌ ERRO CRÍTICO: user_id não encontrado nos metadata da session!');
      console.error('Metadata completa:', JSON.stringify(session.metadata));
      return NextResponse.json({ error: 'user_id missing from metadata' }, { status: 400 });
    }

    if (!price_id) {
      console.error('❌ ERRO CRÍTICO: price_id não encontrado nos metadata!');
      return NextResponse.json({ error: 'price_id missing from metadata' }, { status: 400 });
    }

    console.log(`👤 user_id: ${user_id}, price_id: ${price_id}, is_subscription: ${is_subscription}`);

    try {
      if (is_subscription === 'true') {
        const plan = PRICE_TO_PLAN[price_id];
        
        if (!plan) {
          console.error(`❌ price_id "${price_id}" não encontrado em PRICE_TO_PLAN!`);
          console.error('Planos disponíveis:', JSON.stringify(PRICE_TO_PLAN));
          return NextResponse.json({ error: 'Unknown subscription price_id' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            plan_type: plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription
          })
          .eq('id', user_id)
          .select();

        if (error) {
          console.error(`❌ Erro Supabase ao atualizar plano:`, error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data || data.length === 0) {
          console.error(`❌ Nenhum perfil encontrado para user_id: ${user_id}`);
          return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        console.log(`✅ Usuário ${user_id} atualizado para plano "${plan}". Dados:`, JSON.stringify(data));

      } else {
        const creditsToAdd = PRICE_TO_CREDITS[price_id];
        
        if (!creditsToAdd) {
          console.error(`❌ price_id "${price_id}" não encontrado em PRICE_TO_CREDITS!`);
          console.error('Pacotes disponíveis:', JSON.stringify(PRICE_TO_CREDITS));
          return NextResponse.json({ error: 'Unknown credit price_id' }, { status: 400 });
        }

        // Busca saldo atual
        const { data: profile, error: fetchError } = await supabaseAdmin
          .from('profiles')
          .select('extra_credits_balance')
          .eq('id', user_id)
          .single();

        if (fetchError) {
          console.error(`❌ Erro Supabase ao buscar perfil:`, fetchError);
          return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        if (!profile) {
          console.error(`❌ Perfil não encontrado para user_id: ${user_id}`);
          return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const oldBalance = profile.extra_credits_balance || 0;
        const newBalance = oldBalance + creditsToAdd;

        const { data, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ extra_credits_balance: newBalance })
          .eq('id', user_id)
          .select();

        if (updateError) {
          console.error(`❌ Erro Supabase ao atualizar créditos:`, updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        console.log(`✅ Créditos adicionados: ${oldBalance} + ${creditsToAdd} = ${newBalance} para user ${user_id}`);
      }
    } catch (err) {
      console.error('❌ Erro inesperado no processamento do webhook:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
