package com.nexgms.profysf;

import android.app.Activity;
import android.provider.Settings;
import android.util.Log;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.ump.ConsentDebugSettings;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Real AdMob backend.
 * Guarantees test ads during testing/on developer device to protect against invalid traffic,
 * while delivering real monetization ads in production for end users.
 */
public class AdMobProvider implements AdsProvider {
    private static final String TAG = "AdMobProvider";
    private final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    private Activity act;
    private InterstitialAd inter;
    private RewardedAd rewarded;
    private boolean started, loadingI, loadingR, showing;
    private int retryI = 0, retryR = 0;

    public static String getDeviceHashedId(android.content.Context ctx) {
        try {
            String androidId = Settings.Secure.getString(ctx.getContentResolver(), Settings.Secure.ANDROID_ID);
            if (androidId != null && !androidId.isEmpty()) {
                MessageDigest md = MessageDigest.getInstance("MD5");
                byte[] digest = md.digest(androidId.getBytes(StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                for (byte b : digest) {
                    sb.append(String.format(Locale.US, "%02X", b));
                }
                return sb.toString();
            }
        } catch (Exception ignored) { }
        return "";
    }

    private boolean isTestDevice() {
        if (act == null) return false;
        String curId = getDeviceHashedId(act);
        return (!curId.isEmpty() && curId.equalsIgnoreCase(AdsConfig.TEST_DEVICE_ID));
    }

    private String getInterstitialUnitId() {
        if (isTestDevice() || BuildConfig.DEBUG) {
            return AdsConfig.SAMPLE_INTERSTITIAL_ID;
        }
        return AdsConfig.INTERSTITIAL_UNIT_ID;
    }

    private String getRewardedUnitId() {
        if (isTestDevice() || BuildConfig.DEBUG) {
            return AdsConfig.SAMPLE_REWARDED_ID;
        }
        return AdsConfig.REWARDED_UNIT_ID;
    }

    @Override public void init(final Activity a) {
        act = a;
        applyTestDeviceConfig();
        final ConsentInformation ci = UserMessagingPlatform.getConsentInformation(a);
        ConsentDebugSettings.Builder debugBuilder = new ConsentDebugSettings.Builder(a)
                .addTestDeviceHashedId(AdsConfig.TEST_DEVICE_ID);
        ConsentDebugSettings debugSettings = debugBuilder.build();
        ConsentRequestParameters params = new ConsentRequestParameters.Builder()
                .setConsentDebugSettings(debugSettings)
                .build();
        ci.requestConsentInfoUpdate(a, params,
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(a, formError -> { if (ci.canRequestAds()) start(); }),
                formError -> { if (ci.canRequestAds()) start(); });
        if (ci.canRequestAds()) start();
    }

    private void applyTestDeviceConfig() {
        List<String> list = new ArrayList<>();
        list.add(AdsConfig.TEST_DEVICE_ID);
        list.add(AdsConfig.TEST_DEVICE_ID.toUpperCase(Locale.US));
        list.add(AdsConfig.TEST_DEVICE_ID.toLowerCase(Locale.US));
        // Only YOUR device (TEST_DEVICE_ID) is a test device. The current device's own hash is only logged
        // (to copy it into AdsConfig.TEST_DEVICE_ID), never added to the list, otherwise every user would get test ads.
        if (act != null) Log.i(TAG, "This device hash: " + getDeviceHashedId(act));
        list.add(AdRequest.DEVICE_ID_EMULATOR);
        RequestConfiguration configuration = new RequestConfiguration.Builder()
                .setTestDeviceIds(list)
                .build();
        MobileAds.setRequestConfiguration(configuration);
    }

    private synchronized void start() {
        if (started || act == null) return;
        started = true;
        applyTestDeviceConfig();
        MobileAds.initialize(act, status -> {
            loadInterstitial();
            loadRewarded();
        });
    }

    @Override
    public void onNetworkAvailable() {
        handler.post(() -> {
            if (act == null) return;
            if (!started) {
                ConsentInformation ci = UserMessagingPlatform.getConsentInformation(act);
                if (ci.canRequestAds()) {
                    start();
                } else {
                    init(act);
                }
            } else {
                retryI = 0;
                retryR = 0;
                if (inter == null && !loadingI) loadInterstitial();
                if (rewarded == null && !loadingR) loadRewarded();
            }
        });
    }

    private void loadInterstitial() {
        if (!started || loadingI || inter != null || act == null) return;
        if (!MainActivity.isNetworkAvailable(act)) {
            return;
        }
        loadingI = true;
        InterstitialAd.load(act, getInterstitialUnitId(), new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(InterstitialAd ad) {
                inter = ad;
                loadingI = false;
                retryI = 0;
            }
            @Override public void onAdFailedToLoad(LoadAdError e) {
                inter = null;
                loadingI = false;
                scheduleRetry(true);
            }
        });
    }

    private void loadRewarded() {
        if (!started || loadingR || rewarded != null || act == null) return;
        if (!MainActivity.isNetworkAvailable(act)) {
            return;
        }
        loadingR = true;
        RewardedAd.load(act, getRewardedUnitId(), new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override public void onAdLoaded(RewardedAd ad) {
                rewarded = ad;
                loadingR = false;
                retryR = 0;
            }
            @Override public void onAdFailedToLoad(LoadAdError e) {
                rewarded = null;
                loadingR = false;
                scheduleRetry(false);
            }
        });
    }

