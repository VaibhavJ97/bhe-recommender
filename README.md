# BHE Recommender - Click Anywhere on Germany

> Interactive geothermal feasibility tool. Click a site on the map of Germany, get a borehole heat exchanger recommendation with cost estimate and downloadable PDF report.

**Live**: [vaibhavj97-bhe.vercel.app](https://vaibhavj97-bhe.vercel.app)

## What this is

A web app that turns my Master's thesis data into a practical decision tool. Click anywhere on Germany and the app reads the sustainable heat-extraction rate at that exact 5 km pixel, then computes:

- Recommended borehole depth
- Expected total power output (W)
- Annual heat delivery (kWh)
- Drilling cost range (EUR)
- Heat pump cost range (EUR)
- Total installation cost estimate
- Plain-language AI interpretation (via Gemini)
- Downloadable PDF report

For homeowners considering geothermal, students learning the field, or anyone curious about a specific site in Germany.

## Tech stack

| Layer | What |
|---|---|
| Map | Leaflet.js |
| Data | 4 ensemble JSON files from my thesis (SSP 2-4.5 and SSP 5-8.5, mean and median) |
| AI interpretation | Google Gemini API (server-side via Vercel function) |
| PDF generation | jsPDF (client-side, no server roundtrip) |
| Cost modeling | Plain JavaScript with German market price ranges |
| Backend | Vercel serverless function (Node.js) for the AI call only |
| Hosting | Vercel |
| Cost | **0 EUR/month** at portfolio scale |

## How it works

1. User clicks anywhere on the map of Germany
2. Frontend reads the closest pixel from `data/ssp245_mean.json` (~373 KB total payload, loaded once)
3. Sustainable extraction rate at that location is fed into the cost model
4. Cost model uses German market ranges for drilling (60-100 EUR/m), heat pump (8,000-15,000 EUR), installation, permits, and produces low/high estimates
5. The result is sent to a Vercel serverless function which calls Gemini for a plain-language interpretation paragraph
6. User can download a complete PDF report with all numbers plus the thesis methodology and disclaimer

## Features

- Interactive Leaflet map of Germany with the heat-extraction layer rendered as a heatmap
- Click-to-query interaction
- Side-by-side result card with all numbers
- AI interpretation paragraph (Gemini)
- Downloadable PDF report (jsPDF, generated entirely in the browser)
- Embed mode (`?embed=1`)
- Mobile-responsive

## Cost model assumptions (German market, 2025-2026)

| Item | Low | High |
|---|---|---|
| Drilling per meter | 60 EUR | 100 EUR |
| Heat pump (15 kW class) | 8,000 EUR | 15,000 EUR |
| Installation | 3,000 EUR | 6,000 EUR |
| Permits and site surveys | 1,000 EUR | 3,000 EUR |

These are conservative ranges. Real costs vary by region, drilling difficulty, contractor pricing, and current material costs.

## Disclaimer

This is a **first-pass feasibility estimate, not engineering advice**. Values come from CMIP6 ensemble averages at 5 km resolution. Local geology, groundwater conditions, surface microclimate, and permitting all shift the real numbers. Treat the output as a starting point for a conversation with a licensed drilling contractor, not a substitute for one.

The PDF report includes a longer version of this disclaimer.

## Run locally

```bash
git clone https://github.com/VaibhavJ97/bhe-recommender.git
cd bhe-recommender
npm install -g vercel
vercel dev
# Open http://localhost:3000
```

Requires `GEMINI_API_KEY` in `.env.local` for the AI interpretation feature.

## Project structure

```
.
├── index.html              # Main UI
├── assets/
│   ├── style.css
│   └── app.js              # Map, cost model, PDF generation
├── data/
│   ├── ssp245_mean.json    # 5 km grid of W/m values, SSP 2-4.5 ensemble mean
│   ├── ssp245_p50.json     # SSP 2-4.5 ensemble median
│   ├── ssp585_mean.json    # SSP 5-8.5 ensemble mean
│   └── ssp585_p50.json     # SSP 5-8.5 ensemble median
├── api/
│   └── interpret.js        # Vercel serverless: Gemini call for plain-language summary
└── README.md
```

## License

MIT for the code. Thesis-derived data follows the same terms as the thesis itself.

## About me

[Portfolio](https://vaibhavj97.vercel.app) · [Thesis project](https://vaibhavj97-thesis.vercel.app) · [GitHub profile](https://github.com/VaibhavJ97) · [LinkedIn](https://www.linkedin.com/in/vaibhavgeo/)
