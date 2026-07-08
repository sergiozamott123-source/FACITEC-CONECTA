import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function gerarEmailOrientador(codigo: string) {
  return `${codigo.toLowerCase().trim()}@facitec.vitoria.es.gov.br`
}

function gerarSenhaTemporaria() {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, orientador_id } = await req.json()

    if (!orientador_id || !['criar', 'resetar_senha'].includes(action)) {
      throw new Error('Parâmetros inválidos: informe orientador_id e action ("criar" ou "resetar_senha").')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: orientador, error: orErr } = await supabase
      .from('orientador')
      .select('id, nome_completo, codigo_orientador, auth_user_id')
      .eq('id', orientador_id)
      .single()
    if (orErr) throw orErr
    if (!orientador.codigo_orientador) {
      throw new Error('Orientador não tem código de acesso (codigo_orientador) cadastrado.')
    }

    const email = gerarEmailOrientador(orientador.codigo_orientador)
    const senhaTemporaria = gerarSenhaTemporaria()

    if (action === 'criar') {
      if (orientador.auth_user_id) {
        throw new Error('Este orientador já tem acesso criado. Use "resetar_senha" para gerar uma nova senha.')
      }

      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: senhaTemporaria,
        email_confirm: true,
      })
      if (createErr) throw createErr

      const authUserId = created.user.id

      const { error: updErr } = await supabase
        .from('orientador')
        .update({ auth_user_id: authUserId })
        .eq('id', orientador_id)
      if (updErr) throw updErr

      const { error: roleErr } = await supabase
        .from('user_roles')
        .upsert({ user_id: authUserId, role: 'orientador' }, { onConflict: 'user_id' })
      if (roleErr) throw roleErr

      return new Response(JSON.stringify({ email, senhaTemporaria }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // action === 'resetar_senha'
    if (!orientador.auth_user_id) {
      throw new Error('Este orientador ainda não tem acesso criado. Use "criar" primeiro.')
    }

    const { error: resetErr } = await supabase.auth.admin.updateUserById(
      orientador.auth_user_id,
      { password: senhaTemporaria },
    )
    if (resetErr) throw resetErr

    return new Response(JSON.stringify({ email, senhaTemporaria }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
