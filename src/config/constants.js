/**
 * İzin verilen 24 resmi filtre üreticisi listesi
 */
const ALLOWED_BRANDS = Object.freeze([
  "FLEETGUARD",
  "DONALDSON",
  "MANN-FILTER",
  "ASAŞ",
  "ŞAMPİYON",
  "HiFi",
  "SF-FILTER",
  "FİL FİLTRE",
  "MAHLE",
  "HENGST",
  "BALDWIN",
  "FİLMAR",
  "SCTURBO",
  "MYER",
  "MICRONIC",
  "AUTOTECHNIK",
  "BAVARIA",
  "PARKER",
  "CATERPILLAR",
  "VOLVO",
  "SCANIA",
  "KOMATSU",
  "PERKINS",
  "FERRA"
]);

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

module.exports = {
  ALLOWED_BRANDS,
  USER_AGENT
};
