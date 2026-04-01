import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_URL;

export async function POST(request) {
  let creditSource = null; // Guardará 'daily', 'extra' ou 'pro'
  let userProfileId = null;

  try {
    const formData = await request.formData();
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) return NextResponse.json({ error: "Token não fornecido" }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

    userProfileId = user.id;

    // 1. Pegar o plano do banco
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('plan_type')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) return NextResponse.json({ error: "Perfil não encontrado" }, { status: 404 });

    // 2. Debitar crédito atomicamente ANTES (RPC retorna a fonte: daily | extra | pro)
    const { data: source, error: rpcError } = await supabaseAdmin.rpc('decrement_user_credits', {
      p_user_id: user.id,
      p_plan_type: profile.plan_type
    });

    if (rpcError) {
      console.error("Erro no débito:", rpcError);
      return NextResponse.json({ error: "Saldo insuficiente", code: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }

    creditSource = source; // Armazena de onde veio para o estorno em caso de erro
    console.log(`Crédito debitado da fonte: ${creditSource}`);

    // 3. IA - n8n
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      body: formData,
    });

    if (!n8nResponse.ok) throw new Error(`IA Offline: ${n8nResponse.statusText}`);

    const contentType = n8nResponse.headers.get("content-type");
    let finalImageUrl = "";
    let imageBlob = null;

    if (contentType && contentType.includes("image")) {
      imageBlob = await n8nResponse.blob();
      const fileName = `${user.id}/${Date.now()}_generated.png`;
      const { error: uploadError } = await supabaseAdmin.storage.from('generations').upload(fileName, imageBlob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw new Error("Erro no salvamento da imagem");
      
      const { data: { publicUrl } } = supabaseAdmin.storage.from('generations').getPublicUrl(fileName);
      finalImageUrl = publicUrl;
    } else {
      const n8nData = await n8nResponse.json();
      finalImageUrl = n8nData.image_url || n8nData[0]?.image_url;
    }

    // 4. Salvar Histórico
    await supabaseAdmin
      .from('generations')
      .insert({
        user_id: user.id,
        generated_image_url: finalImageUrl,
        settings: Object.fromEntries(formData.entries())
      });

    if (imageBlob) {
      return new Response(imageBlob, { headers: { "Content-Type": "image/png" } });
    } else {
      return NextResponse.json({ image_url: finalImageUrl });
    }

  } catch (error) {
    console.error('Erro Crítico na Geração:', error.message);

    // 5. ESTORNO PRECISO: Usamos a fonte do crédito salva no passo 2
    if (creditSource && userProfileId) {
        console.log(`Estornando crédito para a fonte: ${creditSource}`);
        await supabaseAdmin.rpc('refund_user_credit', { 
            p_user_id: userProfileId, 
            p_credit_source: creditSource 
        });
    }

    return NextResponse.json({ error: "Erro na geração da imagem. Crédito estornado." }, { status: 500 });
  }
}
