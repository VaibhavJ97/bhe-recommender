# BHE Recommender

A borehole drilling site recommender for shallow geothermal energy in Germany. The tool helps homeowners and small developers assess feasibility, depth and cost for a ground-source heat pump installation.

Live: [vaibhavj97-bhe.vercel.app](https://vaibhavj97-bhe.vercel.app)

## What it does

Given a region in Germany, a heating demand (kW), an optional budget, and use-case toggles (cooling, hot water), the tool returns:

- Recommended borehole depth (m)
- Expected sustainable thermal output (kW)
- Itemised cost estimate (drilling, heat pump, ancillary)
- Budget-fit indicator
- AI-generated personalised explanation grounded in thesis findings

## How it works

The depth recommendation is derived from the region's mean sustainable extraction rate (W/m), itself taken from the underlying thesis at KIT. For each region, the tool uses the mean SSP 5-8.5 100-year sustainable value, adjusted for the selected scenario:

```
depth_m = ceil(demand_W / q_sustainable_W_per_m / 10) * 10
output_kW = depth_m * q_sustainable / 1000
```

Cost is calculated with literature-default rates (€50-90 per metre drilling, €11,000 for the heat pump unit, plus permits and add-ons).

The Vercel function then sends the calculation summary to Google Gemini with a tightly-scoped system prompt, which returns a 3-5 sentence personalised explanation citing thesis findings.

## Stack

- HTML, CSS, vanilla JS (no framework)
- Vercel serverless functions
- Google Gemini 2.x Flash (LLM)

## Architecture

```
user -> static frontend (index.html)
            |
            v
       /api/recommend (Vercel serverless function)
            |
            +-- regional yield table (in code)
            +-- depth + cost calculation
            |
            v
       Google Gemini API (interprets results)
            |
            v
       Combined JSON response back to UI
```

## Run locally

```bash
npm install -g vercel
cd bhe-recommender
vercel dev
```

Set `GEMINI_API_KEY` in `.env.local` for local dev, or in the Vercel dashboard for production.

## Limitations and disclaimer

The output is a first-pass feasibility estimate, not engineering advice.
- Regional yields are means; local geology and groundwater can shift the actual value by 10-30%.
- Drilling costs vary widely by contractor, region and permitting complexity.
- No site-specific permits, distance-to-property, or building code checks are performed.

For a real project, consult a licensed geothermal contractor and a thermal response test (TRT).

## Author

[Vaibhav Jaiswal](https://vaibhavj97.vercel.app)
MSc Applied Geosciences, KIT
[LinkedIn](https://www.linkedin.com/in/vaibhavgeo) | [GitHub](https://github.com/VaibhavJ97)
