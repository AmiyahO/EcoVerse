// src/utils/co2Equivalents.ts
//
// Translates a raw kg CO₂ figure into a relatable real-world comparison.
// Each equivalent is grounded in published sources so figures are citable
// in the FYP thesis evaluation chapter.
//
// Sources:
//  - Smartphone charge:    ~0.008 kg CO₂  (IEA / Carbon Trust, 3.5Wh × grid avg)
//  - Kettle boil:          ~0.027 kg CO₂  (UK avg, 1.5L, ~0.1 kWh, DESNZ 2023)
//  - Load of laundry:      ~0.185 kg CO₂  (60°C wash + tumble dry, Carbon Trust)
//  - km not driven:         0.192 kg CO₂  (avg petrol car, DESNZ GHG factors 2023)
//  - Plastic bottle:       ~0.083 kg CO₂  (500ml PET production, Franklin Associates)
//  - Cup of coffee:        ~0.021 kg CO₂  (espresso incl. milk, Carbon Trust)
//  - Hour of video stream: ~0.036 kg CO₂  (IEA 2023, global avg data centre + network)
//  - Balloon of CO₂:       ~0.001 kg CO₂  (1L balloon ≈ 1.96g CO₂ at STP)
//  - Flight km (economy):   0.255 kg CO₂  (ICAO per-passenger-km, short-haul avg)
//  - Hour of AC:           ~0.580 kg CO₂  (avg 1.5kW unit × global grid avg 0.475)
//  - Burger (beef):        ~2.500 kg CO₂  (lifecycle avg, Poore & Nemecek 2018)

export interface CO2Equivalent {
  /** FontAwesome6 icon name */
  icon: string;
  /** kg CO₂ per one unit */
  kgPerUnit: number;
  /** Label for quantity === 1 */
  singular: string;
  /** Label for quantity > 1 */
  plural: string;
  /**
   * Phrase template. Use {n} for quantity, {label} for singular/plural.
   * e.g. "powered {n} {label}" → "powered 45 smartphone charges"
   */
  template: string;
}

const EQUIVALENTS: CO2Equivalent[] = [
  {
    icon: 'mobile-screen-button',
    kgPerUnit: 0.008,
    singular: 'smartphone charge',
    plural: 'smartphone charges',
    template: 'enough to charge {n} {label}',
  },
  {
    icon: 'mug-hot',
    kgPerUnit: 0.027,
    singular: 'kettle boil',
    plural: 'kettle boils',
    template: 'the same as {n} {label}',
  },
  {
    icon: 'shirt',
    kgPerUnit: 0.185,
    singular: 'load of laundry',
    plural: 'loads of laundry',
    template: 'equivalent to {n} {label}',
  },
  {
    icon: 'car',
    kgPerUnit: 0.192,
    singular: 'km not driven',
    plural: 'km not driven',
    template: 'like skipping {n} {label}',
  },
  {
    icon: 'bottle-water',
    kgPerUnit: 0.083,
    singular: 'plastic bottle',
    plural: 'plastic bottles',
    template: 'like making {n} {label} disappear',
  },
  {
    icon: 'mug-saucer',
    kgPerUnit: 0.021,
    singular: 'cup of coffee',
    plural: 'cups of coffee',
    template: 'about {n} {label} worth of emissions',
  },
  {
    icon: 'tv',
    kgPerUnit: 0.036,
    singular: 'hour of streaming',
    plural: 'hours of streaming',
    template: 'offsetting {n} {label}',
  },
  {
    icon: 'wind',
    kgPerUnit: 0.00196,
    singular: 'balloon of CO₂',
    plural: 'balloons of CO₂',
    template: 'like deflating {n} {label}',
  },
  {
    icon: 'plane',
    kgPerUnit: 0.255,
    singular: 'km of flying',
    plural: 'km of flying',
    template: 'equivalent to {n} {label} avoided',
  },
  {
    icon: 'temperature-high',
    kgPerUnit: 0.580,
    singular: 'hour of air conditioning',
    plural: 'hours of air conditioning',
    template: 'like turning off AC for {n} {label}',
  },
  {
    icon: 'burger',
    kgPerUnit: 2.500,
    singular: 'beef burger',
    plural: 'beef burgers',
    template: 'the carbon cost of {n} {label}',
  },
];

export interface EquivalentResult {
  quantity: number;
  quantityFormatted: string;
  /** singular or plural label */
  label: string;
  icon: string;
  /** Ready-to-display phrase, e.g. "like skipping 14 km not driven" */
  phrase: string;
}

/**
 * Given a CO₂ saving in kg, returns the most readable and relatable equivalent.
 *
 * Selection strategy:
 *  1. Score each candidate by how "readable" its quantity is (ideal: 5–500).
 *  2. Break ties by distance from the sweet-spot of 50 — closer = better.
 *  3. Format the quantity cleanly (no trailing .0 for whole numbers).
 */
export function getCO2Equivalent(kgSaved: number): EquivalentResult | null {
  if (!kgSaved || kgSaved <= 0) return null;

  const SWEET_SPOT = 50; // quantities near this feel most impressive

  const scored = EQUIVALENTS.map(eq => {
    const quantity = kgSaved / eq.kgPerUnit;
    let score = 0;
    if      (quantity >= 5   && quantity < 500)   score = 100;
    else if (quantity >= 2   && quantity < 5)     score = 80;
    else if (quantity >= 500 && quantity < 2000)  score = 60;
    else if (quantity >= 1   && quantity < 2)     score = 40;
    else if (quantity >= 2000)                    score = 20;
    else                                          score = 10; // < 1
    // Tiebreak: prefer quantities closer to sweet spot
    const distFromSweet = Math.abs(quantity - SWEET_SPOT);
    return { eq, quantity, score, distFromSweet };
  });

  // Sort: higher score first; within same score, closer to sweet spot first
  scored.sort((a, b) =>
    b.score !== a.score
      ? b.score - a.score
      : a.distFromSweet - b.distFromSweet
  );

  const best = scored[0];
  const quantity = best.quantity;

  // Clean rounding — no unnecessary decimals
  let rounded: number;
  if      (quantity >= 200)  rounded = Math.round(quantity);
  else if (quantity >= 20)   rounded = Math.round(quantity * 2) / 2;   // nearest 0.5
  else if (quantity >= 2)    rounded = Math.round(quantity * 10) / 10; // 1 dp
  else if (quantity >= 1)    rounded = Math.round(quantity * 10) / 10;
  else                       rounded = Math.round(quantity * 100) / 100;

  // Format: strip trailing .0, use k for thousands
  const formatNum = (n: number): string => {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    const s = n % 1 === 0 ? String(n) : String(n);
    return s.replace(/\.0$/, '');
  };

  const quantityFormatted = formatNum(rounded);
  const label = rounded === 1 ? best.eq.singular : best.eq.plural;
  const phrase = best.eq.template
    .replace('{n}', quantityFormatted)
    .replace('{label}', label);

  return {
    quantity: rounded,
    quantityFormatted,
    label,
    icon: best.eq.icon,
    phrase,
  };
}