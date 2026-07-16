# Plantillas de correo — VacuPet

Correos con la marca de VacuPet, listos para cuando montes **Resend** (SMTP de
producción) y quieras que los emails se vean profesionales en vez del texto plano
por defecto de Supabase.

HTML apto para clientes de correo: estilos **inline**, maquetado con `<table>`
(nada de flex/grid, que Gmail/Outlook ignoran).

---

## 1. `login-codigo.html` — correo de acceso (el importante)

Es el correo que recibe el usuario al iniciar sesión (código de 6 dígitos + enlace).

**Cómo aplicarlo:**
1. Supabase → **Authentication → Emails**.
2. Plantilla **"Magic Link"** → pega el contenido de `login-codigo.html`.
3. Guarda. Deja las variables tal cual:
   - `{{ .Token }}` → el código de 6 dígitos
   - `{{ .ConfirmationURL }}` → el enlace de acceso directo

> Funciona igual con el correo compartido de Supabase, pero para producción
> configura primero **Resend** como SMTP (Authentication → SMTP Settings):
> host `smtp.resend.com`, puerto 465, usuario `resend`, contraseña = tu API key,
> remitente `no-reply@vacupets.com`. (Requiere verificar el dominio en Resend.)

---

## 2. `bienvenida.html` — correo de bienvenida (opcional)

Supabase Auth **no** envía este solo. Para mandarlo:
- **Opción simple:** una Edge Function que, al crear el primer perfil, llame a la
  API de Resend (`POST https://api.resend.com/emails`) con este HTML.
- **Opción manual:** úsalo como plantilla para campañas puntuales.

Variable `{{nombre}}`: reemplázala al enviar (p. ej. `, Luis`) o déjala vacía.

---

## Prioridad
El de **login es el que de verdad importa** (sin él, la gente que se registra no
entra bien). El de bienvenida es un extra de marca. Ninguno bloquea el lanzamiento
en Google Play (en móvil, la compra y el acceso van por la cuenta de Google).
