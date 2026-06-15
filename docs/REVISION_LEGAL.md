# VacuPet — Dossier para revisión legal

_Preparado: 2026-06-15 · Estado: BORRADOR para abogado/a · Textos legales: borradores en `docs/`_

> ## ⚖️ Diferencia esencial vs. apps de salud humana
> VacuPet trata datos de **MASCOTAS**, que en general **no** son datos personales de salud de
> categoría especial ni de **menores de edad**. El único dato personal relevante es el del
> **dueño** (su correo de cuenta y, potencialmente, lo que aparezca en fotos). Por eso la carga
> legal es **mucho menor** que en una app de vacunas humanas. Aun así hay tratamiento de datos
> personales del dueño + envío de fotos a un tercero de IA, que requieren aviso y consentimiento.

> ## ✅ Ya aplicado (cambios técnicos/fácticos, sin criterio legal)
> 1. **Terceros** identificados (Supabase, Resend, Anthropic, Netlify), todos en EE.UU.
> 2. **Nube opcional**: por defecto todo es local; nada sale del dispositivo sin iniciar sesión.
> 3. **Consentimiento de IA explícito** antes de enviar pregunta/foto a la nube.
> 4. **Almacenamiento local** (localStorage) sin cookies de rastreo ni analítica de terceros.
> 5. **Compartir** carné: enlace de solo lectura; con sesión usa **token que caduca** (30 días).
> 6. **Eliminar cuenta y datos** (función `eliminar-cuenta`) — derecho de supresión.
> 7. **Seguridad real**: RLS por usuario, cifrado en reposo del proveedor, TLS, bucket privado
>    con enlaces firmados, bloqueo local (PIN/biométrico), respaldo cifrado.
> 8. Descargo "**no reemplaza el carné oficial ni la consulta veterinaria**" visible en la app.
>
> **Pendiente: decisiones legales** (marcadas 🟦 más abajo) + rellenar responsable/contacto.

---

## 1. Qué es la app (contexto)

- **VacuPet** es un **carné de salud digital para mascotas** (perros, gatos, etc.).
- Es una **PWA** (aplicación web instalable) de un solo archivo; funciona **offline**.
- **Uso local por defecto:** los datos se guardan en el navegador del dueño (localStorage).
  No se envía nada a la nube salvo que el usuario inicie sesión.
- **Nube opcional:** si el dueño inicia sesión (enlace mágico al correo), sus datos se
  sincronizan en **Supabase** y las fotos/documentos se guardan en **Storage privado**.
- **Idiomas:** español, inglés y portugués (el contenido legal hoy solo en español).
- **Publicada en:** https://vacupet-app.netlify.app (hosting: Netlify).
- **Naturaleza:** registro personal de apoyo. **No** es un dispositivo médico veterinario ni
  un certificado oficial de vacunación.

---

## 2. Inventario de datos tratados

| Categoría | Datos concretos | ¿Personal del dueño? | ¿Sensible? |
|-----------|-----------------|:--------------------:|:----------:|
| **Mascota** | Nombre, especie, raza, sexo, nacimiento, color, microchip, esterilización | No (es de la mascota) | No |
| **Salud de la mascota** | Vacunas, desparasitación, cuidados, peso, visitas, diagnósticos | No (animal) | No (no es salud humana) |
| **Imágenes** | Fotos de la mascota, del carné y documentos (recetas/informes) | Posible (si aparece una persona) | Posible incidental |
| **Cuenta** | Correo de inicio de sesión del dueño | **Sí** | No |
| Técnicos | Almacenamiento local del navegador; IP/logs de hosting | Parcial (IP) | No |

> **Punto clave:** a diferencia de una app de vacunas humanas, **no se tratan datos de salud
> de personas ni de menores**. El dato personal a proteger es esencialmente el **correo del
> dueño** y, de forma incidental, lo que pueda aparecer en las **fotos**.

---

## 3. Flujos de datos y terceros (encargados / sub-encargados)

| Tercero | Para qué | Qué datos recibe | Ubicación | ¿Declarado hoy? |
|---------|----------|------------------|-----------|-----------------|
| **Supabase** | Base de datos, autenticación, almacenamiento de fotos/documentos | Datos sincronizados de la mascota + correo del dueño + archivos | **EE.UU. — us-east-2** | ✅ Sí |
| **Resend** | Envío de correos de recordatorio (opcional) | Correo del dueño y datos del recordatorio | EE.UU. | ✅ Sí |
| **Anthropic (Claude)** | Asistente FAQ y **OCR del carné** (visión) | **Foto del carné** y/o texto de la consulta | EE.UU. | ✅ Sí |
| **Netlify** | Hosting del sitio web | Datos de conexión (IP, logs de servidor) | EE.UU. | ✅ Sí |

### 🟦 DECISIÓN LEGAL 3-A — Anthropic / IA
La app puede enviar **fotos del carné a Anthropic** (OCR) y consultas a Claude (FAQ), **con
consentimiento explícito del usuario**. Confirmar: (a) que se declare como encargado en el
aviso, (b) que el consentimiento separado de IA es suficiente. _Funciones desplegadas; la IA
se activa al añadir la clave de API._

### 🟦 DECISIÓN LEGAL 3-B — Transferencia internacional
Todos los proveedores están en **EE.UU.** Si los usuarios están en Guatemala/LatAm, hay
**transferencia internacional** (del correo del dueño y, si las sube, sus fotos). Definir la
base que la legitima (consentimiento, cláusulas, etc.) y divulgarla. _Menor sensibilidad por
no tratarse de datos de salud humana._

---

## 4. Funciones de la app con implicación legal

