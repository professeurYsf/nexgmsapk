package com.nexgms.profysf;

import android.app.Activity;

/** Native ads backend. MainActivity talks to ads only through this interface. */
public interface AdsProvider {
    int INTERSTITIAL = 1, REWARDED = 2;
    /** status: interstitial -> "closed" | "failed" | "no_internet"; rewarded -> "rewarded" (once) then "closed", or "not_completed" | "no_internet" | "failed". */
    interface Result { void on(String status); }
    void init(Activity activity);
    boolean ready(int type);
    void show(Activity activity, int type, String lang, Result r);
    boolean isShowing();
    /** Called on Android Back while an ad is showing. */
    void onBack();
    /** Called when network connection becomes available again. */
    void onNetworkAvailable();
    void destroy();
}
