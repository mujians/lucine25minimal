# CARD INCONSISTENCIES ANALYSIS
**Product Page: App Block vs Open Ticket Card**

## CRITICAL ISSUES IDENTIFIED

### 🔍 **NOISE/BACKGROUND FILTERS**
❌ **INCONSISTENZA GRAVE**: App block ha ancora filtri SVG attivi mentre Open Ticket ne è stato ripulito

**App Block** (`sections/main-product.liquid:809`):
```html
<filter id="wobble-app">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="5"/>
  <feDisplacementMap in="SourceGraphic" scale="1"/>
</filter>
<rect ... filter="url(#wobble-app)"/>
```

**Open Ticket** (`snippets/open-ticket-form.liquid:4-9`):
```html
<!-- FILTRO PRESENTE MA NON DOVREBBE ESSERCI -->
<filter id="wobble-open">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="9"/>
  <feDisplacementMap in="SourceGraphic" scale="1"/>
</filter>
<rect ... filter="url(#wobble-open)"/>
```

## LAYOUT & STRUCTURE COMPARISON

### **APP BLOCK EVEY** (Embedded in `sections/main-product.liquid`)

**Container:**
- Classe: `sketch-card` (style inline)
- Padding: `1.5rem`
- Margin: `1.5rem 0`
- SVG Border: `wobble-app` filter

**Content Structure:**
```html
<form class="evey__multi-variant-selector">
  <div data-evey-scheduler=""></div>  <!-- Scheduler button -->
  <div class="evey__variants">        <!-- Variants list -->
    <div class="evey__variant-container">
      <div class="evey__variant-title">
        <div class="evey__variant-name">Intero</div>
        <div class="evey__variant-price">€9,00</div>
      </div>
      <div class="evey__variant_quantity">
        <!-- Quantity controls -->
      </div>
    </div>
  </div>
  <button type="submit">Add to cart</button>
</form>
```

**Layout:** Vertical stack
- Scheduler button (full width)
- Variant rows (horizontal: name/price | quantity)
- Submit button (full width)

### **OPEN TICKET** (`snippets/open-ticket-form.liquid`)

**Container:**
- Classe: `.sketch-card.sketch.seed-9` 
- Padding: `1.5rem` (inline style)
- Margin: `1.5rem 0` (inline style)
- SVG Border: `wobble-open` filter

**Content Structure:**
```html
<form id="open-ticket-product-form">
  <div style="margin-bottom: 1.5rem;">  <!-- Title section -->
    <div style="display: flex; align-items: center;">
      <h4>🥇 Biglietto Open</h4>
      <span>ESCLUSIVO</span>
    </div>
    <p class="lead">Pass premium...</p>
    <p class="meta">Valido in qualsiasi...</p>
  </div>
  
  <div style="display: flex; align-items: center;"> <!-- Controls row -->
    <div style="flex: 1;">     <!-- Price section -->
      <span class="menu-price">€25,00</span>
      <span>€30,00</span>
      <div>SCONTO ONLINE</div>
    </div>
    <div style="display: flex;">  <!-- Quantity controls -->
      <button>−</button>
      <input type="number">
      <button>+</button>
    </div>
    <button type="submit">Aggiungi al Carrello</button>
  </div>
</form>
```

**Layout:** 
1. Title/description block (vertical)
2. Horizontal row: price | quantity | submit button

## TYPOGRAPHY & STYLING INCONSISTENCIES

### **TITLES/HEADINGS**

**App Block:**
- `.evey__variant-name`: `font-weight: bold` (default font)
- Font size: inherited (no specific sizing)
- No text transform

**Open Ticket:**
- `h4`: `font-size: 1.35rem`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.5px`
- Color: `var(--christmas-gold)`

### **DESCRIPTIONS**

**App Block:**
- No main description
- Tooltips: `.ticket-tooltip` (tiny tooltips on hover)

**Open Ticket:**
- `.lead`: `font-size: 1.2rem`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.5px`
- `.meta`: `font-size: 1.125rem`, `opacity: 0.85`, `line-height: 1.6`

### **PRICES**

**App Block:**
- `.evey__variant-price .money`: No specific styling (inherits)
- Position: Right aligned in variant row

**Open Ticket:**
- `.menu-price`: `font-size: 1.4rem`, `font-weight: 700`, `color: var(--christmas-green)`
- Strikethrough price: `font-size: 1.125rem`, `text-decoration: line-through`
- Discount badge: Custom styled badge

### **BUTTONS & CONTROLS**

**App Block Quantity:**
- `.quantity__button`: `width: 45px`, `height: 45px`, `background: transparent`
- `.quantity__input`: `font-size: 14px`, `background: transparent`
- Border: `0.1rem solid rgba(18,18,18,0.08)`

**Open Ticket Quantity:**
- Buttons: `width: 32px`, `height: 32px`, `background: rgba(255,255,255,0.1)`, `border-radius: 6px`
- Input: `font-size: 1.125rem`, `font-weight: 600`
- Container: `border: 1px solid rgba(255,255,255,0.2)`, `background: rgba(255,255,255,0.05)`

**Submit Buttons:**

**App Block:**
- `.button--secondary`: Standard Shopify button styling
- Text: "Add to cart"
- Full width

**Open Ticket:**
- Custom styled: `background: var(--christmas-red)`, `padding: 1rem 2rem`
- Text: "Aggiungi al Carrello" (uppercase, letter-spacing)
- Hover effects with transform and box-shadow

## RESPONSIVE BEHAVIOR

**App Block:**
- Uses standard Evey responsive classes
- No custom mobile adaptations

**Open Ticket:**
- Extensive custom responsive CSS (`@media (max-width: 768px)`)
- Layout changes from horizontal to vertical stack
- Font size adjustments for mobile

## CSS SPECIFICITY & OVERRIDES

**App Block:**
- Uses embedded CSS in `sections/main-product.liquid:601`
- Heavy `!important` usage for overriding Evey styles
- Mixed inline styles from app generation

**Open Ticket:**
- Self-contained CSS in `snippets/open-ticket-form.liquid:127+`
- Targeted `.sketch-card.seed-9` selectors
- Consistent styling approach

## JAVASCRIPT FUNCTIONALITY

**App Block:**
- Complex Evey scheduler integration
- Event-driven availability updates
- Multi-variant form handling

**Open Ticket:**
- Simple quantity controls
- Custom fetch for product data
- Direct cart add functionality

## IDENTIFIED INCONSISTENCIES SUMMARY

### ❌ **CRITICAL ISSUES:**
1. **SVG Filters**: Both cards have noise filters that should be removed
2. **Layout Structure**: Completely different content organization
3. **Typography Scale**: No consistency in font sizes/weights
4. **Spacing System**: Different margins, paddings, gaps
5. **Color Usage**: Inconsistent application of Christmas colors
6. **Button Design**: Completely different button styles
7. **Form Controls**: Different quantity selector designs
8. **Responsive Behavior**: Inconsistent mobile adaptations

### 🎯 **TARGET UNIFIED DESIGN:**
Both cards should follow the **exact same**:
- Container styling (padding, margin, borders)
- Typography hierarchy (headings, descriptions, prices)
- Button design system
- Spacing and layout patterns  
- Color application
- Responsive behavior
- Form control styling