// src/utils/co2Equivalents.ts
//
// Translates a raw kg CO₂ figure into a relatable real-world comparison.
// Each equivalent is grounded in published sources so figures are citable
// in the FYP thesis evaluation chapter.
//
// Sources:
//  - Smartphone charge:    ~0.008 kg CO₂  (IEA / Carbon Trust, 3.5Wh × grid avg)
//  - Kettle boil:          ~0.020 kg CO₂  (UK avg, 1.5L, ~0.1 kWh × 0.196 kg/kWh, DESNZ 2025 consumed)
//  - Load of laundry:      ~0.185 kg CO₂  (60°C wash + tumble dry, Carbon Trust)
//  - km not driven:     0.16725 kg CO₂  (UK fleet-average car, unknown fuel: DESNZ 2025 flat file,
//                                       Cars (by size) > Average car > Unknown, km, kg CO₂e)
//  - Plastic bottle:       ~0.083 kg CO₂  (500ml PET production, Franklin Associates)
//  - Incandescent bulb:    ~0.012 kg CO₂  (60W bulb × 1hr × 0.196 kg/kWh UK consumed grid, DESNZ 2025)
//  - Hour of video stream: ~0.036 kg CO₂  (IEA 2023, global avg data centre + network)
//  - Hot shower (8 min):   ~0.250 kg CO₂  (avg electric shower 9kW × 8min/60 × 0.196 kg/kWh UK grid)
//  - Flight km (economy):   0.255 kg CO₂  (ICAO per-passenger-km, short-haul avg)
//  - Hour of AC:           ~0.553 kg CO₂  (avg 1.5kW unit × global grid avg 0.473 kg/kWh, Ember 2025)
//  - kWh of grid elec:     ~0.473 kg CO₂  (Ember Global Electricity Review 2025, global avg 2024)
//  - Tree-day absorption:  ~0.060 kg CO₂  (avg deciduous tree, ~22 kg/year ÷ 365)

export interface CO2Equivalent {
  icon: string;
  kgPerUnit: number;
  singular: string;
  plural: string;
  template: string;
}

const EQUIVALENTS: CO2Equivalent[] = [
  { icon: 'mobile-screen-button', kgPerUnit: 0.008,  singular: 'phone charge',                  plural: 'phone charges',                   template: 'powers {n} {label}' },
  { icon: 'mug-hot',              kgPerUnit: 0.020,  singular: 'kettle boil',                   plural: 'kettle boils',                    template: 'saves the same as {n} {label}' },
  { icon: 'shirt',                kgPerUnit: 0.185,  singular: 'laundry load',                  plural: 'laundry loads',                   template: 'like skipping {n} {label}' },
  { icon: 'car',                  kgPerUnit: 0.16725,  singular: 'km of driving avoided',         plural: 'km of driving avoided',           template: '{n} {label}' },
  { icon: 'bottle-water',         kgPerUnit: 0.083,  singular: 'plastic bottle',                plural: 'plastic bottles',                 template: 'offsets {n} {label}' },
  { icon: 'lightbulb',            kgPerUnit: 0.012,  singular: 'hour of incandescent lighting',  plural: 'hours of incandescent lighting',   template: 'like leaving {n} {label} on' },
  { icon: 'tv',                   kgPerUnit: 0.036,  singular: 'hour of streaming',             plural: 'hours of streaming',              template: 'offsets {n} {label}' },
  { icon: 'shower',               kgPerUnit: 0.250,  singular: 'hot shower',                    plural: 'hot showers',                     template: 'like skipping {n} {label}' },
  { icon: 'plane',                kgPerUnit: 0.255,  singular: 'km of flying',                  plural: 'km of flying',                    template: 'avoids {n} {label}' },
  { icon: 'temperature-high',     kgPerUnit: 0.553,  singular: 'hour of AC',                    plural: 'hours of AC',                     template: 'like switching off AC for {n} {label}' },
  { icon: 'bolt',                 kgPerUnit: 0.473,  singular: 'kWh of grid electricity',        plural: 'kWh of grid electricity',          template: 'equals {n} {label} saved' },
  { icon: 'tree',                 kgPerUnit: 0.060,  singular: 'tree absorbing CO₂ for a day',  plural: 'trees absorbing CO₂ for a day',   template: 'like {n} {label}' },
];

export interface EquivalentResult {
  quantity: number;
  quantityFormatted: string;
  label: string;
  icon: string;
  phrase: string;
}

export function getCO2Equivalent(kgSaved: number): EquivalentResult | null {
  if (!kgSaved || kgSaved <= 0) return null;

  const SWEET_SPOT = 50;

  const scored = EQUIVALENTS.map(eq => {
    const quantity = kgSaved / eq.kgPerUnit;
    let score = 0;
    if      (quantity >= 5   && quantity < 500)   score = 100;
    else if (quantity >= 2   && quantity < 5)     score = 80;
    else if (quantity >= 500 && quantity < 2000)  score = 60;
    else if (quantity >= 1   && quantity < 2)     score = 40;
    else if (quantity >= 2000)                    score = 20;
    else                                          score = 10;
    const distFromSweet = Math.abs(quantity - SWEET_SPOT);
    return { eq, quantity, score, distFromSweet };
  });

  scored.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.distFromSweet - b.distFromSweet
  );

  const best     = scored[0];
  const quantity = best.quantity;

  let rounded: number;
  if      (quantity >= 200) rounded = Math.round(quantity);
  else if (quantity >= 20)  rounded = Math.round(quantity * 2) / 2;
  else if (quantity >= 1)   rounded = Math.round(quantity * 10) / 10;
  else                      rounded = Math.round(quantity * 100) / 100;

  const formatNum = (n: number): string => {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return (n % 1 === 0 ? String(n) : String(n)).replace(/\.0$/, '');
  };

  const quantityFormatted = formatNum(rounded);
  const label  = rounded === 1 ? best.eq.singular : best.eq.plural;
  const phrase = best.eq.template
    .replace('{n}', quantityFormatted)
    .replace('{label}', label);

  return { quantity: rounded, quantityFormatted, label, icon: best.eq.icon, phrase };
}