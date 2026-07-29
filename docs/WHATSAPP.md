# Recordatorios por WhatsApp — guía de activación (Fase 3)

La app ya tiene el opt-in (Centro de recordatorios → "Recordatorios por WhatsApp",
premium, usa el teléfono de "Datos del dueño") y la Edge Function
`vacupet-whatsapp` (cron diario espejo del de email). Pasos manuales:

## 1. Meta / WhatsApp Business (una vez)

1. En [Meta for Developers](https://developers.facebook.com) crea una app de tipo
   Business y añade el producto **WhatsApp**.
2. Registra un número de teléfono de empresa (o usa el número de prueba al inicio).
   Anota el **Phone number ID**.
3. Crea un **System User** con token permanente y permiso `whatsapp_business_messaging`.
4. Crea y envía a aprobación una **plantilla** de utilidad con 1 parámetro, p. ej.:
   - Nombre: `recordatorio_vacupet`
   - Cuerpo: `🐾 Recordatorio de VacuPet: {{1}}. Abre la app para ver el detalle.`
   - Idiomas: es, en_US, pt_BR (misma plantilla en cada idioma).
   La aprobación tarda minutos-horas. Sin plantilla aprobada NO se puede iniciar
   conversación (regla de Meta para mensajes salientes).

## 2. Base de datos (una vez)

En el SQL Editor de Supabase:

```sql
alter table vacupet_state add column if not exists last_wa date;
```

## 3. Secrets y deploy

En `.env.deploy`:

```
WA_TOKEN='<token permanente del system user>'
WA_PHONE_ID='<phone number id>'
WA_TEMPLATE='recordatorio_vacupet'
```

`bash deploy.sh` (ya incluye `vacupet-whatsapp`).

## 4. Cron

Programa el cron diario (igual que `recordatorios`), p. ej. en Supabase → Database
→ Cron (pg_cron) a las 13:00 UTC:

```sql
select cron.schedule('vacupet-whatsapp-daily', '0 13 * * *',
  $$ select net.http_post(
       url:='https://<TU_REF>.supabase.co/functions/v1/vacupet-whatsapp?secret=<CRON_SECRET>',
       headers:='{}'::jsonb) $$);
```

## Notas

- El usuario debe tener el teléfono CON CÓDIGO DE PAÍS en Datos del dueño
  (p. ej. +52 55 1234 5678); la función descarta números de <8 dígitos.
- Costo: Meta cobra por conversación de utilidad iniciada (~US$0.004-0.04 según
  país). Con envío 1/día solo cuando hay vencimientos, el costo es marginal.
- El opt-out es el mismo toggle de la app (waOptIn=false).
