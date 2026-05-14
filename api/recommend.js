// BHE Recommender - Vercel Serverless Function
// Takes site + demand input, calculates drilling recommendation, AI explanation.

const THESIS_CONTEXT = `
You are an AI assistant explaining results from a Borehole Heat Exchanger (BHE)
drilling site recommendation tool. The tool is built by Vaibhav Jaiswal, based on
his Master's thesis at KIT on climate change impact on shallow geothermal potential
in Germany.

# Background from the thesis

- 8 CMIP6 climate models analyzed, two scenarios (SSP 2-4.5 moderate, SSP 5-8.5 high).
- Three time horizons: 50 years (depleting), 100 years (depleting), 100 years sustainable.
- By 2100, subsurface warming is +1.7 deg C (SSP 2-4.5) to +3.1 deg C (SSP 5-8.5).
- Mean sustainable extraction: 46.05 W/m (SSP 2-4.5) -> 47.39 W/m (SSP 5-8.5).
- Mean power per 150m BHE: 5503 W (SSP 2-4.5) -> 5603 W (SSP 5-8.5) under sustainable operation.
- High-yield regions: southwestern Germany, Berlin, Munich, Frankfurt, Rhine-Ruhr.
- Low-yield regions: northern and eastern Germany.
- Drilling equivalent rule: each 1 deg C of additional warming reduces required depth by roughly 4 m.

# Style rules

1. Keep your explanation to 3-5 short sentences. Be specific and cite numbers.
2. Use simple English. No jargon unless necessary.
3. Never use em dashes. Use commas or short sentences.
4. Never use emojis.
5. Always reference how the climate context affects this specific recommendation.
6. Mention one practical consideration (e.g. local geology, groundwater, regulations, urban siting).
7. Do not invent costs or technical numbers; only explain the ones given to you.
8. Always respond in clear, professional English.
`;

// =============================================================================
// REGIONAL BHE POTENTIAL DATA (derived from thesis findings)
// =============================================================================
// Values are mean sustainable heat extraction rate (W/m) under SSP 5-8.5,
// 100-year sustainable scenario. Each region also has a low-end and high-end
// to communicate uncertainty.
//
// Source: Vaibhav Jaiswal Master's thesis (KIT, 2026), Appendix A Tables.

const REGIONS = {
  southwest: {
    label: 'Southwestern Germany (Baden-Württemberg, Rhine Valley)',
    q_sustainable: 49.5,  // W/m (high-yield region)
    q_range: [46, 52],
    notes: 'Among the highest geothermal potential in Germany due to favorable geology and subsurface temperatures.',
    yield_class: 'high'
  },
  munich: {
    label: 'Munich and surroundings (Bavaria)',
    q_sustainable: 48.8,
    q_range: [45, 51],
    notes: 'Strong urban heat island effect boosts subsurface temperature, supporting high BHE output.',
    yield_class: 'high'
  },
  berlin: {
    label: 'Berlin and Brandenburg',
    q_sustainable: 47.5,
    q_range: [44, 50],
    notes: 'Berlin\'s SUHI (Subsurface Urban Heat Island) lifts ground temperature substantially.',
    yield_class: 'high'
  },
  frankfurt: {
    label: 'Frankfurt and Rhine-Main metropolitan area',
    q_sustainable: 48.0,
    q_range: [45, 50],
    notes: 'Dense urban core with strong heat island effect.',
    yield_class: 'high'
  },
  rhine_ruhr: {
    label: 'Rhine-Ruhr (North Rhine-Westphalia)',
    q_sustainable: 47.0,
    q_range: [43, 49],
    notes: 'Industrial metropolitan area with mature geothermal infrastructure.',
    yield_class: 'high'
  },
  west: {
    label: 'Western Germany (Saarland, Rhineland-Palatinate)',
    q_sustainable: 46.0,
    q_range: [42, 48],
    notes: 'Moderate to good yield. Geology varies from rift valley sediments to crystalline rock.',
    yield_class: 'medium'
  },
  east: {
    label: 'Eastern Germany (Saxony, Thuringia, Saxony-Anhalt)',
    q_sustainable: 44.5,
    q_range: [41, 47],
    notes: 'Slightly lower thermal conductivity in some zones, but still viable.',
    yield_class: 'medium'
  },
  north: {
    label: 'Northern Germany (Lower Saxony, Schleswig-Holstein, Hamburg)',
    q_sustainable: 43.5,
    q_range: [40, 46],
    notes: 'Lower-end yield class. Shallow groundwater can help in some areas.',
    yield_class: 'low'
  }
};

// =============================================================================
// COST CONSTANTS (Germany, 2025-2026 estimates from literature)
// =============================================================================

const COST = {
  drilling_per_m: { min: 50, max: 90, default: 70 },  // EUR / m
  heat_pump: { min: 8000, max: 15000, default: 11000 },  // EUR per unit
  ancillary: 2500,  // permits, installation, connection (EUR)
};

// =============================================================================
// CALCULATION LOGIC
// =============================================================================

/**
 * Calculate recommended borehole depth given thermal demand and regional yield.
 * Returns depth in meters (rounded to nearest 10m).
 */
function calculateDepth(demand_kW, q_per_m) {
  // demand_kW = kilowatts of heat needed
  // q_per_m = sustainable W per meter for this region
  // depth = demand_W / q_per_m
  const demand_W = demand_kW * 1000;
  const raw_depth = demand_W / q_per_m;
  // Round up to nearest 10 m for practical drilling
  return Math.ceil(raw_depth / 10) * 10;
}

