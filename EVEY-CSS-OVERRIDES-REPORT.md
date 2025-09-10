# Report CSS Overrides per Evey Support
## Data: {{ 'now' | date: "%Y-%m-%d" }}

## PROBLEMA RISCONTRATO
Il nome del mese nel calendario modale di Evey non è visibile quando si apre il selettore date.

## TUTTI GLI OVERRIDE CSS CHE IMPATTANO EVEY

### 1. FILE: `/assets/theme.css`

#### SEZIONE 1: Mobile Priority Fix (righe 97-130)
```css
/* PRIORITY FIX: Evey button must be clickable on mobile */
button[data-evey-trigger="scheduler"] {
  position: relative !important;
  z-index: 996 !important;
  pointer-events: auto !important;
  touch-action: manipulation !important;
  -webkit-tap-highlight-color: transparent !important;
}

.evey-scheduler-container {
  position: relative !important;
  z-index: 994 !important;
  pointer-events: auto !important;
}

/* Style the Evey button without Shopify cart classes */
.evey-scheduler-btn {
  background: #d32f2f !important;
  color: white !important;
  border: none !important;
  padding: 12px 24px !important;
  border-radius: 8px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
  width: 100% !important;
}

.evey-scheduler-btn:hover {
  background: #b71c1c !important;
  transform: translateY(-1px) !important;
}
```

#### SEZIONE 2: Global Visibility Fix (righe 2997-3009)
```css
/* EVEY EVENTS VISIBILITY FIX - Global override */
button[data-evey-trigger],
[data-evey-string],
.evey-scheduler-button,
.evey-btn,
.evey-scheduler-container,
.evey-scheduler-container button {
  visibility: visible !important;
  display: block !important;
  opacity: 1 !important;
  position: relative !important;
  z-index: 999 !important;
}
```

#### SEZIONE 3: Calendar Modal Fix (righe 3011-3061) - AGGIUNTO RECENTEMENTE
```css
/* Fix Evey calendar modal month name visibility */
.evey-modal,
.evey-calendar,
.evey-scheduler-modal {
  color: inherit !important;
  z-index: 9999 !important;
}

.evey-modal *,
.evey-calendar *,
.evey-scheduler-modal * {
  color: inherit !important;
  visibility: visible !important;
  opacity: 1 !important;
}

/* Ensure month name and calendar headers are visible */
.evey-modal .evey-month,
.evey-modal .evey-month-name,
.evey-modal .evey-calendar-header,
.evey-modal .evey-calendar-month,
.evey-modal .month-name,
.evey-modal .calendar-month,
.evey-modal .calendar-header,
.evey-calendar .month-name,
.evey-calendar .calendar-month,
.evey-calendar .calendar-header,
.evey-scheduler-modal .month-name,
.evey-scheduler-modal .calendar-month,
.evey-scheduler-modal .calendar-header,
/* Additional selectors for Evey calendar elements */
[class*="evey"] [class*="month"],
[class*="evey"] [class*="calendar-header"],
[class*="evey"] h1,
[class*="evey"] h2,
[class*="evey"] h3,
[class*="evey"] .title,
[id*="evey"] [class*="month"],
[id*="evey"] [class*="calendar-header"],
[id*="evey"] h1,
[id*="evey"] h2,
[id*="evey"] h3,
[id*="evey"] .title {
  color: #333 !important;
  font-weight: 600 !important;
  visibility: visible !important;
  opacity: 1 !important;
  display: block !important;
  background-color: transparent !important;
  text-shadow: none !important;
}
```

#### SEZIONE 4: Mobile Specific Fix (righe 3063-3082)
```css
/* Mobile specific fix for Evey button */
@media (max-width: 1023px) {
  .evey-scheduler-container {
    position: relative !important;
    z-index: 995 !important;
    pointer-events: auto !important;
    transform: none !important;
  }
  
  button[data-evey-trigger="scheduler"] {
    visibility: visible !important;
    display: block !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    cursor: pointer !important;
    position: relative !important;
    z-index: 995 !important;
  }
}
```

#### SEZIONE 5: Icon Preservation (righe 3214-3221)
```css
/* Preserve Evey app icons - Don't override */
[class*="evey"] .icon,
[class*="evey"] svg,
.evey__variant-container .icon,
.evey__variant-container svg {
  width: auto !important;
  height: auto !important;
}
```

### 2. FILE: `/assets/section-main-product.css`

#### Visibility Fix in Product Page (righe 25-37)
```css
/* Fix Evey buttons visibility in product page */
#MainProduct button[data-evey-trigger],
#MainProduct [data-evey-string],
#MainProduct .evey-scheduler-button,
section[id*="MainProduct"] button[data-evey-trigger],
section[id*="MainProduct"] [data-evey-string],
section[id*="MainProduct"] .evey-scheduler-button,
button[data-evey-trigger],
[data-evey-string],
.evey-scheduler-button {
  visibility: visible !important;
  display: block !important;
}
```

### 3. FILE: `/snippets/evey-confirm-load.liquid`
Script JavaScript che gestisce il caricamento di Evey e abilita/disabilita i pulsanti di acquisto.

## POSSIBILI CONFLITTI

1. **z-index multipli**: Abbiamo diversi z-index (994, 995, 996, 999, 9999) che potrebbero confliggere
2. **color: inherit vs color: #333**: Contraddizione tra ereditare il colore e forzarlo a #333
3. **Selettori generici**: `[class*="evey"] *` potrebbe essere troppo aggressivo
4. **!important ovunque**: Potrebbe sovrascrivere stili legittimi di Evey

## SUGGERIMENTI PER EVEY

Il problema principale sembra essere che il nostro tema ha uno sfondo scuro e testo bianco di default, quindi quando la modale Evey eredita questi colori, il testo bianco su sfondo bianco diventa invisibile.

### Possibili soluzioni da parte vostra:
1. Usare selettori più specifici per la modale con colori espliciti
2. Applicare uno sfondo esplicito alla modale
3. Utilizzare un iframe isolato per il calendario
4. Fornire una classe CSS da aggiungere al body quando la modale è aperta

## COME RIPRISTINARE

Per rimuovere TUTTI gli override Evey:
1. Rimuovere le sezioni 1-5 dal file `theme.css`
2. Rimuovere la sezione visibility fix da `section-main-product.css`
3. Il file `evey-confirm-load.liquid` può rimanere, gestisce solo il caricamento

Per rimuovere SOLO l'ultimo tentativo di fix (calendario):
- Rimuovere le righe 3011-3061 da `theme.css`

## CONTESTO DEL TEMA
- Tema: Lucine di Natale (evento natalizio)
- Background scuro con testo bianco di default
- Mobile-first design
- Utilizzo estensivo di !important per override di stili Shopify

Per qualsiasi domanda o necessità di test, sono disponibile.