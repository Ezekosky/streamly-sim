/* =========================================================================
   STREAMLY SIM — ANDROID BUILD HELPER
   Run by GitHub Actions (.github/workflows/android.yml). You don't need to
   run it yourself.

     node build.mjs web       copy the game from ../play into www/, make it
                              work offline, write capacitor.config.json and
                              the icon/splash source images
     node build.mjs android   patch the generated android/ project:
                              landscape lock, AdMob app ID, version, signing

   Settings live in streamly.config.json (app ID, version, AdMob IDs).
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAY = path.resolve(HERE, '..', 'play');
const WWW = path.join(HERE, 'www');
const ANDROID = path.join(HERE, 'android');
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, 'streamly.config.json'), 'utf8'));
const mode = process.argv[2] || 'web';

function must(cond, msg){ if (!cond){ console.error('build.mjs: ' + msg); process.exit(1); } }
function replaceOnce(text, find, repl, label){
  must(typeof find === 'string' ? text.includes(find) : find.test(text), `could not find ${label}`);
  return text.replace(find, repl);
}

/* ---------------------------------------------------------------- web */
async function buildWeb(){
  must(fs.existsSync(path.join(PLAY, 'index.html')), 'play/index.html not found next to the app folder');
  fs.rmSync(WWW, { recursive: true, force: true });
  fs.mkdirSync(path.join(WWW, 'fonts'), { recursive: true });

  // 1. the game files
  const skip = new Set(['README.md', '.keep', 'manifest.webmanifest']);
  for (const f of fs.readdirSync(PLAY)){
    const src = path.join(PLAY, f);
    if (skip.has(f) || fs.statSync(src).isDirectory()) continue;
    fs.copyFileSync(src, path.join(WWW, f));
  }

  // 2. Capacitor's JS runtime (lets the game talk to the app: ads, back button)
  fs.copyFileSync(path.join(HERE, 'node_modules/@capacitor/core/dist/capacitor.js'), path.join(WWW, 'capacitor.js'));

  // 3. Inter, bundled so the app looks right with no internet
  const fontDir = path.join(HERE, 'node_modules/@fontsource/inter/files');
  const ranges = {
    latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  };
  let fontCss = '';
  for (const subset of ['latin-ext', 'latin']) for (const w of [400, 500, 600, 700]){
    const file = `inter-${subset}-${w}-normal.woff2`;
    fs.copyFileSync(path.join(fontDir, file), path.join(WWW, 'fonts', file));
    fontCss += `@font-face{font-family:"Inter";font-style:normal;font-display:swap;font-weight:${w};src:url("${file}") format("woff2");unicode-range:${ranges[subset]};}\n`;
  }
  fs.writeFileSync(path.join(WWW, 'fonts', 'inter.css'), fontCss);

  // 4. index.html: app-only adjustments
  let html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
  html = html.replace(/<base href="[^"]*">\s*\n?/, '');
  html = html.replace(/<link rel="manifest"[^>]*>\s*\n?/, '');
  html = html.replace(/<link rel="preconnect"[^>]*>\s*\n?/g, '');
  html = replaceOnce(html, /<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/inter.css">', 'the Google Fonts link');
  html = html.replace(/href="\/privacy"/g, `href="${cfg.privacyPolicyUrl}"`);
  const appSettings = {
    platform: 'android',
    version: cfg.versionName,
    testAds: cfg.admob.testAds !== false,
    rewardedAdId: cfg.admob.rewardedAdId,
  };
  html = replaceOnce(html, '<script src="thumbs.js"></script>',
    `<script src="capacitor.js"></script>\n  <script>window.STREAMLY_APP = ${JSON.stringify(appSettings)};</script>\n  <script src="thumbs.js"></script>`,
    'the thumbs.js script tag');
  must(html.includes('<script src="native.js"></script>'), 'play/index.html must load native.js (upload the v0.9.2 game files)');
  fs.writeFileSync(path.join(WWW, 'index.html'), html);

  // 5. Capacitor config
  const capConfig = {
    appId: cfg.appId,
    appName: cfg.appName,
    webDir: 'www',
    backgroundColor: cfg.backgroundColor,
    android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: false },
    plugins: {
      SystemBars: { insetsHandling: 'css', hidden: true, style: 'DARK', initialViewportFitValueHint: 'cover' },
    },
  };
  fs.writeFileSync(path.join(HERE, 'capacitor.config.json'), JSON.stringify(capConfig, null, 2));

  // 6. icon + splash source images (Capacitor Assets turns these into every Android size)
  const sharp = (await import('sharp')).default;
  const assets = path.join(HERE, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  const grad = `<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6aa8ff"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient>`;
  const glyph = `<g fill="#fff" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"><polygon points="22.00,17.00 29.27,21.04 29.27,42.96 22.00,47.00"/><polygon points="31.87,22.48 39.13,26.52 39.13,37.48 31.87,41.52"/><polygon points="41.73,27.96 49.00,32.00 41.73,36.04"/></g>`;
  // glyph box in the 64-unit logo: x 22..49, y 17..47, centre (35.5, 32)
  const placed = (size, glyphHeight) => {
    const s = glyphHeight / 30;
    return `<g transform="translate(${size / 2 - 35.5 * s} ${size / 2 - 32 * s}) scale(${s})">${glyph}</g>`;
  };
  const png = (svg, file) => sharp(Buffer.from(svg)).png().toFile(path.join(assets, file));
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs>${grad}</defs><rect width="1024" height="1024" fill="url(#b)"/>${placed(1024, 470)}</svg>`, 'icon-only.png');
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">${placed(1024, 360)}</svg>`, 'icon-foreground.png');
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs>${grad}</defs><rect width="1024" height="1024" fill="url(#b)"/></svg>`, 'icon-background.png');
  const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732"><defs>${grad}</defs><rect width="2732" height="2732" fill="${cfg.backgroundColor}"/><rect x="1166" y="1166" width="400" height="400" rx="120" fill="url(#b)"/>${placed(2732, 190)}</svg>`;
  await png(splash, 'splash.png');
  await png(splash, 'splash-dark.png');

  console.log(`web build ready: www/ (${fs.readdirSync(WWW).length} files), app ${cfg.appId} v${cfg.versionName}, ${appSettings.testAds ? 'TEST ads' : 'LIVE ads'}`);
}

