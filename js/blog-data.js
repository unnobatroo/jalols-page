/* ============================================================
   blog-data.js
   Add or edit your blog posts here.

   Fields:
     slug    — matches the filename under /blog/
     title   — Post title
     excerpt — ~20-word teaser shown on the feed card
     date    — ISO date string
     tags    — Array of tag strings
   ============================================================ */

window.POSTS = [
  {
    slug:    "edge-inference-power-budget",
    title:   "Fitting Neural Nets Inside a Coin-Cell Power Budget",
    excerpt: "How I used quantisation-aware training and MCUNet to push inference to 32 μW — and what I got wrong the first three times.",
    date:    "2025-03-11",
    tags:    ["edge-ai", "embedded", "power"],
  },
  {
    slug:    "cop29-technical-annex",
    title:   "What the COP29 Technical Annex Actually Says About Grid Storage",
    excerpt: "A close reading of Annex III — the parts that got buried under the headlines, and why they matter for deployed systems.",
    date:    "2024-12-02",
    tags:    ["climate", "policy"],
  },
  {
    slug:    "risc-v-softcore-fpga",
    title:   "Building a Minimal RISC-V Softcore for Inference",
    excerpt: "Synthesising a hand-rolled RV32IM on a $4 iCE40 and getting a CNN to run on it. Spoiler: the toolchain is the hard part.",
    date:    "2024-07-28",
    tags:    ["embedded", "fpga", "risc-v"],
  },
];
