# Peel — sticky notes store

An 11-page sticky-notes shop built with plain HTML, CSS and vanilla JavaScript. No frameworks, no build step.

## Run it

Open the folder with any simple local server, then visit `index.html`:

    cd sticky-notes-store
    python3 -m http.server 8000      # then open http://localhost:8000

(VS Code "Live Server" works too.)

## Where to edit what

**All text and all image paths are in the `.html` files. The `.js` files contain behaviour only.**

| To change | Edit |
|---|---|
| A product's name, price, badge, photo on cards | its `<article class="card">` in `shop.html`, `index.html` and the "You may also like" list in `product.html` |
| A product's description, colours, sizes, details | its `<article class="pdp">` in `product.html` |
| Header, announcement bar, categories dropdown, footer, cart/wishlist drawers, search, toast messages | the same block repeated in every page (find and replace across files) |
| Form error messages | the `<p class="field-error">` under each field |
| Free-shipping threshold, shipping fee, order number prefix | `data-` attributes on `<body>` |
| Promo code and percentage | `data-code` / `data-percent` on the promo form in `cart.html` |
| Delivery prices and timings | `data-fee` / `data-days` on the delivery options in `checkout.html` |
| Colours, fonts, spacing | CSS variables at the top of `css/style.css` |

Each product card and product section carries `data-` attributes (`data-id`, `data-name`, `data-price`, `data-image`, `data-collection`, `data-colors`, `data-sizes`, `data-shape`, `data-stock`, ...). JavaScript reads these for the cart, filters and sorting, so when you change a visible name or price, change the matching attribute on the same element too.

Shop links can pre-filter the grid: `shop.html?collection=Pastel`, `?size=Mini`, `?shape=Flag`, `?max=200`, `?q=grid`, `?sort=newest`.

To add a product: copy a card in `shop.html`, copy a `<article class="pdp">` in `product.html`, give both the same new `data-id`, and add its photos.

## Images

Every image is a local file inside `images/` and every path is written in the HTML.

**These are 3D-rendered product images made for this build, not photographs of real stock.** The build environment could not download photos, so each pad, set and desk scene was modelled and rendered (see `images/ABOUT-THESE-IMAGES.md` for the full list). To use your own photography, save a JPG over the same file name, or change the `src` in the HTML. If an image file is ever missing, its frame shows the path it expects.

## Hero banner (home page)

The hero is the `<section class="hero hero--fx">` block near the top of `index.html`; its styles are the last block in `css/style.css` ("HERO (Framer / Webflow style)").

- **Headline:** `data-split="chars"` makes every letter rise in on its own. The small picture inside the line is `<span class="fx-media">`; the rotating last word is the `data-swap` group (one `<span>` per word).
- **Layout:** on desktops and laptops the hero fits one screen, with the text in `.fx-copy` on the left and the picture in `.fx-stage` on the right. On tablets and phones the picture drops below the text.
- **Stage:** the big picture (`.fx-screen`) starts slightly turned and straightens after a short scroll; a colour glow (`.fx-halo`) turns slowly behind it. Everything with class `fx-float` around it floats and follows the pointer; delete any of them to simplify.
- **Product card:** the floating card is a real product (`data-product` attributes); its + button adds to the cart. Change the attributes and the visible text together.
- **Background:** inside `.fx-bg`, the three `<i>` elements are the drifting colour glows, `.fx-grid-lines` is the grid that slides diagonally and brightens near the pointer, and each `<span>` is one small note that floats upward. Delete some `<span>`s for a calmer background.

## Animation

All motion lives in `css/animations.css` and `js/animations.js`:

| Effect | How to use it in the HTML |
|---|---|
| Entrance on scroll (each section uses a different one) | `data-reveal` with one of: `up` (default), `left`, `right`, `zoom`, `rotate`, `clip`, `wipe`, `wipe-r`, `iris`, `flip`, `swing`, `peelin`, `blur`, `skew`, `pop`, `grow`, `note` |
| Reveal children one after another | add `data-stagger` to the parent |
| Word-by-word heading animation | add `data-split` to the heading |
| Sticky note that drops and settles | `class="note" data-reveal` |
| Floating, fluttering note | add class `float` |
| Peeling corner on hover | add class `peel` |
| Card that leans toward the pointer | add `data-tilt` |
| Carousel | wrap in `data-carousel`, with `data-track`, `data-prev`, `data-next`; add `data-autoplay="4800"` to auto-advance |
| Image that drifts while scrolling | `data-parallax="-40"` on the `<img>` |
| Swapping headline word | `data-swap` on a wrapper holding one `<span>` per word |
| Clothesline ticker | `data-line-ticker`; edit the words in the first `.line-ticker__group` (the two copies after it make the loop seamless, so keep all three the same) |
| Floating background objects | the `<div class="bg-notes">` near the top of each page (8 on the home page, 4 on inner pages); delete a `<span>` to remove one |
| Gentle floating on any element | add `data-float` (or `data-float="2"`, `"3"` for different rhythms) |
| Copy-a-code button | `data-copy="STICKY10"` |
| Back to top | the `<button class="totop">` near the end of each page |

The menu bar stays fixed at the top on every page and slims down after scrolling. Page changes are covered by a sticky-note "veil" (`<div class="veil">` at the top of each page). 

**If you see no animation:** check your device setting. On Windows it is Settings > Accessibility > Visual effects > Animation effects; on macOS, Accessibility > Display > Reduce motion. With that setting on, the site still plays its gentle motion (fades, floating notes, the ticker, text animation) and only drops the parallax, card tilt and page wipe. Visitors can also stop everything with the "Pause animations" button in the footer.

## Files

    index.html  shop.html  product.html  wishlist.html  cart.html
    checkout.html  signin.html  signup.html  account.html  order-success.html  journal.html
    css/   style.css (tokens, layout, home)  components.css  animations.css  responsive.css
    js/    main.js (shared helpers, panels, menu, validation)   animations.js   cart.js   wishlist.js
           products.js (filters, sorting, product page)   auth.js   checkout.js
    fonts/ Bricolage Grotesque, DM Sans, Caveat (bundled, SIL Open Font License)
    images/

`js/products.js` holds filtering, sorting and product-page behaviour. It contains no product data: products live in the HTML.

## Demo limits (read before going live)

- **Payments are simulated.** No gateway is connected; card details are validated and discarded.
- **Accounts are a browser demo.** Users, passwords, orders, cart and wishlist are stored unencrypted in `localStorage` (`sticky_cart`, `sticky_wishlist`, `sticky_user`, `sticky_users`, `sticky_orders`). A real store needs a server.
- **Reviews, ratings and review counts are sample content.** They are marked `SAMPLE REVIEWS` in the HTML. Replace them with real customer reviews before launch.
- "Peel" is a made-up brand name. The phone number, email address, social links and policy links in the footer are placeholders.
- Journal articles are short original pieces written for the demo.
