# scenario04 product masters

Drop the **original, unconverted** product photography for scenario04's
BlackPi storefront here. Nothing in this folder is served or bundled —
`asset-sources/` sits outside `public/` and `src/`, and
`scripts/validate-asset-ownership.mjs` RULE 6 fails the build if anything that
ships reaches in.

The path mirrors the shipped location, per
[`asset-sources/README.md`](../../../../README.md):

| Master (here) | Derived into |
| --- | --- |
| `<basename>.png` / `.jpg` | `public/assets/scenarios/scenario-04/images/products/<basename>.webp` |

Flat, no per-product subfolder — the shipped folder is flat too, and the
basename already carries the product.

## Accepted input formats

`.png`, `.jpg` / `.jpeg`, `.tif` / `.tiff`. No conversion needed before
dropping a file in — `cwebp` reads all of them. Keep the master at the highest
quality available; it is the thing re-derivation goes back to.

Every shipped product photo in this folder's shipped counterpart is **square
(1:1)**, at 2048×2048 or 1024×1024, because `apps/blackpi/data/assetMap.js`
promises squareness so consumers can use `object-fit: cover` without cropping
the product out of frame. Square masters of at least 2048×2048 keep that true.

## Deriving the shipped WebP

```sh
cwebp -q 90 -m 6 -sharp_yuv -metadata none <basename>.png \
  -o ../../../../../public/assets/scenarios/scenario-04/images/products/<basename>.webp
```

A derived file is not finished until `apps/blackpi/data/assetMap.js` names it:
RULE 1 fails any shipping binary no registry resolves. New Chinese labels added
to that table also need `apps/blackpi/i18n/{en,jp}.js` entries, or
`validate:i18n` fails.

## VEXA FLEX X1 (Route B product replacement)

Four masters, delivered as 1536×1024 PNG (8-bit RGB, no alpha) and derived
with:

```sh
cwebp -q 95 -m 6 -sharp_yuv -pass 10 -af -metadata none
```

49.6-50.6 dB PSNR. `-q 95` rather than the 90 above because two of the four
carry marketing copy, and text is the first thing a lower quality factor
gives up.

| Basename | Shot |
| --- | --- |
| `vexa-flex-x1-main` | Full product hero |
| `vexa-flex-x1-camera` | Triple-camera detail |
| `vexa-flex-x1-display` | Unfolded borderless display detail |
| `vexa-flex-x1-connectivity` | Fully folded - bottom USB-C, speaker grille, double-layer body |

**These four are 3:2 landscape, not square.** They are the only product
photos in the shipped folder that are not 1:1, so the squareness
`apps/blackpi/data/assetMap.js` promises its consumers does not hold for
them. Whoever adds them to that table has to decide what `object-fit: cover`
should crop from a 3:2 source, or re-cut the masters square - the promise in
that table's comment is currently false for these four.
