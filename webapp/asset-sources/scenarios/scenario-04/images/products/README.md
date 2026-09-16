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

Keep marketing copy **out of the picture**. The app ships zh, en and jp, and
text burned into a photo cannot be translated - an en player would read
Chinese off the product image. Every one of the 26 product photos already in
the shipped folder is text-free for that reason; the selling copy belongs in
`apps/blackpi/data/catalog.js` and its i18n, where all three languages get
it. A wide shot that splits its subject and its caption across a 3:2 frame
also cannot survive a square crop: a first VEXA set was rejected for exactly
this, because no 1:1 window held both the camera module and the caption
beside it.

## Deriving the shipped WebP

```sh
cwebp -q 90 -m 6 -sharp_yuv -metadata none <basename>.png \
  -o ../../../../../public/assets/scenarios/scenario-04/images/products/<basename>.webp
```

A derived file is not finished until `apps/blackpi/data/assetMap.js` names it:
RULE 1 fails any shipping binary no registry resolves. New Chinese labels added
to that table also need `apps/blackpi/i18n/{en,jp}.js` entries, or
`validate:i18n` fails.

## Pending: VEXA FLEX X1 (Route B product replacement)

Four masters, not yet delivered:

| Basename | Shot |
| --- | --- |
| `vexa-flex-x1-main` | Full product hero |
| `vexa-flex-x1-camera` | Triple-camera detail |
| `vexa-flex-x1-display` | Unfolded borderless display detail |
| `vexa-flex-x1-connectivity` | Fully folded — bottom USB-C, speaker grille, double-layer body |

Delete this section once they land and are derived; a master whose derived
asset was deleted should be deleted too.
