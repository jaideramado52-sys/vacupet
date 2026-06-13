# ESQUEMA_VACUNAL — Referencia del dominio (backbone del motor)

> Datos **orientativos** para programar recordatorios. La pauta real la define el **veterinario**
> según especie, edad, región, riesgo y producto. Rabia: su obligatoriedad legal varía por país.
> Esta tabla alimenta el motor `nextDoseFor` / `suggestNextDate` y la tabla `esquema_especie`.

---

## 🐶 Perro

### Core (esenciales)
| Vacuna | Previene | Inicio | Refuerzos cachorro | Refuerzo adulto |
|---|---|---|---|---|
| Moquillo (Distemper) | Virus del moquillo canino | 6–8 sem | cada 3–4 sem hasta 16 sem | anual / trienal |
| Parvovirus | Parvovirosis (gastroenteritis grave) | 6–8 sem | cada 3–4 sem hasta 16 sem | anual / trienal |
| Hepatitis (Adenovirus CAV-2) | Hepatitis infecciosa canina | 6–8 sem | con la polivalente | anual / trienal |
| Parainfluenza | Componente de tos de las perreras | 6–8 sem | con la polivalente | anual |
| **Rabia** | Rabia (zoonosis) | 12–16 sem | dosis única inicial | anual o trienal (según país/producto) |

> Las 4 primeras suelen venir **combinadas** (polivalente: quíntuple/séxtuple/óctuple según incluya lepto/corona).

### No-core (según riesgo / región)
| Vacuna | Cuándo |
|---|---|
| Leptospirosis | zonas húmedas, contacto con roedores/agua estancada; refuerzo anual |
| Bordetella (tos de las perreras) | guarderías, peluquerías, exposiciones |
| Coronavirus canino | criterio veterinario |
| Leishmania | zonas endémicas (mediterráneo, etc.); protocolo propio |
| Giardia | criterio veterinario |

---

## 🐱 Gato

### Core (esenciales)
| Vacuna | Previene | Inicio | Refuerzos gatito | Refuerzo adulto |
|---|---|---|---|---|
| Trivalente felina (FVRCP) | Panleucopenia + Rinotraqueitis (Herpesvirus) + Calicivirus | 6–8 sem | cada 3–4 sem hasta 16 sem | anual / trienal |
| **Rabia** | Rabia (zoonosis) | 12–16 sem | dosis única inicial | anual o trienal (según país/producto) |

### No-core (según riesgo)
| Vacuna | Cuándo |
|---|---|
| Leucemia felina (FeLV) | gatos con acceso al exterior / convivencia con positivos; test previo |
| Clamidia | criatorios, gatos en grupo |
| PIF (peritonitis infecciosa) | uso muy limitado / criterio veterinario |

---

## 🪱 Desparasitación (todas las especies)

| Tipo | Producto típico | Frecuencia orientativa |
|---|---|---|
| **Interna** (lombrices, etc.) | comprimido/pasta antihelmíntico | cachorros/gatitos: cada 2 sem hasta 12 sem; adultos: cada 3 meses |
| **Externa** (pulgas/garrapatas) | pipeta, collar, comprimido | mensual o según duración del producto |

> El módulo de desparasitación de VacuPet registra **tipo, producto, fecha, peso** (la dosis suele
> depender del peso) y **próxima** aplicación, y genera recordatorios igual que las vacunas.

---

## Calendario tipo (cachorro / gatito)
```
6–8 sem   → 1ª polivalente / trivalente  + desparasitación interna
9–11 sem  → 2ª polivalente / trivalente
12–14 sem → 3ª polivalente / trivalente  + RABIA
~16 sem   → último refuerzo de cachorro (según protocolo)
Adulto    → refuerzo anual (core) + lepto/bordetella si aplica
           desparasitación interna cada 3 meses · externa mensual
```

## Modelo de la tabla `esquema_especie`
```sql
esquema_especie (
  especie            text,    -- 'perro' | 'gato' | 'generico'
  vacuna             text,    -- 'rabia', 'parvovirus', 'fvrcp', ...
  dosis_n            int,     -- nº de dosis en la serie inicial
  edad_inicio_sem    int,     -- semana de inicio
  intervalo_sem      int,     -- separación entre dosis de la serie
  refuerzo_meses     int,     -- cada cuántos meses el refuerzo adulto
  categoria          text,    -- 'core' | 'noncore'
  pais_obligatoria   text[]   -- países donde es legalmente obligatoria (rabia)
)
```

> ⚠️ Estos valores son una **base genérica**. Antes de producción, validar el esquema con un
> veterinario del país objetivo y ajustar nombres comerciales y obligatoriedad de rabia.
</content>
