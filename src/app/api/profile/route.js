import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar o mesmo padrão do generate/route.js que está funcionando
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    // Tenta pegar o token do header de autorização primeiro (mais robusto)
    const authHeader = request.headers.get('Authorization');
    let token = authHeader?.split(' ')[1];

    // Se não tiver no header, tenta buscar o usuário pela sessão do cookie (padrão Next.js)
    // Mas para isso precisamos do client com cookies
    let userId = null;

    if (token) {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      // Tentar pelo padrão do cookies se o token não veio no header
      try {
        const { createClient: createServerSideClient } = await import('@/lib/supabase/server');
        const supabase = await createServerSideClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch (err) {
        console.error("Erro ao verificar sessão via cookie:", err);
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar o perfil usando Admin para garantir bypass de RLS
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
