/**
 * Search Campaign Creator from Google Sheet
 * 
 * Vytvoří Search kampaň s jednou ad group, RSA reklamou, keywords a callouts
 * na základě dat z Google Sheetu.
 * 
 * Spouští se z MCC účtu.
 * 
 * @version 1.0.0
 * @author Honza Brzák PPC Freelancer
 */

// ============================================================================
// KONFIGURACE - UPRAV PODLE POTŘEBY
// ============================================================================

const CONFIG = {
  // Google Sheet URL s daty
  SPREADSHEET_URL: 'https://YOUR_GOOGLE_SHEET_URL',
  
  // Název listu s daty (ponech prázdné pro první list)
  SHEET_NAME: '',
  
  // Customer ID klientského účtu (bez pomlček)
  CUSTOMER_ID: '1234567890',
  
  // Název kampaně (celý název, jak se zobrazí v Google Ads)
  CAMPAIGN_NAME: 'SEA_Nazev_Kampane',
  
  // Název ad group
  AD_GROUP_NAME: 'NazevSestavy',
  
  // Final URL pro reklamy
  FINAL_URL: 'https://example.com',
  
  // Denní budget v CZK
  DAILY_BUDGET_CZK: 200,
  
  // Geo targeting - Czech Republic = 2203
  // Další ID: https://developers.google.com/google-ads/api/reference/data/geotargets
  LOCATION_ID: 2203,
  
  // Language targeting - Čeština = 1021
  // Další ID: https://developers.google.com/google-ads/api/reference/data/codes-formats#expandable-7
  LANGUAGE_ID: 1021,
  
  // Sloupce v sheetu (0-indexed)
  COLUMNS: {
    KEYWORDS: 0,      // A - Keywords
    HEADLINES: 1,     // B - Headlines (max 15)
    DESCRIPTIONS: 3,  // D - Descriptions (max 4)
    CALLOUTS: 5       // F - Callouts
  },
  
  // Maximální počty
  MAX_KEYWORDS: 50,
  MAX_HEADLINES: 15,
  MAX_DESCRIPTIONS: 4,
  MAX_CALLOUTS: 20,
  
  // Email pro notifikace (ponech prázdné pro vypnutí)
  NOTIFICATION_EMAIL: ''
};

// ============================================================================
// HLAVNÍ FUNKCE
// ============================================================================

function main() {
  Logger.log('=== Search Campaign Creator ===');
  Logger.log(`Cílový účet: ${CONFIG.CUSTOMER_ID}`);
  
  try {
    // 1. Načti data ze sheetu
    const sheetData = loadSheetData();
    Logger.log(`Načteno: ${sheetData.keywords.length} keywords, ${sheetData.headlines.length} headlines, ${sheetData.descriptions.length} descriptions, ${sheetData.callouts.length} callouts`);
    
    // 2. Validace dat
    validateData(sheetData);
    
    // 3. Vyber klientský účet
    const accountIterator = AdsManagerApp.accounts()
      .withIds([CONFIG.CUSTOMER_ID])
      .get();
    
    if (!accountIterator.hasNext()) {
      throw new Error(`Účet ${CONFIG.CUSTOMER_ID} nenalezen nebo nemáte přístup.`);
    }
    
    const account = accountIterator.next();
    Logger.log(`Přepínám na účet: ${account.getName()} (${account.getCustomerId()})`);
    
    // 4. Spusť vytvoření kampaně v kontextu klientského účtu
    AdsManagerApp.select(account);
    
    const result = createCampaign(sheetData);
    
    // 5. Výsledek
    Logger.log('');
    Logger.log('=== HOTOVO ===');
    Logger.log(`Kampaň: ${result.campaignName}`);
    Logger.log(`Ad Group: ${result.adGroupName}`);
    Logger.log(`Keywords: ${result.keywordsCount}`);
    Logger.log(`Callouts: ${result.calloutsCount}`);
    
    // 6. Odešli notifikaci
    if (CONFIG.NOTIFICATION_EMAIL) {
      sendNotification(result);
    }
    
  } catch (error) {
    Logger.log(`CHYBA: ${error.message}`);
    Logger.log(error.stack);
    
    if (CONFIG.NOTIFICATION_EMAIL) {
      sendErrorNotification(error);
    }
  }
}

// ============================================================================
// NAČTENÍ DAT ZE SHEETU
// ============================================================================

