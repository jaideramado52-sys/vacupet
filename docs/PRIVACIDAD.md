# Política de privacidad — VacuPet

> Borrador orientativo. Antes de publicar con usuarios reales, revísalo con asesoría legal
> del país objetivo y ajusta los datos del responsable.

## Resumen
VacuPet es un carné de salud para mascotas. Está diseñado **local-first**: por defecto, tus
datos viven **solo en tu dispositivo** (almacenamiento del navegador). La nube es **opcional**.

## Qué datos se tratan
- **De tu mascota**: nombre, especie, raza, fechas, vacunas, desparasitaciones, peso, visitas,
  microchip, fotos. No son datos personales de salud humana.
- **De tu cuenta (solo si usas la nube)**: tu correo electrónico, para autenticación y avisos.

## Dónde se guardan
- **Modo local (por defecto):** `localStorage` de tu navegador. No se envía nada a ningún servidor.
- **Modo nube (opcional, si configuras Supabase e inicias sesión):** una copia cifrada en
  reposo (AES-256) en Supabase, protegida por **RLS** (cada cuenta solo ve sus datos), sobre TLS.

## Cuándo se envían datos a terceros
Solo con tu acción/consentimiento explícito:
- **Asistente (FAQ general):** la pregunta (sin tus datos del carné) se envía al proveedor de IA.
- **Escanear carné (OCR):** la foto se envía al proveedor de IA para extraer los datos.
- **Compartir carné:** generas un enlace; quien lo tenga puede ver el carné (de solo lectura).
  Los enlaces con token caducan (30 días).
- **Recordatorios:** push/email enviados por tu propio backend (Supabase/Resend).

## Seguridad
- **Bloqueo** con PIN (derivado con PBKDF2) y biometría opcional (WebAuthn).
- **Respaldo cifrado** con tu contraseña (AES-GCM + PBKDF2) — ni siquiera el respaldo es legible sin ella.
- **Integridad** del carné compartido mediante firma ES256 verificable.

## Tus derechos
- **Exportar**: respaldo JSON (normal o cifrado) y CSV.
- **Borrar**: "Borrar mis datos" (este dispositivo) y, con cuenta, "Eliminar cuenta"
  (borra tu cuenta, datos, suscripciones, enlaces y fotos de la nube de forma permanente).

## Menores y descargo
VacuPet es un registro de apoyo y **no reemplaza el carné oficial ni la consulta veterinaria**.

## Responsable y contacto
_(Completar: nombre/entidad, correo de contacto, país.)_
