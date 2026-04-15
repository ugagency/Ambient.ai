import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Buscar o usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Criar ou atualizar perfil automaticamente (UPSERT)
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
          id: user.id,
          email: user.email,
          plan_type: 'free',
          daily_credits_used: 0,
          extra_credits_balance: 0,
        }, { onConflict: 'id' });

        if (upsertError) {
          console.error(`❌ Erro no upsert do perfil para ${user.email}:`, JSON.stringify(upsertError));
        } else {
          console.log(`✅ Perfil garantido (upsert) para: ${user.email}`);
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Se algo deu errado, redirecionar para login com erro
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
