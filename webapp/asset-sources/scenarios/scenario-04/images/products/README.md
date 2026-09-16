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
(1:1)**, because `apps/blackpi/data/assetMap.js` promises squareness so
consumers can use `object-fit: cover` without cropping the product out of
frame. Squareness is the hard requirement. The pixel count is not.

**Aim for 2048×2048 on new material.** It is the most a master can give back
when a derived file has to be rebuilt, and it is what most of this folder's
shipped counterparts are. But it is a recommendation for material still to be
commissioned, not a gate on material already shot: nothing validates the
number, and a master that arrives smaller is taken at its native size rather
than upscaled to meet it. Resampling a delivered photo to a rounder number
costs detail and buys nothing. Four sizes are in the table today - 1024, 1254,
1536 and 2048 - and `assetMap.js` records each photo's real one in `photo()`'s
third argument.

Keep marketing copy **out of the picture**. The app ships zh, en and jp, and
text burned into a photo cannot be translated - an en player would read
Chinese off the product image. The selling copy belongs in
`apps/blackpi/data/catalog.js` and its i18n, where all three languages get
it. A wide shot that splits its subject and its caption across a 3:2 frame
also cannot survive a square crop: a first VEXA set was rejected for exactly
this, because no 1:1 window held both the camera module and the caption
beside it.

What that rules out is *copy* - a caption, a spec list, a marketing banner
composed into the frame. It does not rule out **text that is part of the scene
being photographed**: a manual lying in an opened box, a phone's own home
screen, a label on the thing itself. That text is the subject, not the app
talking to the player, so an en player reads it as an object in the photo
rather than as untranslated UI. `vexa-flex-x1-actual-unboxing` is the case in
point - the manual and the two home screens in frame are what arrived in the
parcel - and it is kept exactly as shot.

## Deriving the shipped WebP

```sh
cwebp -q 90 -m 6 -sharp_yuv -metadata none <basename>.png \
  -o ../../../../../public/assets/scenarios/scenario-04/images/products/<basename>.webp
```

`-q 90` is the baseline. Both VEXA sets were derived a notch above it, at
`-q 95 -m 6 -sharp_yuv -pass 10 -af -metadata none`, which lands them at
49-51 dB PSNR; re-deriving those eight files with the baseline command will
not reproduce the shipped bytes. Either is fine for new material - match the
sibling photos of whatever product you are adding.

A derived file is not finished until `apps/blackpi/data/assetMap.js` names it:
RULE 1 fails any shipping binary no registry resolves. New Chinese labels added
to that table also need `apps/blackpi/i18n/{en,jp}.js` entries, or
`validate:i18n` fails.

## Delivered: VEXA FLEX X1 (Route B product replacement)

**All eight masters are in and derived. Nothing here is pending.**

### Claim side - what the product page sells

| Basename | Shot | Master |
| --- | --- | --- |
| `vexa-flex-x1-main` | Full product hero | 1536×1536 |
| `vexa-flex-x1-camera` | Triple-camera detail | 1536×1536 |
| `vexa-flex-x1-display` | Unfolded borderless display detail | 1536×1536 |
| `vexa-flex-x1-connectivity` | Fully folded — bottom USB-C, speaker grille, double-layer body | 1536×1536 |

### Actual side - what the parcel contains

Two cheap phones joined by a door hinge and sold as one foldable.

| Basename | Shot | Master |
| --- | --- | --- |
| `vexa-flex-x1-actual-unboxing` | Opening the box on what actually arrived | 1254×1254 |
| `vexa-flex-x1-actual-main` | Full front of the two-phone splice | 1254×1254 |
| `vexa-flex-x1-actual-hinge` | Centre hinge defect, close up | 1254×1254 |
| `vexa-flex-x1-actual-folded` | Folded, rear — two Micro USB ports | 1254×1254 |

**This set is 1254×1254** - under the 2048×2048 recommended above, and under
the claim set's 1536×1536. That is accepted, not an oversight: they are
square, which is the part `assetMap.js` actually promises its consumers, and
they were taken at their delivered size rather than resampled to hit a
recommendation aimed at material still to be shot. Their `assetMap.js` entries
record `'1254×1254'`, their true intrinsic size.

All eight are registered in `apps/blackpi/data/assetMap.js`, with en/jp
captions in `apps/blackpi/i18n/{en,jp}.js`, and all eight are now on screen:
`catalog.js` sells the VEXA FLEX X1 on Route B, the four claim shots are its
PDP carousel / storefront card / order thumbnail, and
`pages/scenario04/Unboxing.jsx` shows `-actual-unboxing` as the parcel that
arrived and then all four as the photos the player keeps - which is what the
return request attaches.

The 12 `luckybag-*` photos Route B used to sell were deleted in that same
swap. They never had masters in this folder - only the shipped WebP existed -
so nothing here went with them.

A master whose derived asset was deleted should be deleted too.
