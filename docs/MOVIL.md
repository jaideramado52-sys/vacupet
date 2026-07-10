# VacuPet — App móvil (Capacitor + RevenueCat)

La app nativa **reutiliza la misma PWA de un solo archivo**: no hay reescritura.
Capacitor la empaqueta en un contenedor nativo y RevenueCat gestiona las compras
in-app (obligatorias en las tiendas para bienes digitales).

```
  npm run build   →  dist/   →  cap sync  →  android/  →  Android Studio  →  Play Store
```

## Estado actual (ya montado)

- `capacitor.config.json` — appId `com.vacupets.app`, appName `VacuPet`, webDir `dist`.
- Plataforma **Android** generada (`android/`), con el plugin
  `@revenuecat/purchases-capacitor` detectado por `cap sync`.
- Scripts: `npm run cap:sync` (build + sync) y `npm run cap:android` (abre Android Studio).
- **Cliente** (`VacuPet.html`): `isNative()`, `rcInit/rcLogin/rcLogout`,
  `rcPurchase(plan)`, `rcRestore()`, `rcSyncEntitlement()`.
  - `startCheckout()` se **desvía a IAP** en iOS/Android y usa `checkoutUrl` en web.
  - **Restaurar compra** disponible en el paywall (nativo) y en el modal de Premium.
  - El **service worker no se registra en nativo** (los assets ya van empaquetados).
  - **Login sin deep links**: en nativo se omite `emailRedirectTo` y se entra con el
    código de 6 dígitos del correo (el flujo OTP ya existía).
- **Config**: `supabase-config.js` → `VACUPET_FEATURES.revenueCat`
  (`apiKeyAndroid`, `apiKeyIos`, `entitlementId`). Vacío = degrada a checkout web.

> Vínculo clave: `appUserID = session.user.id` (UUID de Supabase). El webhook
> `vacupet-billing` lo recibe como `app_user_id` y escribe la tabla `entitlements`,
> que es la **fuente de verdad** del premium (ver `MONETIZACION.md`, Fase A).

## Pasos para publicar en Google Play

1. **RevenueCat**: crear el proyecto, la app de Google Play y el entitlement `premium`.
   Productos sugeridos: `vacupet_monthly`, `vacupet_yearly`, `vacupet_lifetime`
   (este último *non-consumable* / pago único). Agruparlos en una **Offering**.
2. Copiar la **API key pública de Android** (`goog_…`) a
   `supabase-config.js → VACUPET_FEATURES.revenueCat.apiKeyAndroid`.
3. **Webhook de RevenueCat** → `https://<ref>.functions.supabase.co/vacupet-billing`
   con header `Authorization: <secreto>`; en Supabase:
   `supabase secrets set BILLING_WEBHOOK_SECRET=<secreto>` y
   `supabase functions deploy vacupet-billing`.
4. **Google Play Console** ($25 pago único): crear la app, subir un AAB firmado,
   dar de alta los mismos IDs de producto y conectar Play ↔ RevenueCat
   (cuenta de servicio de Google Play).
5. Construir: `npm run cap:android` → Android Studio → *Build > Generate Signed Bundle*.
   Guardar el **keystore fuera del repo** (ya está en `.gitignore`).
6. **Probar en sandbox** con una cuenta de prueba (Play → *License testing*):
   comprar → ver la fila en `entitlements` → la app muestra Premium.
7. Encender: `monetize:true` + `BILLING_ENFORCE=1` + ToS/reembolsos publicados.

## iOS — PROYECTADO, apagado (activar pronto)
El código ya está preparado para iPhone (metaetiquetas Apple, iconos PNG, la lógica
de RevenueCat es la misma). Falta **solo el empaquetado nativo**, que exige un Mac.

**Mientras tanto — PWA en iPhone (funciona ya, gratis):**
Safari → **vacupets.com** → Compartir → **Añadir a pantalla de inicio**. Icono propio,
pantalla completa, offline y notificaciones. Sin comisión de Apple (cobro por checkout web).

**Para publicar en App Store (cuando haya cuenta Apple Developer, $99/año):**
- **Con Mac:** `npm i -D @capacitor/ios && npx cap add ios && npx cap open ios` → Xcode.
- **Sin Mac:** usar `.github/workflows/ios.yml.disabled` — compila el `.ipa` en un runner
  **macOS de GitHub Actions**. Renómbralo a `ios.yml`, añade la carpeta `ios/`, carga los
  secrets (certificado, perfil, Team ID) y lánzalo manualmente. Instrucciones en el propio archivo.
- En ambos casos: copiar la API key `appl_…` a `apiKeyIos`. **Mismo webhook, misma tabla.**

> Regla de Apple: los PWA-wrapper "vacíos" a veces se rechazan. VacuPet aporta valor nativo
> real (cámara para OCR, notificaciones, compras), así que debería pasar; si hay pegas, añadir
> alguna función nativa explícita antes de reenviar.

## Reglas de las tiendas (importante)
- Lo **digital** (Premium) **debe** pasar por IAP → 15–30% de comisión.
- Los **bienes físicos** (chapas NFC) **no** pueden usar IAP → cobro web externo.
- **Clínicas / B2B** → factura directa, fuera de las tiendas.
- La web (vacupets.com) sigue siendo el canal **sin comisión**.

## Pendientes opcionales
- **App Links** (`assetlinks.json` en vacupets.com) para que el enlace del correo
  abra la app directamente, en vez del código OTP.
- Iconos y splash nativos (`@capacitor/assets`).
- Push nativo (hoy es Web Push; en nativo conviene FCM).
