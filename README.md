# NexGms

20-in-1 offline games collection (HTML/JS in a WebView) with AdMob interstitial + rewarded ads.

## Build
1. Open the folder in a recent Android Studio (AGP 9.1, JDK 17+, SDK Platform 36.1) and let it sync.
2. Run the `debug` variant: it uses Google's test ad units.
3. Release: provide your own keystore (`KEYSTORE_PATH`, `STORE_PASSWORD`, `KEY_PASSWORD`, alias `upload`) and build an AAB for Play.

Ads config lives in `app/src/main/java/com/nexgms/profysf/AdsConfig.java`.
