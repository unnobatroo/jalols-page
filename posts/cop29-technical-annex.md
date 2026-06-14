---
title: What the COP29 Technical Annex Actually Says About Grid Storage
date: 2024-12-02
tags: [climate, policy]
excerpt: A close reading of Annex III — the parts that got buried under the headlines, and why they matter for deployed systems.
type: post
---

Baku produced a lot of noise and one document that most negotiators never read end-to-end: the *Technical Annex on Flexible Grid Resources and Long-Duration Storage*, appended to the Global Stocktake outcome. Here is a close read of the provisions that matter for engineers and project developers, stripped of the usual COP abstraction.

## Why this annex exists

The 1.5 °C pathway modelled by the IPCC requires roughly 1 500 GW of new storage by 2035. The problem is definitional: prior COPs treated "storage" as a single bucket, letting countries count pumped hydro commissioned in 1973 toward 2030 targets. The annex fixes this by introducing three tiers:

- **Tier 1 — short-duration (≤ 4 h):** lithium-ion, lead-acid, supercapacitors. Grid-frequency services and renewable firming.
- **Tier 2 — medium-duration (4–24 h):** flow batteries, compressed air, sodium-ion. Diurnal balancing.
- **Tier 3 — long-duration (≥ 24 h):** green hydrogen, iron-air batteries, gravity storage. Seasonal firming. This is the tier that actually unlocks high-VRE grids above 80% penetration.

**Key provision (§4.2.1):** NDC updates due in 2025 must separately report Tier 2 and Tier 3 capacity in GWh, not aggregate with Tier 1. Countries that do not disaggregate will be flagged in the 2026 Global Stocktake.

## The measurement problem the annex does not solve

The annex mandates disaggregated reporting but stays silent on *how* to measure Tier 3 capacity. For green hydrogen this is particularly awkward: the energy stored is in the hydrogen, but the useful electricity recovered depends on round-trip efficiency — which varies 40–65% depending on whether you use a fuel cell or a gas turbine on the discharge side. §4.3.7 defers this to a "methodology note" to be published by IRENA in Q2 2025. That note does not yet exist as of this writing.

The practical consequence: any Tier 3 project commissioned before that methodology lands is reporting to an undefined standard. If you are advising a developer, build in a conservative 50% round-trip assumption for now — it is defensible to any subsequent auditor.

## What changed for project finance

The annex introduces a voluntary "Article 6.4 Storage Credit" mechanism. Long-duration projects that meet the Tier 3 threshold and demonstrate additionality (i.e., they enable renewable capacity that would otherwise be curtailed) can issue credits tradeable under the Paris Agreement carbon market. The credit value is denominated in *tonne-CO₂-equivalent displaced*, calculated against a country-specific baseline grid emission factor.

This sounds clean but has a gotcha: the baseline must be the *marginal* emission factor, not the average. For most developing grids with significant coal peaking, the marginal factor is 2–3× the average. Projects that use the average factor will have their credits reviewed downward at issuance.

## The firmware angle

One paragraph buried in §5.1 caught my eye as someone who writes embedded control software. It requires that grid-connected storage assets above 1 MWh submit "interoperability attestations" proving the battery management system can respond to ISO/IEC 61850-7-420 commands for remote dispatch. For most utility-scale systems this is already handled at the inverter level. But for aggregated distributed storage — think behind-the-meter residential batteries pooled into a virtual power plant — the firmware stack needs to implement the full XMPP-based messaging layer, not just a vendor API wrapper.

IEC 61850-7-420 defines the logical node `ZBAT` for battery energy storage. If your VPP firmware speaks only REST or MQTT, you will need a protocol translation layer before the 2027 compliance deadline in the annex.

## Bottom line

The COP29 Technical Annex is more technically specific than anything that has come out of a COP negotiating room before. The tier taxonomy is sensible. The Article 6.4 Storage Credit mechanism is promising but half-finished — the IRENA methodology gap is real and will create a messy 12–18 months of inconsistent project reporting. The IEC 61850 mandate is quietly important for anyone building distributed storage control systems.

Full annex text: [UNFCCC document portal](https://unfccc.int) (search "COP29 Technical Annex Flexible Grid Resources").
