# Streamly Sim — Android app

The game lives in `../play`. This folder turns it into an Android app with
[Capacitor](https://capacitorjs.com). GitHub Actions does the building
(`.github/workflows/android.yml`), so nothing needs installing on your computer.

## Files

| File | What it is |
|---|---|
| `streamly.config.json` | The only file you normally edit: app ID, version, AdMob IDs, test-ads switch |
| `build.mjs` | Copies the game into the app, bundles the font, makes icons, patches the Android project |
| `package.json` | Build tools the workflow installs |

## Every update

1. Upload the changed game files into `play/` (as you already do).
2. Raise `versionName` in `streamly.config.json` if it's a new release.
3. GitHub builds automatically. Open **Actions → Android app → the latest run → Artifacts**.
   - `streamly-sim-test-apk`: install on your phone to test.
   - `streamly-sim-play-upload`: the `.aab` to upload to Google Play (needs the signing secrets).

The build number (versionCode) goes up by itself on every run, which Google Play requires.

## Signing secrets (Settings → Secrets and variables → Actions → New repository secret)

| Name | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the long text from the signing key pack |
| `ANDROID_KEYSTORE_PASSWORD` | the password from the pack |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | same password as above |

Keep the keystore file somewhere safe outside GitHub. Google Play needs the same key for every update.

## Going live with real ads

1. Create the app in AdMob and a **Rewarded** ad unit.
2. In `streamly.config.json`, set `admob.appId` (has a `~`), `admob.rewardedAdId` (has a `/`) and `"testAds": false`.
3. Push. Until then the app shows Google's test ads, which pay nothing but can't get your account in trouble.

Never tap your own real ads. Test on your phone with `testAds: true`.

## Notes

- `appId` (`com.aetheredge.streamlysim`) is permanent once the app is on Google Play.
- The app is landscape-only, full screen, works offline (rewarded ads need internet).
- Back button: closes popups, then goes Home, then asks before leaving.
