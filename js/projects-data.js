/* ============================================================
   projects-data.js  — edit this to manage your projects

   Fields:
     slug     — matches filename under /projects/
     title    — card headline
     desc     — one-sentence description
     thumb    — image path relative to root (or "" for placeholder)
     thumbAlt — alt text
     date     — "YYYY-MM-DD"
     status   — short status string e.g. "deployed Nov 2024", "in development"
     cats     — array of category strings
     featured — true = sorted first
     links    — external links only (github, paper, demo…)
                title/thumbnail already link to the project page
   ============================================================ */

window.PROJECTS = [
  {
    slug: "tinyml-wildfire",
    title: "TinyML Wildfire Sensor",
    desc: "On-device smoke & thermal anomaly detection at 40 μW on a Cortex-M4. Deployed in Ventura County, CA.",
    thumb: "",
    thumbAlt: "Wildfire sensor node PCB",
    date: "2024-11-03",
    status: "deployed · 4 nodes live",
    cats: ["edge-ai", "climate", "embedded"],
    featured: true,
    links: [
      { label: "github", url: "https://github.com/YOUR_GITHUB/wildfire-sensor" },
    ],
  },
  {
    slug: "coral-reef-acoustics",
    title: "Coral Reef Acoustic Monitor",
    desc: "LSTM inference on a custom RISC-V softcore classifying reef health from hydrophone data in real time.",
    thumb: "",
    thumbAlt: "Hydrophone deployment rig",
    date: "2024-06-14",
    status: "field trial · Philippines",
    cats: ["edge-ai", "climate", "audio"],
    featured: false,
    links: [
    ],
  },
  {
    slug: "iea-policy-model",
    title: "IEA Grid Transition Model",
    desc: "Python + C extension modelling storage dispatch under NERC reliability constraints for the COP29 working group.",
    thumb: "",
    thumbAlt: "Grid model output chart",
    date: "2023-11-20",
    status: "published · COP29 annex",
    cats: ["climate", "policy", "python"],
    featured: false,
    links: [
      { label: "paper", url: "#" },
    ],
  },
];
