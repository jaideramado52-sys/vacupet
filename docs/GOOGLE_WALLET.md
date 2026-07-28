# Carné en Google Wallet — guía de activación (Fase 2)

La app ya tiene el botón "Guardar en Google Wallet" en el modo presentación del
carné (aparece solo cuando `walletEndpoint` está configurado) y la Edge Function
`vacupet-wallet` que firma el enlace "Save to Google Wallet". Estos son los
pasos manuales para activarlo:

## 1. Cuenta de emisor (una vez)

1. Entra a [Google Pay & Wallet Console](https://pay.google.com/business/console)
   con la cuenta de Google del proyecto.
2. Solicita acceso a la **Google Wallet API** (perfil de emisor). Google aprueba
   normalmente en 1-2 días. Al aprobarte te dan un **Issuer ID** (número largo).

## 2. Service account

1. En Google Cloud Console (el mismo proyecto), crea una **service account**.
2. Genera una clave JSON y descárgala.
3. En Wallet Console → Users, añade el email de la service account con rol
   **Developer/Admin** (permiso de emitir objetos).

## 3. Clase del pase (una vez)

Crea una `GenericClass` con id `vacupet_carne` (API o consola):

```
POST https://walletobjects.googleapis.com/walletobjects/v1/genericClass
{ "id": "<ISSUER_ID>.vacupet_carne" }
```

## 4. Secrets y deploy

En `.env.deploy` añade:

```
WALLET_SA_JSON='<contenido completo del JSON de la service account>'
WALLET_ISSUER_ID='<issuer id>'
WALLET_CLASS_ID='vacupet_carne'
```

y ejecuta `bash deploy.sh` (ya incluye `vacupet-wallet`).

## 5. Config de la app

En `supabase-config.js`:

```js
walletEndpoint: "https://<TU_REF>.supabase.co/functions/v1/vacupet-wallet",
```

## Qué lleva el pase

Fondo teal de marca, nombre de la mascota, especie/raza/microchip, última
antirrábica (fecha → próxima) y un QR que abre el carné compartido de solo
lectura (el mismo enlace `#v=` del modo presentación). El pase es estático:
se regenera al guardarlo de nuevo (no hay push updates en esta fase).
