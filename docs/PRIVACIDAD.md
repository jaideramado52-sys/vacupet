# Política de privacidad — VacuPet

> Borrador orientativo. Antes de publicar con usuarios reales, revísalo con asesoría legal
> del país objetivo y ajusta los datos del responsable.
> Versión 2 · 2026-07-06 · Añade los proveedores de pago; corrige asistente (IA local) y hosting.

## Resumen
VacuPet es un carné de salud para mascotas. Está diseñado **local-first**: por defecto, tus
datos viven **solo en tu dispositivo** (almacenamiento del navegador). La nube es **opcional**.
**No vendemos tus datos ni los cedemos con fines publicitarios.**

## Qué datos se tratan
- **De tu mascota**: nombre, especie, raza, fechas, vacunas, desparasitaciones, peso, visitas,
  microchip, fotos. No son datos personales de salud humana.
- **De tu cuenta (solo si usas la nube)**: tu correo electrónico, para autenticación y avisos.
- **De tu compra (solo si contratas Premium)**: identificador de tu cuenta, plan contratado y
  estado de la suscripción. **No recibimos ni almacenamos los datos de tu tarjeta.**

## Dónde se guardan
- **Modo local (por defecto):** `localStorage` de tu navegador. No se envía nada a ningún servidor.
- **Modo nube (opcional, si inicias sesión):** una copia cifrada en reposo (AES-256) en Supabase,
  protegida por **RLS** (cada cuenta solo ve sus datos), sobre TLS.

## Cuándo se envían datos a terceros
Solo con tu acción/consentimiento explícito:
- **Asistente (FAQ general):** funciona con un **modelo de IA que corre en tu propio navegador**.
  Tus preguntas **no salen del dispositivo**.
- **Escanear carné (OCR):** la foto **sí** se envía al proveedor de IA para extraer los datos,
  y solo si usas esa función, con **consentimiento explícito**.
- **Compartir carné:** generas un enlace; quien lo tenga puede ver el carné (de solo lectura).
  Los enlaces con token caducan (30 días).
- **Recordatorios:** push/email enviados por nuestro backend (Supabase/Resend).
- **Compra de Premium:** el proveedor de pago recibe los datos necesarios para cobrar.

## Proveedores (encargados del tratamiento)
| Proveedor | Para qué | Qué recibe |
|---|---|---|
| **Supabase** | Base de datos, cuentas, archivos | Datos sincronizados + tu correo |
| **Resend** | Correos de recordatorio | Tu correo y el aviso |
| **Anthropic** | **Solo OCR** del carné | La foto del carné (si usas el OCR) |
| **GitHub Pages / Cloudflare** | Hosting del sitio | Datos de conexión (IP, logs) |
| **RevenueCat** | Gestión de suscripciones | Identificador de cuenta y estado de compra |
| **Procesador de pago** (vía RevenueCat) | Cobro en la web | Datos de facturación; la tarjeta la procesa el proveedor, nosotros no la vemos |
| **Apple / Google** | Cobro dentro de la app móvil | Los datos de tu compra, según sus políticas |

Todos ellos están **fuera de tu país** (principalmente EE.UU.): al usar la nube existe una
**transferencia internacional** de datos. La base que la legitima es tu **consentimiento** al
activar la nube y la **necesidad de prestar el servicio** que solicitas.

## Seguridad
- **Bloqueo** con PIN (derivado con PBKDF2) y biometría opcional (WebAuthn).
- **Respaldo cifrado** con tu contraseña (AES-GCM + PBKDF2) — ni siquiera el respaldo es legible sin ella.
- **Integridad** del carné compartido mediante firma ES256 verificable.
- Fotos y documentos en **bucket privado** con enlaces firmados temporales.

## Tus derechos
- **Exportar**: respaldo JSON (normal o cifrado) y CSV (portabilidad).
- **Borrar**: "Borrar mis datos" (este dispositivo) y, con cuenta, "Eliminar cuenta"
  (borra tu cuenta, datos, suscripciones, enlaces y fotos de la nube de forma permanente).
- Cancelar tu suscripción no borra tus datos: puedes seguir viéndolos y exportándolos.

## Menores y descargo
VacuPet es un registro de apoyo y **no reemplaza el carné oficial ni la consulta veterinaria**.

## Responsable y contacto
**Responsable:** VacuPet, operado desde Guatemala.
**Contacto** (privacidad y ejercicio de derechos): **soporte@vacupets.com** — respondemos en un
plazo máximo de 5 días hábiles.
