# Streamly Sim website — deploy guide

```
/               landing page (index.html)
/play/          the game
/privacy        privacy policy (needed for AdSense)
ads.txt, robots.txt, sitemap.xml, og.png, vercel.json
```

## 1. Put it on GitHub
1. Create a new repo, e.g. `streamly-sim-site`.
2. Upload everything in this folder (keep the `play/` folder). From a phone: GitHub web → Add file → Upload files.

## 2. Deploy on Vercel
1. vercel.com → Add New → Project → import the repo.
2. Framework preset: **Other**. Leave build command and output directory empty.
3. Deploy. You get `something.vercel.app` — the game is at `/play/`.

## 3. Custom domain (required for AdSense)
AdSense won't approve a *.vercel.app address.
1. Buy a domain (Vercel Domains, Namecheap, Cloudflare…).
2. Vercel → Project → Settings → Domains → add it and follow the DNS steps.
3. Replace `YOUR-DOMAIN.com` in `index.html` (canonical), `robots.txt` and `sitemap.xml`.
4. Replace `YOUR-EMAIL@example.com` in `privacy.html`.

## 4. AdSense
1. Sign up at adsense.google.com with the custom domain.
2. Paste the verification snippet AdSense gives you into the `<head>` of `index.html` (spot marked ADSENSE SITE VERIFICATION).
3. Put the ads.txt line AdSense gives you into `ads.txt` (remove the `#`). Redeploy.
4. In AdSense → Privacy & messaging, turn on the consent message for EEA/UK/Switzerland visitors.
5. Once the site is approved, apply for H5 Games Ads.

## 5. Switch the game to real ads (after H5 Games Ads approval)
In `play/index.html`, uncomment "REAL ADS, option A", put in your `ca-pub-` ID, test with `data-adbreak-test="on"`, then remove that attribute to go live. The reward buttons already call it.
