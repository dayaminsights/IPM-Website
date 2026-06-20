# QA Report — Production Readiness

_Generated 2026-06-20T12:38:25.891Z._

## Checks

| | Check | Detail |
| --- | --- | --- |
| ✅ | Source rows == variants (924) | 924 variants |
| ✅ | Collections == 12 | 12 |
| ✅ | All product pages exist | 358 present, 0 missing |
| ✅ | All referenced images resolve | 1790 checked, 0 missing |
| ✅ | Multi-variant products render finish picker | 66 ok, 0 missing |
| ✅ | Categories are the 3 expected | Faucets, Kitchen Mixers, Shower |
| ✅ | Opell Prima single collection w/ multi-finish | 13 finishes |
| ✅ | Zenith single collection w/ multi-finish | 5 finishes |
| ✅ | Search index exists & matches product count | 358 items |
| ✅ | Generated nav includes Search link |  |
| ✅ | No legacy refs in core HTML |  |
| ✅ | No legacy scripts remain |  |
| ✅ | Old workbook removed |  |
| ✅ | Scrape output removed |  |

## Catalog at a glance

| Metric | Value |
| --- | --- |
| Products | 358 |
| Variants (SKUs) | 924 |
| Collections | 12 |
| Categories | Faucets, Kitchen Mixers, Shower |
| Product pages verified | 358 |
| Images checked | 1790 |
| Products with real photography | 230 (64%) |

## Collections

| Collection | Products | Finishes | Signature |
| --- | --- | --- | --- |
| Allied | 77 | 13 |  |
| Opell Prima | 34 | 13 | yes |
| Flora | 33 | 1 |  |
| Fuzone | 33 | 1 |  |
| Aliva | 32 | 1 | yes |
| Pebble | 31 | 1 |  |
| Para | 25 | 1 |  |
| Neo | 22 | 3 |  |
| Cube Prima | 19 | 1 |  |
| Zenith | 18 | 5 |  |
| JP | 17 | 1 |  |
| Premium | 17 | 1 |  |

> Image coverage below 100% is expected: many catalogued SKUs (exposed/concealed parts,
> size variants, Chrome-only accessories) have no dedicated photography in the client set.
> Those products fall back to category imagery — see `asset-audit.md` for the full gap list.