- **Compartir carné por enlace/QR:** enlace de **solo lectura**; con sesión es un **token que
  caduca (30 días)** y no lleva datos en la URL; sin sesión, el carné viaja codificado en el
  propio enlace. Mantener el descargo y la advertencia de "con quién lo compartes".
- **QR de integridad firmado:** prueba que el registro no fue alterado. **No** es un certificado
  oficial — mantener ese descargo visible.
- **Notificaciones push / email:** requieren permiso/registro; el email usa el correo del dueño.
- **Fotos y documentos** en bucket privado con **enlaces firmados** temporales.
- **Respaldo cifrado** (AES-GCM) y **export CSV/JSON** → base para portabilidad.
- **Bloqueo con PIN / biométrico (WebAuthn).**
- **"Eliminar mi cuenta y datos"** → borra datos de la nube + archivos (derecho de supresión).

---

## 5. Checklist de puntos legales a revisar / completar

### A. Datos del responsable y contacto
- [ ] **🟦 ¿Quién es el responsable del tratamiento?** (persona u organización que opera la app)
      → _____________________
- [ ] **🟦 Correo de contacto** para privacidad y ejercicio de derechos →
      _____________________ (¿`luis@gomezgt.com`?)
- [ ] **🟦 Domicilio / país del responsable** → _____________________
- [ ] Reemplazar los `(completar …)` en `PRIVACIDAD.md` y `TERMINOS.md`.

### B. Jurisdicción y marco aplicable
- [ ] **🟦 Ley aplicable y jurisdicción** (¿Guatemala? ¿otra?) → _____________________
- [ ] **🟦 ¿Aplica alguna ley de protección de datos** del país de los usuarios al **correo del
      dueño**? (habeas data constitucional, etc.)
- [ ] **🟦 ¿Se apunta a usuarios en la UE?** Si sí, valorar RGPD para los datos del dueño
      (base legal, transferencias). _Sin datos de salud humana, el alcance es menor._

### C. Datos del dueño e imágenes
- [ ] **🟦 Base legal** para tratar el **correo del dueño** (cuenta) y las **fotos** (consentimiento).
- [ ] Texto sobre que las **fotos** podrían contener incidentalmente a personas y que el usuario
      es responsable de lo que sube.
- [ ] **🟦 ¿Edad mínima** del usuario (dueño) para crear cuenta?

### D. Terceros, transferencias y seguridad
- [ ] Declarar **Supabase, Resend, Anthropic, Netlify** como terceros (punto 3).
- [ ] Cláusula de **transferencia internacional** (datos en EE.UU.).
- [ ] **🟦 ¿Se firman DPA** (acuerdos de tratamiento) con los proveedores?
- [ ] Cláusula de **notificación de brechas** de seguridad.
- [ ] Describir medidas de seguridad reales (RLS, cifrado en reposo, TLS, bucket privado con
      enlaces firmados, bloqueo local, respaldo cifrado).

### E. Documentación y consentimiento
- [ ] Mantener **coherentes** los textos legales (`PRIVACIDAD.md`, `TERMINOS.md`) y cualquier
      copia dentro de la app. Decidir la fuente única de verdad.
- [ ] **Versionado** de las políticas (nº de versión + fecha) y aviso de cambios.
- [ ] **🟦 Plazos de conservación** de los datos (hoy: "mientras uses la app") → _____________
- [ ] Enunciar **derechos** del usuario y **plazo de respuesta**.
- [ ] Mencionar **portabilidad** (export CSV/JSON existente).
- [ ] Aviso sobre **almacenamiento local** (sin cookies de rastreo).

### F. Términos de uso
- [ ] Reforzar **"no es consejo veterinario / no reemplaza el carné oficial ni la consulta"**
      (ya presente — validar redacción).
- [ ] **Limitación de responsabilidad** y descargo por exactitud del esquema vacunal
      (es orientativo; la pauta la define el veterinario).
- [ ] Cláusula sobre **enlaces compartidos** (responsabilidad del usuario).
- [ ] **🟦 Resolución de disputas / ley aplicable.**

### G. Internacionalización
- [ ] **🟦 ¿Traducir** los textos legales a inglés y portugués (la app es ES/EN/PT)?
      ¿O basta español + aviso?

---

## 6. Estado actual de cada documento

| Documento | Estado | Pendiente principal |
|-----------|--------|---------------------|
| `PRIVACIDAD.md` | 🟡 Borrador | Responsable, contacto, transferencia internacional, conservación, DPA |
| `TERMINOS.md` | 🟡 Borrador | Jurisdicción, resolución de disputas, limitación de responsabilidad |
| Descargo en la app | ✅ "No reemplaza el carné oficial ni la consulta veterinaria" | — |
| Consentimiento de IA | ✅ Explícito antes de enviar a la nube | Confirmar suficiencia legal |

---

## 7. Preguntas concretas para el/la abogado/a

1. Al tratar datos de **mascotas** (no de personas), ¿qué obligaciones de protección de datos
   aplican realmente, y sobre qué dato (el **correo del dueño**)?
2. ¿El **consentimiento** basta como base legal para el correo del dueño y para el **envío de
   fotos a IA (Anthropic)**?
3. ¿Cómo redactar la **transferencia internacional** (datos en EE.UU.)?
4. ¿Qué **plazos de conservación** y qué registro de consentimiento conviene?
5. ¿Hace falta **DPA** firmado con cada proveedor (Supabase, Resend, Anthropic, Netlify)?
6. ¿Es necesario **traducir** lo legal a los idiomas de la app?
7. ¿Conviene fijar una **edad mínima** para el dueño que crea la cuenta?

---

_Anexos: `PRIVACIDAD.md`, `TERMINOS.md`, `SPEC.md`, `DESPLIEGUE.md`, `ACTIVAR_SERVICIOS.md`
y el código de la app (`VacuPet.html`)._
