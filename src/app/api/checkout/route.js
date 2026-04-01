import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecret) {
    console.error("ERRO: STRIPE_SECRET_KEY não configurada no .env.local");
    return NextResponse.json({ error: "Configuração do servidor incompleta (Stripe Key)" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret);

  try {
    const { priceId, isSubscription } = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        price_id: priceId,
        is_subscription: isSubscription.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