    private void scheduleRetry(final boolean isInter) {
        if (act == null || act.isFinishing()) return;
        final int delay = Math.min(60000, 10000 * (1 << (isInter ? retryI : retryR)));
        if (isInter) { if (retryI < 4) retryI++; } else { if (retryR < 4) retryR++; }
        handler.postDelayed(() -> {
            if (act != null && !act.isFinishing() && MainActivity.isNetworkAvailable(act)) {
                if (isInter) loadInterstitial(); else loadRewarded();
            }
        }, delay);
    }

    @Override public boolean ready(int type) { return type == INTERSTITIAL ? inter != null : rewarded != null; }
    @Override public boolean isShowing() { return showing; }
    @Override public void onBack() { /* system ad UI handles Back */ }

    @Override public void destroy() {
        handler.removeCallbacksAndMessages(null);
        inter = null;
        rewarded = null;
        act = null;
    }

    @Override public void show(Activity a, int type, String lang, final Result r) {
        if (!MainActivity.isNetworkAvailable(a)) {
            r.on("no_internet");
            return;
        }
        if (showing || !ready(type)) {
            if (type == INTERSTITIAL) loadInterstitial();
            else loadRewarded();
            r.on("failed");
            return;
        }
        showing = true;
        if (type == INTERSTITIAL) {
            InterstitialAd ad = inter;
            inter = null;
            ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override public void onAdDismissedFullScreenContent() {
                    showing = false;
                    r.on("closed");
                    loadInterstitial();
                }
                @Override public void onAdFailedToShowFullScreenContent(AdError e) {
                    showing = false;
                    r.on("failed");
                    loadInterstitial();
                }
            });
            ad.show(a);
        } else {
            RewardedAd ad = rewarded;
            rewarded = null;
            final boolean[] earned = { false };
            ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override public void onAdDismissedFullScreenContent() {
                    showing = false;
                    if (earned[0]) {
                        r.on("closed");
                    } else {
                        // User dismissed the ad before earning the reward
                        r.on("not_completed");
                    }
                    loadRewarded();
                }
                @Override public void onAdFailedToShowFullScreenContent(AdError e) {
                    showing = false;
                    r.on("failed");
                    loadRewarded();
                }
            });
            // The reward is given strictly when the user actually watches the ad and SDK confirms reward
            ad.show(a, item -> {
                if (!earned[0]) {
                    earned[0] = true;
                    r.on("rewarded");
                }
            });
        }
    }
}