function loadSheetData() {
  const spreadsheet = SpreadsheetApp.openByUrl(CONFIG.SPREADSHEET_URL);
  const sheet = CONFIG.SHEET_NAME 
    ? spreadsheet.getSheetByName(CONFIG.SHEET_NAME) 
    : spreadsheet.getSheets()[0];
  
  if (!sheet) {
    throw new Error(`List "${CONFIG.SHEET_NAME}" nenalezen.`);
  }
  
  const data = sheet.getDataRange().getValues();
  
  // Přeskoč header (první řádek)
  const rows = data.slice(1);
  
  return {
    keywords: extractColumn(rows, CONFIG.COLUMNS.KEYWORDS, CONFIG.MAX_KEYWORDS),
    headlines: extractColumn(rows, CONFIG.COLUMNS.HEADLINES, CONFIG.MAX_HEADLINES),
    descriptions: extractColumn(rows, CONFIG.COLUMNS.DESCRIPTIONS, CONFIG.MAX_DESCRIPTIONS),
    callouts: extractColumn(rows, CONFIG.COLUMNS.CALLOUTS, CONFIG.MAX_CALLOUTS)
  };
}

function extractColumn(rows, columnIndex, maxItems) {
  const values = [];
  
  for (let i = 0; i < rows.length && values.length < maxItems; i++) {
    const value = rows[i][columnIndex];
    if (value && String(value).trim()) {
      values.push(String(value).trim());
    }
  }
  
  return values;
}

// ============================================================================
// VALIDACE DAT
// ============================================================================

