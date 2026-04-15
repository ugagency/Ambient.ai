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
        // Verificar se o perfil já existe usando Admin para evitar problemas de RLS
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingProfile) {
          // Criar perfil automaticamente para novos usuários
          const { error: insertError } = await supabaseAdmin.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            plan_type: 'free',
            daily_credits_used: 0,
            extra_credits_balance: 0,
          });

          if (insertError) {
            console.error(`❌ Erro ao criar perfil para ${user.email}:`, insertError.message);
          } else {
            console.log(`✅ Perfil criado com sucesso para: ${user.email}`);
          }
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
