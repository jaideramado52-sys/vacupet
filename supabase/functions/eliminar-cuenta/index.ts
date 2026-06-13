// VacuPet — Edge Function "eliminar-cuenta" (Fase 7 · Borrado de cuenta y datos)
// ------------------------------------------------------------------------
// Borra de forma definitiva la cuenta del usuario autenticado y TODOS sus
// datos: vacupet_state, shares, push_subs, objetos del bucket "mascotas" y el
// propio auth.user. Operación irreversible; requiere confirmación en el cliente.
//
// Secrets: SUPABASE_SERVICE_ROLE_KEY (para borrar el usuario de auth).
//
// TODO (Fase 7): implementar borrado en cascada + auth.admin.deleteUser,
// validando el JWT del usuario que solicita el borrado.

Deno.serve(() =>
  new Response(JSON.stringify({ error: "eliminar-cuenta: no implementado todavía (Fase 7)." }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  })
);
