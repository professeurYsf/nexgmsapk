package com.nexgms.profysf;

/**
 * Ads configuration (single place).
 * MODE "test"   : built-in simulated test ads (no SDK, no network) - used by this APK.
 * MODE "admob"  : real Google Mobile Ads (this Android Studio project; IDs below are Google's public TEST ids).
 * MODE "off"    : no ads at all (rewarded hints/hammers are then unavailable).
 */
public final class AdsConfig {
    private AdsConfig() { }
    public static final String MODE = "admob";

    // AdMob IDs provided by user
    public static final String ADMOB_APP_ID = "ca-app-pub-1867364821804175~4008321248";
    public static final String INTERSTITIAL_UNIT_ID = "ca-app-pub-1867364821804175/1382157904";
    public static final String REWARDED_UNIT_ID = "ca-app-pub-1867364821804175/8727341637";

    // Google official sample test ad units (guaranteed to always serve test ads with "Test Ad" badge)
    public static final String SAMPLE_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";
    public static final String SAMPLE_REWARDED_ID = "ca-app-pub-3940256099942544/5224354917";

    // User test device ID (renders test ads for developer while delivering real ads to other users)
    public static final String TEST_DEVICE_ID = "65247E18382BEB9CE65A68FC1D00DC55";

    public static AdsProvider create() {
        if ("admob".equals(MODE)) return new AdMobProvider();
        if ("test".equals(MODE)) return new TestAdsProvider();
        return null;
    }
}