/**
 * Estimate total power output of installed BHE at recommended depth.
 */
function calculatePower(depth_m, q_per_m) {
  // Returns kW (rounded to 1 decimal)
  return Math.round((depth_m * q_per_m) / 100) / 10;
}

/**
 * Calculate cost breakdown.
 */
function calculateCost(depth_m, useCases) {
  // Drilling cost using default rate
  const drilling = depth_m * COST.drilling_per_m.default;
  const drilling_min = depth_m * COST.drilling_per_m.min;
  const drilling_max = depth_m * COST.drilling_per_m.max;

  // Heat pump cost varies with feature set
  const heat_pump = COST.heat_pump.default;
  let extras = 0;

  // Cooling capability adds ~15% to heat pump cost
  if (useCases.cooling) extras += 1500;
  // Hot water capability is usually integrated, small premium
  if (useCases.hotWater) extras += 800;

  const total = drilling + heat_pump + extras + COST.ancillary;

  return {
    drilling: Math.round(drilling),
    drilling_range: [Math.round(drilling_min), Math.round(drilling_max)],
    heat_pump: heat_pump,
    cooling_addon: useCases.cooling ? 1500 : 0,
    hot_water_addon: useCases.hotWater ? 800 : 0,
    ancillary: COST.ancillary,
    total: Math.round(total),
    cost_per_kW: 0  // filled in below
  };
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { region, demand_kW, budget_eur, useCases = {}, scenario = 'ssp585' } = req.body;

    // Validation
    if (!region || !REGIONS[region]) {
      return res.status(400).json({ error: 'Invalid region' });
    }
    if (!demand_kW || demand_kW < 1 || demand_kW > 100) {
      return res.status(400).json({ error: 'Heating demand must be between 1 and 100 kW' });
    }

    const regionData = REGIONS[region];

    // Adjust q for SSP scenario (thesis: ~3% difference)
    let q_used = regionData.q_sustainable;
    if (scenario === 'ssp245') {
      q_used = q_used * 0.97;  // SSP 2-4.5 is ~3% lower than SSP 5-8.5
    }

    // Calculations
    const depth = calculateDepth(demand_kW, q_used);
    const power_actual_kW = calculatePower(depth, q_used);
    const cost = calculateCost(depth, useCases);
    cost.cost_per_kW = Math.round(cost.total / power_actual_kW);

    // Budget check
    const budgetStatus = budget_eur ? {
      provided: budget_eur,
      fits: cost.total <= budget_eur,
      delta: budget_eur - cost.total
    } : null;

    // Compose calculation summary for the AI
    const calcSummary = `
Region: ${regionData.label}
Yield class: ${regionData.yield_class}
Mean sustainable extraction rate used: ${q_used.toFixed(1)} W/m (range ${regionData.q_range[0]}-${regionData.q_range[1]} W/m)
Climate scenario: ${scenario === 'ssp585' ? 'SSP 5-8.5 (high emissions)' : 'SSP 2-4.5 (moderate emissions)'}
User heating demand: ${demand_kW} kW
Use cases: heating${useCases.cooling ? ' + cooling' : ''}${useCases.hotWater ? ' + hot water' : ''}
Recommended borehole depth: ${depth} m
Expected sustainable thermal output at this depth: ${power_actual_kW} kW
Estimated total cost: EUR ${cost.total.toLocaleString('en-US')}
Cost per kW capacity: EUR ${cost.cost_per_kW.toLocaleString('en-US')} / kW
${budgetStatus ? `User budget: EUR ${budget_eur.toLocaleString('en-US')}, fits within budget: ${budgetStatus.fits ? 'yes' : 'no (over by EUR ' + Math.abs(budgetStatus.delta).toLocaleString('en-US') + ')'}` : 'No budget specified'}
Regional note: ${regionData.notes}
`;

    // Get AI explanation
    let aiExplanation = null;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const prompt = `A user is considering installing a borehole heat exchanger (BHE) with these parameters:

${calcSummary}

Please write a 3-5 sentence personalized recommendation. Mention:
- Why this region's potential is good/medium/poor (refer to the thesis context)
- How climate change affects this recommendation by 2100
- One practical consideration (geology, regulations, sustainability)
- Whether the cost is reasonable for the output

Do not repeat the raw numbers verbatim, instead interpret them.`;

        const geminiResponse = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + apiKey,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: THESIS_CONTEXT }] },
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
              safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              ],
            }),
          }
        );

        if (geminiResponse.ok) {
          const data = await geminiResponse.json();
          aiExplanation = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } else {
          console.error('Gemini API non-OK:', geminiResponse.status);
        }
      } catch (err) {
        console.error('Gemini call failed:', err);
      }
    }

    // Response
    return res.status(200).json({
      input: { region, demand_kW, budget_eur, useCases, scenario },
      region: {
        key: region,
        label: regionData.label,
        yield_class: regionData.yield_class,
        q_used: Math.round(q_used * 10) / 10,
        q_range: regionData.q_range,
        notes: regionData.notes
      },
      recommendation: {
        depth_m: depth,
        power_kW: power_actual_kW,
        cost: cost,
        budget_status: budgetStatus,
        scenario_used: scenario
      },
      ai_explanation: aiExplanation || 'AI explanation unavailable. The calculation above is based on regional averages from the thesis. For best results, also consider local geology and groundwater conditions.'
    });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