function validateData(data) {
  const errors = [];
  
  // Keywords - alespoň 1
  if (data.keywords.length === 0) {
    errors.push('Žádné keywords nenalezeny (sloupec A)');
  }
  
  // Headlines - minimálně 3, max 30 znaků
  if (data.headlines.length < 3) {
    errors.push(`Minimálně 3 headlines potřeba, nalezeno: ${data.headlines.length}`);
  }
  
  data.headlines.forEach((h, i) => {
    if (h.length > 30) {
      errors.push(`Headline ${i + 1} má ${h.length} znaků (max 30): "${h.substring(0, 40)}..."`);
    }
  });
  
  // Descriptions - minimálně 2, max 90 znaků
  if (data.descriptions.length < 2) {
    errors.push(`Minimálně 2 descriptions potřeba, nalezeno: ${data.descriptions.length}`);
  }
  
  data.descriptions.forEach((d, i) => {
    if (d.length > 90) {
      errors.push(`Description ${i + 1} má ${d.length} znaků (max 90): "${d.substring(0, 50)}..."`);
    }
  });
  
  // Callouts - max 25 znaků
  data.callouts.forEach((c, i) => {
    if (c.length > 25) {
      errors.push(`Callout ${i + 1} má ${c.length} znaků (max 25): "${c}"`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error('Validace selhala:\n- ' + errors.join('\n- '));
  }
  
  Logger.log('Validace OK');
}

// ============================================================================
// VYTVOŘENÍ KAMPANĚ
// ============================================================================

function createCampaign(sheetData) {
  const customerId = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  const operations = [];
  
  // Temporary IDs pro propojení entit
  let tempId = -1;
  const budgetTempId = tempId--;
  const campaignTempId = tempId--;
  const adGroupTempId = tempId--;
  
  const budgetResourceName = `customers/${customerId}/campaignBudgets/${budgetTempId}`;
  const campaignResourceName = `customers/${customerId}/campaigns/${campaignTempId}`;
  const adGroupResourceName = `customers/${customerId}/adGroups/${adGroupTempId}`;
  
  const campaignName = CONFIG.CAMPAIGN_NAME;
  const adGroupName = CONFIG.AD_GROUP_NAME;
  
  // 1. Budget
  operations.push({
    campaignBudgetOperation: {
      create: {
        resourceName: budgetResourceName,
        name: `Budget - ${campaignName}`,
        amountMicros: String(CONFIG.DAILY_BUDGET_CZK * 1000000),
        deliveryMethod: 'STANDARD',
        explicitlyShared: false
      }
    }
  });
  
  // 2. Campaign
  operations.push({
    campaignOperation: {
      create: {
        resourceName: campaignResourceName,
        name: campaignName,
        status: 'PAUSED', // Vytvoří se jako pauznutá
        advertisingChannelType: 'SEARCH',
        campaignBudget: budgetResourceName,
        // Maximize Clicks bidding
        maximizeClicks: {},
        // Network settings
        networkSettings: {
          targetGoogleSearch: true,
          targetSearchNetwork: false,
          targetContentNetwork: false,
          targetPartnerSearchNetwork: false
        },
        // Geo targeting options
        geoTargetTypeSetting: {
          positiveGeoTargetType: 'PRESENCE',
          negativeGeoTargetType: 'PRESENCE_OR_INTEREST'
        }
      }
    }
  });
  
  // 3. Location targeting (Czech Republic)
  operations.push({
    campaignCriterionOperation: {
      create: {
        campaign: campaignResourceName,
        location: {
          geoTargetConstant: `geoTargetConstants/${CONFIG.LOCATION_ID}`
        },
        negative: false
      }
    }
  });
  
  // 4. Language targeting (Čeština)
  operations.push({
    campaignCriterionOperation: {
      create: {
        campaign: campaignResourceName,
        language: {
          languageConstant: `languageConstants/${CONFIG.LANGUAGE_ID}`
        }
      }
    }
  });
  
  // 5. Ad Group
  operations.push({
    adGroupOperation: {
      create: {
        resourceName: adGroupResourceName,
        campaign: campaignResourceName,
        name: adGroupName,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD'
      }
    }
  });
  
  // 6. Keywords (Phrase Match)
  sheetData.keywords.forEach(keyword => {
    operations.push({
      adGroupCriterionOperation: {
        create: {
          adGroup: adGroupResourceName,
          status: 'ENABLED',
          keyword: {
            text: keyword,
            matchType: 'PHRASE'
          }
        }
      }
    });
  });
  
  // 7. RSA Ad
  const headlines = sheetData.headlines.map(text => ({ text: text }));
  const descriptions = sheetData.descriptions.map(text => ({ text: text }));
  
  operations.push({
    adGroupAdOperation: {
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        ad: {
          finalUrls: [CONFIG.FINAL_URL],
          responsiveSearchAd: {
            headlines: headlines,
            descriptions: descriptions
          }
        }
      }
    }
  });
  
  // 8. Callout Assets + linking k kampani
  const calloutAssetTempIds = [];
  
  sheetData.callouts.forEach((calloutText, index) => {
    const assetTempId = tempId--;
    const assetResourceName = `customers/${customerId}/assets/${assetTempId}`;
    calloutAssetTempIds.push(assetResourceName);
    
    // Vytvoř asset
    operations.push({
      assetOperation: {
        create: {
          resourceName: assetResourceName,
          calloutAsset: {
            calloutText: calloutText
          }
        }
      }
    });
  });
  
  // Link callout assets ke kampani
  calloutAssetTempIds.forEach(assetResourceName => {
    operations.push({
      campaignAssetOperation: {
        create: {
          campaign: campaignResourceName,
          asset: assetResourceName,
          fieldType: 'CALLOUT'
        }
      }
    });
  });
  
  // Spusť všechny operace najednou
  Logger.log(`Spouštím ${operations.length} operací...`);
  
  const results = AdsApp.mutateAll(operations, { partialFailure: false });
  
  // Kontrola výsledků
  let successCount = 0;
  let errorCount = 0;
  
  results.forEach((result, index) => {
    if (result.isSuccessful()) {
      successCount++;
    } else {
      errorCount++;
      Logger.log(`Operace ${index} selhala: ${result.getErrorMessage()}`);
    }
  });
  
  Logger.log(`Úspěšných operací: ${successCount}/${operations.length}`);
  
  if (errorCount > 0) {
    throw new Error(`${errorCount} operací selhalo. Zkontroluj log.`);
  }
  
  return {
    campaignName: campaignName,
    adGroupName: adGroupName,
    keywordsCount: sheetData.keywords.length,
    calloutsCount: sheetData.callouts.length,
    headlinesCount: sheetData.headlines.length,
    descriptionsCount: sheetData.descriptions.length
  };
}

// ============================================================================
// NOTIFIKACE
// ============================================================================

function sendNotification(result) {
  const subject = `✅ Kampaň vytvořena: ${result.campaignName}`;
  const body = `
Kampaň byla úspěšně vytvořena!

Účet: ${CONFIG.CUSTOMER_ID}
Kampaň: ${result.campaignName}
Ad Group: ${result.adGroupName}
Keywords: ${result.keywordsCount}
Headlines: ${result.headlinesCount}
Descriptions: ${result.descriptionsCount}
Callouts: ${result.calloutsCount}

Budget: ${CONFIG.DAILY_BUDGET_CZK} CZK/den
Lokalita: Czech Republic
Jazyk: Čeština

POZOR: Kampaň je vytvořena jako PAUSED. Aktivuj ji ručně po kontrole.
  `.trim();
  
  MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL, subject, body);
}

function sendErrorNotification(error) {
  const subject = `❌ Chyba při vytváření kampaně`;
  const body = `
Při vytváření kampaně došlo k chybě:

Účet: ${CONFIG.CUSTOMER_ID}
Chyba: ${error.message}

Stack trace:
${error.stack}
  `.trim();
  
  MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL, subject, body);
}
