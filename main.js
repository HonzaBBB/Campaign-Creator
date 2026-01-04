/**
 * Search Campaign Creator from Google Sheet
 * 
 * Vytvoří Search kampaň s jednou ad group, RSA reklamou, keywords a callouts
 * na základě dat z Google Sheetu.
 * 
 * Spouští se z MCC účtu.
 * 
 * Sheet šablona: https://docs.google.com/spreadsheets/d/14h9Q91XkAT_0e5jSSxy28BB0XM18QhoI_SAwuS64y1I/edit
 * 
 * @version 1.1.0
 * @author Honza Brzák PPC Freelancer
 */

// ============================================================================
// KONFIGURACE - UPRAV PODLE POTŘEBY
// ============================================================================

const CONFIG = {
  // Google Sheet URL s daty (vytvoř si kopii šablony)
  // Šablona: https://docs.google.com/spreadsheets/d/14h9Q91XkAT_0e5jSSxy28BB0XM18QhoI_SAwuS64y1I/copy
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/TVUJ_SHEET',
  
  // Název listu s daty (ponech prázdné pro první list)
  SHEET_NAME: '',
  
  // Customer ID klientského účtu (bez pomlček)
  CUSTOMER_ID: '0123456789',
  
  // Název kampaně (celý název, jak se zobrazí v Google Ads)
  CAMPAIGN_NAME: 'SEA_Nazev_Kampane',
  
  // Název ad group
  AD_GROUP_NAME: 'NazevSestavy',
  
  // Final URL pro reklamy
  FINAL_URL: 'https://example.cz/',
  
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
  Logger.log('=== Search Campaign Creator v1.1 ===');
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
// VYTVOŘENÍ KAMPANĚ - DVOUFÁZOVÝ PŘÍSTUP
// ============================================================================

function createCampaign(sheetData) {
  const customerId = AdsApp.currentAccount().getCustomerId().replace(/-/g, '');
  Logger.log(`Vytvářím kampaň v účtu: ${customerId}`);
  
  const campaignName = CONFIG.CAMPAIGN_NAME;
  const adGroupName = CONFIG.AD_GROUP_NAME;
  
  // ========================================
  // FÁZE 1: Budget + Campaign (samostatně)
  // ========================================
  
  Logger.log('');
  Logger.log('--- Fáze 1: Budget + Campaign ---');
  
  // Budget
  Logger.log('Vytvářím budget...');
  const budgetResult = AdsApp.mutate({
    campaignBudgetOperation: {
      create: {
        amountMicros: String(CONFIG.DAILY_BUDGET_CZK * 1000000),
        deliveryMethod: 'STANDARD',
        explicitlyShared: false
      }
    }
  });
  
  if (!budgetResult.isSuccessful()) {
    Logger.log('❌ Budget creation failed');
    Logger.log('Budget result JSON: ' + JSON.stringify(budgetResult));
    throw new Error('Budget creation failed - see log above for details');
  }
  const budgetResourceName = budgetResult.getResourceName();
  Logger.log(`✅ Budget: ${budgetResourceName}`);
  
  // Campaign
  Logger.log('Vytvářím campaign...');
  const campaignResult = AdsApp.mutate({
    campaignOperation: {
      create: {
        name: campaignName,
        status: 'PAUSED',
        advertisingChannelType: 'SEARCH',
        campaignBudget: budgetResourceName,
        targetSpend: {},
        networkSettings: {
          targetGoogleSearch: true,
          targetSearchNetwork: false,
          targetContentNetwork: false,
          targetPartnerSearchNetwork: false
        },
        containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING'
      }
    }
  });
  
  if (!campaignResult.isSuccessful()) {
    Logger.log('❌ Campaign creation failed');
    Logger.log('Campaign result JSON: ' + JSON.stringify(campaignResult));
    throw new Error('Campaign creation failed - see log above for details');
  }
  Logger.log(`✅ Campaign created: ${campaignName}`);
  
  // Získej reálné campaign resource name přes selector
  // (mutate vrací temporary ID, potřebujeme skutečné)
  const campaignIterator = AdsApp.campaigns()
    .withCondition(`campaign.name = "${campaignName}"`)
    .get();
  
  if (!campaignIterator.hasNext()) {
    throw new Error(`Campaign "${campaignName}" not found after creation`);
  }
  
  const campaign = campaignIterator.next();
  const campaignId = campaign.getId();
  const campaignResourceName = `customers/${customerId}/campaigns/${campaignId}`;
  Logger.log(`✅ Campaign ID: ${campaignId}`);
  
  // ========================================
  // FÁZE 2: Targeting, Ad Group, Keywords, RSA, Callouts
  // ========================================
  
  Logger.log('');
  Logger.log('--- Fáze 2: Targeting, Ad Group, Keywords, RSA, Callouts ---');
  
  const operations = [];
  const operationNames = [];
  
  // Temporary ID jen pro ad group
  let tempId = -1;
  const adGroupTempId = tempId--;
  const adGroupResourceName = `customers/${customerId}/adGroups/${adGroupTempId}`;
  
  // Location targeting
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
  operationNames.push('Location targeting');
  
  // Language targeting
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
  operationNames.push('Language targeting');
  
  // Ad Group
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
  operationNames.push('Ad Group');
  
  // Keywords (Phrase Match)
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
    operationNames.push(`Keyword: ${keyword}`);
  });
  
  // RSA Ad
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
  operationNames.push('RSA Ad');
  
  // Callout Assets
  const calloutAssetTempIds = [];
  
  sheetData.callouts.forEach((calloutText, index) => {
    const assetTempId = tempId--;
    const assetResourceName = `customers/${customerId}/assets/${assetTempId}`;
    calloutAssetTempIds.push(assetResourceName);
    
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
    operationNames.push(`Callout Asset: ${calloutText}`);
  });
  
  // Link Callout Assets ke kampani
  calloutAssetTempIds.forEach((assetResourceName, index) => {
    operations.push({
      campaignAssetOperation: {
        create: {
          campaign: campaignResourceName,
          asset: assetResourceName,
          fieldType: 'CALLOUT'
        }
      }
    });
    operationNames.push(`Callout Link: ${sheetData.callouts[index]}`);
  });
  
  // Spusť fázi 2
  Logger.log(`Spouštím ${operations.length} operací...`);
  const results = AdsApp.mutateAll(operations, { partialFailure: true });
  
  // Kontrola výsledků
  let successCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  
  results.forEach((result, index) => {
    const opName = operationNames[index] || `Operation ${index}`;
    if (result.isSuccessful()) {
      successCount++;
      Logger.log(`✅ ${opName}: OK`);
    } else {
      let errorMsg = 'Unknown error';
      let isPolicyViolation = false;
      try {
        const json = JSON.stringify(result);
        const parsed = JSON.parse(json);
        if (parsed.sc && parsed.sc.Ia && parsed.sc.Ia.errors) {
          errorMsg = parsed.sc.Ia.errors.map(e => e.message).join('; ');
          isPolicyViolation = errorMsg.includes('policy');
        }
      } catch(e) {}
      
      // Policy violations na keywords jsou jen warning
      if (opName.startsWith('Keyword:') && isPolicyViolation) {
        warningCount++;
        Logger.log(`⚠️ ${opName}: ${errorMsg} (keyword přeskočeno)`);
      } else {
        errorCount++;
        Logger.log(`❌ ${opName}: ${errorMsg}`);
      }
    }
  });
  
  Logger.log('');
  Logger.log(`Fáze 2: Úspěšných: ${successCount}, Chyb: ${errorCount}, Varování: ${warningCount}`);
  
  if (errorCount > 0) {
    throw new Error(`${errorCount} operací selhalo. Zkontroluj log.`);
  }
  
  if (warningCount > 0) {
    Logger.log(`⚠️ ${warningCount} keywords přeskočeno kvůli policy violations`);
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
