const { ALLOWED_BRANDS } = require('../config/constants');

/**
 * Filtre kodunun boşluklu ve boşluksuz formatlarını üretir
 */
function getCodeVariations(code) {
  if (!code) return [];
  const raw = String(code).trim();
  const noSpaces = raw.replace(/\s+/g, "");
  const withSpaces = raw.replace(/([A-Za-z]+)(\d+)/g, "$1 $2");
  return [...new Set([raw, noSpaces, withSpaces])];
}

/**
 * Filtre kodunu normalize eder (/ ve - karakterlerini korur)
 */
function normalizeCode(code) {
  if (!code) return "";
  return String(code).replace(/[\s()#+]/g, "").toUpperCase();
}

/**
 * İki filtre kodunun TAM BİREBİR EŞLEŞTİĞİNİ doğrular.
 * Boşluk, büyük/küçük harf ve slash toleranslı katı karşılaştırma yapar.
 */
function isExactCodeMatch(targetCode, candidateCode) {
  if (!targetCode || !candidateCode) return false;
  const nTarget = normalizeCode(targetCode);
  const nCandidate = normalizeCode(candidateCode);
  if (nTarget.length > 0 && nTarget === nCandidate) return true;

  // Sitelerden biri slash kullanmadan yazmışsa (örn: WK 940/36 x vs WK94036X):
  const rawTarget = nTarget.replace(/[\/\-_.]/g, "");
  const rawCandidate = nCandidate.replace(/[\/\-_.]/g, "");
  return rawTarget.length > 0 && rawTarget === rawCandidate;
}

/**
 * Geçersiz kod ve tablo başlık metinlerini filtreler
 */
function isValidCode(code) {
  if (!code) return false;
  const c = String(code).trim();
  if (c.length < 2 || c.length > 35) return false;
  const lower = c.toLowerCase();
  if (
    lower.includes("muadil") ||
    lower.includes("referans") ||
    lower.includes("orijinal") ||
    lower.includes("filtre durumu") ||
    lower.includes("üretici") ||
    lower.includes("şampiyon kodu") ||
    lower.includes("parça no") ||
    lower.includes("available") ||
    lower.includes("aktif") ||
    lower.includes("karşılaştır") ||
    lower.includes("resim") ||
    lower.includes("yok") ||
    lower.includes("bilinmiyor") ||
    lower.includes("unknown") ||
    c === "-"
  ) {
    return false;
  }
  return true;
}

/**
 * Gelen marka adını standart 24 izinli marka listesine eşler
 */
function normalizeBrand(brand) {
  if (!brand) return null;
  const b = brand.trim().toUpperCase();

  if (b.includes("FLEETGUARD")) return "FLEETGUARD";
  if (b.includes("DONALDSON")) return "DONALDSON";
  if (b.includes("MANN")) return "MANN-FILTER";
  if (b.includes("ASAŞ") || b.includes("ASAS")) return "ASAŞ";
  if (b.includes("SAMPIYON") || b.includes("ŞAMPİYON")) return "ŞAMPİYON";
  if (b.includes("HIFI")) return "HiFi";
  if (b.includes("SF-FILTER") || b.includes("SF FILTER") || b === "SF") return "SF-FILTER";
  if (b.includes("MAHLE") || b.includes("KNECHT")) return "MAHLE";
  if (b.includes("HENGST")) return "HENGST";
  if (b.includes("BALDWIN")) return "BALDWIN";
  if (b.includes("FILMAR") || b.includes("FİLMAR")) return "FİLMAR";
  if (b.includes("SCTURBO") || b.includes("SC TURBO")) return "SCTURBO";
  if (b.includes("MYER")) return "MYER";
  if (b.includes("MICRONIC")) return "MICRONIC";
  if (b.includes("AUTOTECHNIK") || b.includes("AUTO TECHNIK")) return "AUTOTECHNIK";
  if (b.includes("BAVARIA")) return "BAVARIA";
  if (b.includes("PARKER") || b.includes("RACOR")) return "PARKER";
  if (b.includes("CATERPILLAR") || b === "CAT") return "CATERPILLAR";
  if (b.includes("VOLVO")) return "VOLVO";
  if (b.includes("SCANIA")) return "SCANIA";
  if (b.includes("KOMATSU")) return "KOMATSU";
  if (b.includes("PERKINS")) return "PERKINS";
  if (b.includes("FERRA")) return "FERRA";
  if (
    b.includes("FIL FILTER") ||
    b.includes("FİL FİLTRE") ||
    b.startsWith("FIL") ||
    b.startsWith("FİL") ||
    b === "FIL" ||
    b === "FİL"
  ) {
    return "FİL FİLTRE";
  }

  const directMatch = ALLOWED_BRANDS.find((ab) => ab.toUpperCase() === b);
  if (directMatch) return directMatch;

  return null;
}

module.exports = {
  getCodeVariations,
  normalizeCode,
  isExactCodeMatch,
  isValidCode,
  normalizeBrand
};
