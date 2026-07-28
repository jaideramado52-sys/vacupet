# Precios regionales + trial — checklist de activación

Fase 1 del roadmap (2026-07). El paywall de la app ya muestra el selector
anual/mensual con el anual destacado; este documento son los pasos MANUALES
en las plataformas de pago para que los precios y el trial existan de verdad.

Base (benchmarks RevenueCat 2025-2026):
- El plan **anual** retiene 44% a 12 meses vs 17% el mensual → el anual es el plan estrella.
- Trials de **14-30 días** convierten mejor que los de 3 días (mediana trial→pago en Salud: ~40%).
- Conversión freemium realista: **~2.2%** de descargas → pago. Planificar con esto.
- El precio de EE.UU. NO se traslada a LATAM (referencia local: DigiPet México ≈ US$17/año).

## 1. Precios propuestos por mercado

| Mercado    | Anual        | Mensual    | Nota                                    |
|------------|--------------|------------|-----------------------------------------|
| Global/US  | US$ 29.99    | US$ 3.49   | Ancla general                           |
| México     | MXN 349      | MXN 39     | Alineado a DigiPet (MXN 299-499/año)    |
| Colombia   | COP 59,900   | COP 6,900  |                                          |
| Argentina  | ARS (tier)   | ARS (tier) | Usar price tier de Play, revisar por inflación |
| Brasil     | BRL 49.90    | BRL 5.90   | Referencia: Guiavet PRO R$20-30/mes es B2B |
| España/UE  | EUR 24.99    | EUR 2.99   |                                          |

## 2. Google Play Console (app nativa)

1. Monetizar → Productos → Suscripciones → crear `premium` con dos planes base:
   `premium-yearly` (P1Y) y `premium-monthly` (P1M).
2. En `premium-yearly` añadir **oferta de prueba gratis de 14 días** (elegibilidad:
   nuevos suscriptores).
3. Precios: fijar el precio US y luego "Establecer precios por país" — SOBRESCRIBIR
   los de la tabla de arriba (MX, CO, AR, BR, ES) en vez de aceptar la conversión
   automática.
4. RevenueCat → Products: mapear ambos planes al entitlement `premium`;
   Offering `default` con `yearly` como paquete destacado.

## 3. Stripe (checkout web)

1. Crear Price anual (US$29.99) y mensual (US$3.49) del producto Premium con
   `trial_period_days: 14` en el anual (o en el Checkout Session).
2. Para LATAM: Prices adicionales por moneda (MXN/COP/BRL/EUR) y elegir el Price
   según el país del checkout (o usar Adaptive Pricing de Stripe).
3. El checkout ya recibe `?plan=yearly|monthly` desde la app (startCheckout).

## 4. Config de la app (display)

En `supabase-config.js` → `VACUPET_FEATURES`:

```js
prices: { yearly: "US$29.99", monthly: "US$3.49" },  // texto mostrado en el paywall
trialDays: 14,                                        // SOLO si el trial ya existe en tienda/Stripe
```

En nativo, mejor aún: leer el precio localizado desde RevenueCat offerings
(pendiente de cablear cuando haya API keys en `revenueCat`).

## 5. Regla de oro (del análisis de mercado)

Nunca paywall retroactivo: lo que un usuario ya tiene gratis (carné, multi-mascota
hasta el límite actual, export) NO se toca al activar monetize. 11pets lo hizo y
cayó a 2.1★.
