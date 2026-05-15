# BHE Recommender - Click anywhere on Germany

> Site-specific shallow geothermal feasibility tool. Click any point on the map, enter your heating demand, and get a recommended borehole depth, sustainable output, full cost breakdown, and a downloadable PDF report. Grounded in my Master's thesis at KIT, 2026.

**Live site:** [vaibhavj97-bhe.vercel.app](https://vaibhavj97-bhe.vercel.app)

---

## About this repo

The BHE (Borehole Heat Exchanger) Recommender is an interactive feasibility tool for shallow geothermal heat pumps anywhere in Germany. It uses pre-computed sustainable extraction rates from my Master's thesis at KIT - 5 km resolution data derived from 8 CMIP6 climate models under two emission scenarios.

The user clicks a location, the tool reads the W/m value at that exact pixel, then a Vercel serverless function computes a recommended borehole depth, expected sustainable output, full cost breakdown, and budget check. Google Gemini writes a personalized site interpretation, and the whole report can be downloaded as a multi-page PDF.

This repo is one of four in my portfolio:

- [Portfolio homepage](https://vaibhavj97.vercel.app)
- [Master Thesis Project](https://vaibhavj97-thesis.vercel.app)
- [GeoChat](https://vaibhavj97-geochat.vercel.app)
- **BHE Recommender** (this repo)

## Features

- Interactive Leaflet map of Germany with sustainable extraction overlay (W/m)
- Click anywhere on Germany to pick a site
- Scenario selector (SSP 2-4.5 or SSP 5-8.5)
- Ensemble statistic selector (mean or P50 median)
- Form for heating demand (kW), budget (optional), and use cases (heating always; cooling and hot water optional)
- Calculated recommendation:
  - Borehole depth (m)
  - Sustainable output (kW)
  - Cost breakdown (drilling, heat pump, ancillary, optional add-ons)
  - Budget check (within / over with delta)
  - Time-horizon comparison (50 yr depleting vs 50 yr sustainable vs 100 yr sustainable)
- AI-generated site interpretation via Google Gemini
- Multi-page PDF report (jsPDF) with branding, cost table, comparison cards, methodology, disclaimer
- Sticky portfolio nav linking all four sites
- "About / How it works / Tech stack" explainer sections after the workspace

## Tech stack

- **Frontend:** Vanilla HTML / CSS / JavaScript
- **Mapping:** [Leaflet.js](https://leafletjs.com) + [chroma-js](https://gka.github.io/chroma.js/) for color scales
- **PDF generation:** [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com/) (client-side)
- **Backend:** [Vercel serverless function](https://vercel.com/docs/functions) (Node.js)
- **AI:** [Google Gemini](https://aistudio.google.com) for site interpretation (free tier)
- **Data:** 4 pre-computed JSON files from my thesis (2 scenarios × 2 statistics)
- **Hosting:** Vercel (free tier), auto-deployed from GitHub
- **Total cost to run:** €0 / month

## How it works

1. **Map loads** - the 100-year sustainable extraction map for the chosen scenario/statistic is rendered on Leaflet via canvas + chroma-js. Pixels are crisp-rendered at 5 km resolution.
2. **User clicks a site** - the frontend reads the W/m value at that pixel from the JSON, plus the two other time-horizon values (50 yr depleting, 50 yr sustainable).
3. **User configures** - heating demand (kW), optional budget, and use-case checkboxes.
4. **POST to `/api/recommend`** - the serverless function receives the q value, location, demand, budget, and use cases.
5. **Backend computes:**
   - Required borehole depth = demand / (q × heat-pump efficiency factor)
   - Drilling cost = depth × German market rate (50-90 EUR/m typical)
   - Heat pump unit cost (8,000-15,000 EUR typical)
   - Optional cooling and hot-water add-ons
   - Permits, install, system connection
   - Total + budget delta
   - Time-horizon comparison at the same depth
6. **Gemini call** - the backend asks Gemini to write a natural-language interpretation of the site (what yield class it is, what to watch out for, how the scenarios differ).
7. **Result renders** - the page shows the recommendation card with all numbers, AI interpretation, and a PDF download button.
8. **PDF generation (client-side)** - jsPDF builds a multi-page A4 report with header, key numbers, cost breakdown, comparison cards, AI interpretation, methodology, and disclaimer.

The PDF is generated entirely in the browser; no map screenshot is included (cleaner output, faster generation, and the rectangular raster looked awkward on a printed page).

## How to reproduce locally

You need a free Gemini API key.

### 1. Get a Gemini API key

Go to [aistudio.google.com](https://aistudio.google.com), sign in with Google, click "Get API key", and copy the key.

### 2. Install Vercel CLI

```bash
npm install -g vercel
```

### 3. Clone and set up

```bash
git clone https://github.com/VaibhavJ97/bhe-recommender.git
cd bhe-recommender
npm install
```

### 4. Add your API key

Create `.env.local` in the project root:

```
GEMINI_API_KEY=your_key_here
```

### 5. Run

```bash
vercel dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Project structure

```
bhe-recommender/
├── index.html              UI (map, form, results, explainer sections, footer)
├── api/
│   └── recommend.js        Serverless function (calculation + Gemini call)
├── data/
│   ├── ssp585_mean.json    SSP 5-8.5, ensemble mean
│   ├── ssp585_p50.json     SSP 5-8.5, ensemble median
│   ├── ssp245_mean.json    SSP 2-4.5, ensemble mean
│   └── ssp245_p50.json     SSP 2-4.5, ensemble median
├── package.json
├── vercel.json
└── README.md
```

Each JSON file contains the three relevant layers (`ql_Urban_50yr`, `ql_UrbanRenew_50yr`, `ql_UrbanRenew_max_100yr`) as 2D arrays plus metadata (extent, shape, resolution). The frontend reads pixel values directly without round-tripping to a server.

## Cost model assumptions

The cost calculation uses ranges from German market data, not contractor quotes. These are starting points for feasibility, not commitments.

| Component | Range / Default |
|-----------|------------------|
| Drilling | 50-90 EUR/m (typical German range) |
| Heat pump unit | 8,000-15,000 EUR (4-12 kW units) |
| Cooling reversal add-on | ~1,500 EUR (optional) |
| Hot water integration | ~1,200 EUR (optional) |
| Permits, install, connection | bundled |
| Heat pump efficiency factor | ~0.75 (sustainable extraction to heating output) |

## Disclaimer

This tool gives **first-pass feasibility estimates only**. It is not engineering advice. Actual geothermal yield depends on:

- Local subsurface geology
- Groundwater conditions
- Thermal Response Test (TRT) results at the actual site
- Contractor, region, and permitting complexity

For a real installation, consult a licensed geothermal contractor and complete a TRT before drilling. The tool and author make no warranty as to fitness for any specific application.

This disclaimer is also embedded in every generated PDF report.

## Deploy

1. Push to GitHub
2. Import the repo on [vercel.com/new](https://vercel.com/new)
3. Add `GEMINI_API_KEY` as an environment variable in the Vercel project settings
4. Every push to `main` auto-deploys

## AI coding assistance disclosure

The interactive map, form logic, cost-calculation backend, time-horizon comparison logic, PDF generation pipeline, styling, and the explainer sections were developed with [Claude](https://claude.ai) (Anthropic) as a coding partner. The thesis data (the 4 JSON files), the underlying BHE physics, and the per-pixel computation are the author's original work, exported from the analysis notebook in the [thesis repo](https://github.com/VaibhavJ97/kit-master-thesis-portfolio). Google Gemini powers the live site interpretations.

## Author

**Vaibhav Jaiswal**
M.Sc. Applied Geosciences, Karlsruhe Institute of Technology, 2026

- Email: vaibhavjaiswal1234@gmail.com
- LinkedIn: [linkedin.com/in/vaibhavgeo](https://www.linkedin.com/in/vaibhavgeo/)
- GitHub: [@VaibhavJ97](https://github.com/VaibhavJ97)
- Portfolio: [vaibhavj97.vercel.app](https://vaibhavj97.vercel.app)

## License

Code released under the MIT License. The thesis data (`data/*.json`) is research output from my Master's thesis; please credit the thesis if you reuse the data:

> Jaiswal, V. (2026). *Impact of Climate Change on the Geothermal Potential of Closed Systems Using GIS and Python.* M.Sc. Thesis, Karlsruhe Institute of Technology.
