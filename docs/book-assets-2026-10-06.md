# Book image assets — 2026-10-06

Generated with the built-in image_gen tool. These are the native generated PNGs, copied into the project without resizing or recompression. The tool returned smaller dimensions than the requested approximate book/desk sizes and a larger paper tile than the requested 1024 square. Dimensions below are actual, not requested.

| Asset | Public URL | Actual size | Background |
| --- | --- | --- | --- |
| paper-v2.png | /img/book/paper-v2.png | 1254 × 1254 | Opaque |
| open-book.png | /img/book/open-book.png | 1586 × 992 | Transparent alpha |
| cover.png | /img/book/cover.png | 1086 × 1448 | Transparent alpha |
| desk.png | /img/book/desk.png | 1586 × 992 | Opaque |

The open book and closed cover have genuine alpha transparency (top-left pixel alpha 0, 32-bit ARGB). All four images were visually checked for text: none is present. The open book has two blank pages; the forest-green cloth cover has a thin gold frame and a blank center. Book and desk prompts share upper-left warm lighting; paper is evenly lit for repetition.

Paper was requested as a seamless tile and refined once to improve the join. Use paper-v2.png; paper.png is the initial draft. Mean RGB differences across opposite edges decreased from 4.37/255 to 3.93/255 vertically and from 5.79/255 to 4.80/255 horizontally. This is a low-contrast texture, but the generated opposite edges are not pixel-identical; inspect CSS repeat at the intended scale before treating it as a certified seamless production tile.

Website typography, text alignment, night-reading treatment, and asset integration are subsequent work. No consuming components were changed.

## Final generation prompts

### paper-v2.png

Transparent background requested: false

Use case: product-mockup. Asset type: seamless paper texture tile for a Chinese literary reading website. Generate one 1024x1024 PNG image of ivory handmade xuan paper, soft cream color near #eee6d8, very fine subtle natural paper fibers, low contrast, clean and elegant. Entire frame is paper surface, straight-on orthographic macro photograph. Truly seamless repeatable tile: opposite edges match perfectly without borders or gradients, evenly distributed random microtexture with no recognizable large repeated features. Flat uniform diffuse illumination with warm neutral balance; no directional shadows, no folds, no wrinkles, no stains, no vignette. No text, no lettering, no characters, no symbols, no watermark, no objects. Keep the surface quiet enough for small dark Chinese web text overlaid later. Output only the paper tile.

Refinement prompt (applied to paper.png):

Use case: precise-object-edit. Edit target: the attached ivory xuan paper texture. Change only its seamless tiling edge continuity, preserving the same quiet fine fibers, ivory cream palette near #eee6d8, uniform flat illumination and no text. Deliver ONE square 1024x1024 PNG production texture. It must repeat seamlessly in both X and Y, with no visible vertical or horizontal lines when tiled. Important: construct a periodic texture, matching the entire left border to the right border and the entire top border to the bottom border; fine fibers and lighting must wrap continuously. No broad repeating clouds, no gradients, no vignette, no shadows, no border, no folds, no stains, no typography, no objects. Keep the existing center appearance and low contrast. Return only the corrected single seamless tile.

### open-book.png

Transparent background requested: true

Use case: product-mockup. Asset type: blank open-book cutout for live HTML text overlay in a literary reading website. Generate one photorealistic landscape PNG, approximately 2400x1500, aspect ratio 8:5. One open premium hardcover book viewed EXACTLY from directly overhead, centered and symmetrical, spine vertical in center, horizontal page spread, no camera tilt, no rotation, no skew. Two fully blank ivory paper pages near #eee6d8 with subtle handmade fine paper fibers. Broad nearly flat rectangular text-safe inner surfaces on each page. Realistic gentle curved gutter and soft narrow shadow at binding; visible layered paper stacks at outer and bottom edges, thin dark forest-green cloth cover beneath near #16251f. Warm soft light from upper left, restrained photographic detail and muted gold-cream highlights. Book fills about 90% of image width and 84% height, fully visible with breathing room on all four edges. Background genuinely transparent alpha, clean isolated edges, no table or solid background. No text anywhere: no Chinese characters, no Latin letters, no numerals, no fake glyphs, no lines on pages, no illustrations, no watermark, no labels, no hands, no accessories. The finished asset must work as a straight overhead book base with HTML text laid onto each page.

### cover.png

Transparent background requested: true

Use case: product-mockup. Asset type: blank closed hardcover book front-cover cutout for HTML book title overlay and a digital bookshelf. Generate one photorealistic portrait PNG, approximately 1200x1600, aspect ratio 3:4. One closed premium hardcover book, exactly straight-on overhead front cover view, rectangular cover vertical, no rotation, no camera tilt or perspective skew. Deep dark forest green woven linen cloth cover near #16251f, refined small visible fabric weave, one delicate thin rectangular hot-stamped muted gold border near #c9ad74, generous empty center for later web typography. Subtle hardcover thickness and spine hinge visible along left edge, minute ivory paper edges visible along right and bottom. Warm soft light from upper left consistent with ivory open-book photography, restrained matte highlights. Centered fully visible book, fills about 86% width and 90% height. Background genuinely transparent alpha; clean isolated edges, no table, no solid background. No lettering whatsoever, no title, no author, no logo, no monograms, no Chinese or Latin characters, no numerals, no fake glyphs, no decorative text, no watermark. Only cloth and the fine gold rectangular frame.

### desk.png

Transparent background requested: false

Use case: photorealistic-natural. Asset type: subdued background scene behind an open-book reading interface. Generate one landscape photographic image approximately 2400x1500, aspect ratio 8:5, of a quiet wooden writing desk at night viewed from directly overhead so an overhead open-book cutout can be composited naturally. Warm light from upper left with a barely visible blurred lamp at extreme upper-left margin. Dark walnut wood surface, restrained warm brown near #aa6f38 fading into ink-black green near #101310 at edges, gentle photographic defocus and atmospheric soft focus. Keep the central 80% of the desk completely empty, unobstructed, and softly evenly lit for a large book placed later. Sparse peripheral hints only, no clutter. Elegant calm Chinese literary website mood, palette ivory, ink, dark forest green, muted gold, no saturated orange. No book in this image, no paper sheets, no writing, no lettering, no characters, no numerals, no fake glyphs, no logos, no watermark, no person, no hands. Output only the desk scene.