/* ------------------------------------------------------------ android */
function buildAndroid(){
  must(fs.existsSync(ANDROID), 'android/ is missing: run "npx cap add android" first');
  const main = path.join(ANDROID, 'app/src/main');

  // Manifest: landscape only, AdMob app ID
  const manifestPath = path.join(main, 'AndroidManifest.xml');
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  if (!manifest.includes('android:screenOrientation')){
    manifest = replaceOnce(manifest, /<activity(\s)/, '<activity android:screenOrientation="sensorLandscape"$1', 'the main <activity>');
  }
  if (!manifest.includes('com.google.android.gms.ads.APPLICATION_ID')){
    manifest = replaceOnce(manifest, /(<application[^>]*>)/,
      `$1\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id"/>`,
      'the <application> tag');
  }
  fs.writeFileSync(manifestPath, manifest);

  // Strings: AdMob app ID
  const stringsPath = path.join(main, 'res/values/strings.xml');
  let strings = fs.readFileSync(stringsPath, 'utf8');
  strings = strings.replace(/\s*<string name="admob_app_id">[^<]*<\/string>/, '');
  strings = replaceOnce(strings, '</resources>', `    <string name="admob_app_id">${cfg.admob.appId}</string>\n</resources>`, '</resources> in strings.xml');
  fs.writeFileSync(stringsPath, strings);

  // Gradle: version from config + build number, release signing from GitHub secrets
  const gradlePath = path.join(ANDROID, 'app/build.gradle');
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  const versionCode = parseInt(process.env.VERSION_CODE || '1', 10);
  gradle = replaceOnce(gradle, /versionCode\s+\d+/, `versionCode ${versionCode}`, 'versionCode');
  gradle = replaceOnce(gradle, /versionName\s+"[^"]*"/, `versionName "${cfg.versionName}"`, 'versionName');
  if (!gradle.includes('signingConfigs')){
    gradle = replaceOnce(gradle, /(\n\s*buildTypes\s*\{)/, `
    signingConfigs {
        release {
            if (System.getenv("KEYSTORE_FILE")) {
                storeFile file(System.getenv("KEYSTORE_FILE"))
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }$1`, 'the buildTypes block');
    gradle = replaceOnce(gradle, /(buildTypes\s*\{\s*release\s*\{)/, `$1
            if (System.getenv("KEYSTORE_FILE")) { signingConfig signingConfigs.release }`, 'the release build type');
  }
  fs.writeFileSync(gradlePath, gradle);

  console.log(`android project patched: versionCode ${versionCode}, versionName ${cfg.versionName}, landscape, AdMob ${cfg.admob.appId}`);
}

if (mode === 'web') await buildWeb();
else if (mode === 'android') buildAndroid();
else must(false, `unknown mode "${mode}" (use web or android)`);
