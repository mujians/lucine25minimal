# Integrazione Pagina Prodotto nelle Tab

## Setup Completato

✅ **Template AJAX**: `templates/product.ajax.liquid` - Renderizza solo il contenuto del prodotto  
✅ **JavaScript**: Modificato `assets/theme.js` per gestire il caricamento AJAX  
✅ **Fallback**: In caso di errore, link diretto alla pagina prodotto  

## Come Configurare in Shopify Admin

### 1. Aggiungere Prodotto al Menu

1. Vai su **Online Store > Navigation > Menu Principale**
2. Clicca **Add menu item**
3. Nome: `Biglietti` (o nome che preferisci)
4. Link: Seleziona il tuo prodotto dalle opzioni
5. **Save menu**

### 2. Verificare la Configurazione

Il template `index.liquid` genererà automaticamente:
```html
<button class="tab" data-index="X" data-url="/products/tuo-prodotto">
  Biglietti
</button>
```

### 3. Come Funziona

Quando l'utente clicca sulla tab:

1. **JavaScript** rileva che l'URL contiene `/products/`
2. **Carica** il contenuto via AJAX da `URL?view=ajax`
3. **Shopify** renderizza usando `product.ajax.liquid`
4. **Inserisce** il contenuto nella tab corrente

## Template AJAX Features

- ✅ Titolo e descrizione prodotto
- ✅ Immagini prodotto
- ✅ Selezione varianti
- ✅ Controllo quantità
- ✅ Bottone "Aggiungi al carrello"
- ✅ Gestione errori
- ✅ Loading state
- ✅ Stile coerente con il tema

## Fallback

Se il caricamento AJAX fallisce, viene mostrato un link diretto alla pagina prodotto normale.

## Test

Per testare aggiungi la pagina prodotto al menu principale e verifica che:
- La tab appaia nel menu
- Il caricamento AJAX funzioni
- Il form "Aggiungi al carrello" funzioni
- Il fallback funzioni in caso di errore