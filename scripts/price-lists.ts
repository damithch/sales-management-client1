// Products from the Aimone Holdings price lists (prices include 18% VAT):
//   Alcatel feature phones, effective 8 June 2026
//   KXD smartphones, effective 3 November 2026
//   Kieslect smart watches, power banks and ear buds, effective 12 November 2026
// RD credit and Dealer credit are the 14-day credit prices. Where a list gives
// a single RD or Dealer price, it is stored as the cash price and the credit
// price is left blank, so credit sales use the cash price.

export type PriceListProduct = {
  brand: string;
  category: string;
  model: string;
  capacity: string;
  sku: string;
  rd_cash: number;
  rd_credit: number | null;
  dealer_cash: number;
  dealer_credit: number | null;
  mrp: number;
};

const kieslect = (
  category: string,
  model: string,
  sku: string,
  rd: number,
  dealer: number,
  mrp: number,
  capacity = "",
): PriceListProduct => ({
  brand: "Kieslect",
  category,
  model,
  capacity,
  sku,
  rd_cash: rd,
  rd_credit: null,
  dealer_cash: dealer,
  dealer_credit: null,
  mrp,
});

export const PRICE_LIST_PRODUCTS: PriceListProduct[] = [
  {
    brand: "Alcatel",
    category: "Feature phone",
    model: "1021",
    capacity: "",
    sku: "ALC-1021",
    rd_cash: 4603,
    rd_credit: 4653,
    dealer_cash: 4950,
    dealer_credit: 5005,
    mrp: 5499,
  },
  {
    brand: "Alcatel",
    category: "Feature phone",
    model: "1041",
    capacity: "",
    sku: "ALC-1041",
    rd_cash: 7532,
    rd_credit: 7613,
    dealer_cash: 8099,
    dealer_credit: 8189,
    mrp: 8999,
  },
  {
    brand: "KXD",
    category: "Smartphone",
    model: "A07",
    capacity: "3+8GB/32GB",
    sku: "KXD-A07-32",
    rd_cash: 27927,
    rd_credit: 28227,
    dealer_cash: 30029,
    dealer_credit: 30359,
    mrp: 32999,
  },
  {
    brand: "KXD",
    category: "Smartphone",
    model: "A5",
    capacity: "3+8GB/64GB",
    sku: "KXD-A5-64",
    rd_cash: 33005,
    rd_credit: 33360,
    dealer_cash: 35489,
    dealer_credit: 35879,
    mrp: 38999,
  },
  kieslect("Ear buds", "SCYKEI Ear-Clip", "KS-EB-EARCLIP", 7037, 7649, 8999),
  kieslect(
    "Ear buds",
    "Ectra Ear Bud Free ANC",
    "KS-EB-FREEANC",
    6646,
    7224,
    8499,
  ),
  kieslect("Ear buds", "Adjustable Ear Buds", "KS-EB-ADJ", 6255, 6799, 7999),
  kieslect("Ear buds", "Ectra Ear Bud Echo", "KS-EB-ECHO", 4300, 4674, 5499),
  kieslect(
    "Power bank",
    "Ectra Nano Power Bank",
    "KS-PB-NANO20K",
    10947,
    11899,
    13999,
    "20,000mAh 45W",
  ),
  kieslect(
    "Power bank",
    "Ectra Pocket Power Bank",
    "KS-PB-POCKET12K",
    10556,
    11474,
    13499,
    "12,000mAh 65W",
  ),
  kieslect(
    "Power bank",
    "Ectra Duel Power Bank",
    "KS-PB-DUEL20K",
    7819,
    8499,
    9999,
    "20,000mAh 22.5W",
  ),
  kieslect(
    "Power bank",
    "Ectra Lux Power Bank",
    "KS-PB-LUX10K",
    5473,
    5949,
    6999,
    "10,000mAh 22.5W",
  ),
  kieslect(
    "Smart watch",
    "Smart Calling Watch Actor",
    "KS-SW-ACTOR",
    27964,
    29749,
    34999,
  ),
  kieslect(
    "Smart watch",
    "Smart Calling Watch KS3",
    "KS-SW-KS3",
    21572,
    22949,
    26999,
  ),
  kieslect("Smart watch", "Balancer", "KS-SW-BALANCER", 14857, 16149, 18999),
  kieslect(
    "Smart watch",
    "Lady Smart Watch Pura P1",
    "KS-SW-PURAP1",
    13582,
    14449,
    16999,
  ),
  kieslect(
    "Smart watch",
    "SCYKEI Call Watch GS Pro",
    "KS-SW-GSPRO",
    5592,
    5949,
    6999,
  ),
];
