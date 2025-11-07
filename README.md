# Lucine Chatbot Widget - Tema Shopify Minimal

Widget chatbot integrato nel tema Shopify per Lucine Di Natale.

## 🔗 Setup Deployment

### GitHub → Shopify Auto-Deploy
✅ **GitHub è collegato direttamente con Shopify**
- I push su `main` aggiornano automaticamente il tema Shopify
- **Non serve deploy manuale**
- **Non si testa mai in locale** - tutto in produzione

### File Principale
- `snippets/chatbot-popup.liquid` - Widget chatbot completo

## 🌐 URLs Produzione

- **Backend API**: https://chatbot-lucy-2025.onrender.com
- **Dashboard Operatori**: https://lucine-dashboard.onrender.com
- **Shopify Store**: https://lucine.it

## 📦 Architettura Sistema

```
lucine-minimal (questo repo)  →  Shopify Theme
    ↓
chatbot-lucy-2025 (backend)   →  Render.com
    ↓
lucine-chatbot (frontend)     →  Render.com
```

## 🚀 Workflow Deploy

1. **Modifiche al widget** → `git push` → Shopify si aggiorna automaticamente
2. **Modifiche al backend** → `git push` → Render autodeploy
3. **Modifiche al frontend** → `git push` → Render autodeploy

## ⚠️ Note Importanti

- **NON testare in locale** - sempre direttamente in produzione
- GitHub sync con Shopify è automatico
- Tutti i commit vengono deployati automaticamente
- Il widget punta sempre a: `https://chatbot-lucy-2025.onrender.com`

## 📝 Versione Attuale

**v2.3.12.1** - Inline UI, Dynamic Strings, Auto Rating
