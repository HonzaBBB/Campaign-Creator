# Search Campaign Creator

Google Ads Script pro automatické vytvoření Search kampaně z Google Sheetu.

Šablona sheetu slouží i samostatně pro přípravu a schvalování textů reklam s klientem.

## 🚀 Quick Start

1. **[Zkopíruj si šablonu Google Sheetu](https://docs.google.com/spreadsheets/d/14h9Q91XkAT_0e5jSSxy28BB0XM18QhoI_SAwuS64y1I/copy)** (Soubor → Vytvořit kopii)
2. Vyplň texty reklam a klíčová slova
3. Nahraj script do Google Ads (MCC účet)
4. Uprav CONFIG a spusť

## 📋 Google Sheet šablona

**[► Otevřít šablonu](https://docs.google.com/spreadsheets/d/14h9Q91XkAT_0e5jSSxy28BB0XM18QhoI_SAwuS64y1I/edit)**

Sheet obsahuje:
- **List 1**: Vstupní data (keywords, headlines, descriptions, callouts)
- **List "info"**: Dokumentace + vysvětlení pro klienty

### Struktura sloupců

| Sloupec | Obsah | Limit | Export |
|---------|-------|-------|--------|
| A | Keywords | max 50 | ✅ Phrase match |
| B | Headlines | max 30 znaků | ✅ Min. 3, max 15 |
| C | #znaků | - | ❌ Pomocný |
| D | Descriptions | max 90 znaků | ✅ Min. 2, max 4 |
| E | #znaků | - | ❌ Pomocný |
| F | Callouts | max 25 znaků | ✅ Max 20 |
| G | #znaků | - | ❌ Pomocný |
| H | Strukturované popisky | max 25 znaků | ❌ Ruční |
| J | Sitelinky | max 25 znaků | ❌ Ruční |

Sloupce #znaků automaticky počítají délku textu pro kontrolu limitů.

## ⚙️ Co script vytvoří

- **Campaign** - Search, Maximize Clicks, PAUSED
- **Ad Group** - jedna sestava
- **Keywords** - Phrase Match
- **RSA** - Responsive Search Ad
- **Callouts** - na úrovni kampaně
- **Targeting** - lokace + jazyk (default: CZ, čeština)

## 📥 Instalace scriptu

1. Google Ads → MCC účet
2. Tools & Settings → Bulk Actions → Scripts
3. `+` nový script
4. Vlož kód ze souboru `search-campaign-creator.js`
5. Uprav CONFIG sekci
6. Autorizuj a spusť

## 🔧 Konfigurace

```javascript
const CONFIG = {
  // URL tvé kopie sheetu
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/TVOJE_ID/edit',
  
  // Customer ID klienta (bez pomlček)
  CUSTOMER_ID: '1234567890',
  
  // Názvy (jak se zobrazí v Google Ads)
  CAMPAIGN_NAME: 'SEA_Nazev_Kampaně',
  AD_GROUP_NAME: 'Nazev_Ad_Group',
  
  // Final URL pro reklamy
  FINAL_URL: 'https://example.com',
  
  // Budget v CZK/den
  DAILY_BUDGET_CZK: 200,
  
  // Geo targeting (2203 = Czech Republic)
  LOCATION_ID: 2203,
  
  // Language (1021 = Čeština)
  LANGUAGE_ID: 1021,
  
  // Email pro notifikace (volitelné)
  NOTIFICATION_EMAIL: ''
};
```

### Geo & Language IDs

| Země | ID | | Jazyk | ID |
|------|-----|---|-------|-----|
| Česká republika | 2203 | | Čeština | 1021 |
| Slovensko | 2703 | | Slovenština | 1033 |
| Německo | 2276 | | Němčina | 1001 |
| Rakousko | 2040 | | Angličtina | 1000 |
| Polsko | 2616 | | | |

- [Všechny lokace](https://developers.google.com/google-ads/api/reference/data/geotargets)
- [Všechny jazyky](https://developers.google.com/google-ads/api/reference/data/codes-formats#expandable-7)

## ⚠️ Důležité

- Kampaň se vytvoří jako **PAUSED** - aktivuj ručně po kontrole
- Script běží z **MCC účtu**
- Strukturované popisky a sitelinky se neexportují automaticky (ruční nastavení v Google Ads)

## 🐛 Troubleshooting

| Chyba | Řešení |
|-------|--------|
| Účet nenalezen | Zkontroluj CUSTOMER_ID (bez pomlček), ověř přístup MCC |
| Validace selhala | Zkontroluj délky textů a minimální počty |
| Operace selhala | Ověř validitu Final URL, zkontroluj duplicitní názvy |

## 🗺️ Roadmap

- [ ] Více ad groups z jednoho sheetu
- [ ] Automatický export sitelinků
- [ ] Custom bidding strategies
- [ ] Podpora pro více jazykových verzí

## 📄 License

MIT

## ✍️ Autor

Honza Brzák PPC Freelancer

