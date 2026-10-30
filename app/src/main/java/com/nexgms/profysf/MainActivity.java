package com.nexgms.profysf;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.content.res.Configuration;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.net.Uri;
import android.os.Looper;
import android.view.DisplayCutout;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.widget.FrameLayout;
import android.widget.Toast;

public class MainActivity extends Activity {
    static final String HOME = "file:///android_asset/www/index.html";
    static final String ASSET = "file:///android_asset/";

    private FrameLayout root;
    private WebView web;
    private SharedPreferences sp;
    private final Handler h = new Handler(Looper.getMainLooper());

    private boolean dark;
    private boolean clearHistory;
    private long backAt, lastBackEvt;
    private AdsProvider ads;
    private boolean adActive;
    private int lastW = -1, lastH = -1;
    private ConnectivityManager.NetworkCallback networkCallback;

    public static boolean isNetworkAvailable(Context ctx) {
        if (ctx == null) return false;
        try {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Network net = cm.getActiveNetwork();
                if (net == null) return false;
                NetworkCapabilities nc = cm.getNetworkCapabilities(net);
                return nc != null && (nc.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                        || nc.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                        || nc.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
                        || nc.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET));
            } else {
                NetworkInfo ni = cm.getActiveNetworkInfo();
                return ni != null && ni.isConnected();
            }
        } catch (Exception e) {
            return false;
        }
    }

    // ---- music state ----
    private boolean musicOn = true;
    private int musicVol = 60;
    private boolean resumed;
    private String wanted;      // track the current page wants (null = silence)
    private String track;       // track loaded in the player
    private MediaPlayer mp;
    private float gain = 0f, gainTarget = 0f;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        sp = getSharedPreferences("nexgms", MODE_PRIVATE);
        musicOn = sp.getBoolean("music_on", true);
        musicVol = sp.getInt("music_vol", 60);
        dark = sp.getBoolean("dark", false);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root = new FrameLayout(this);
        root.setBackgroundColor(bgColor());
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets in) {
                int l = 0, t = 0, r = 0, bt = 0;
                if (Build.VERSION.SDK_INT >= 28) {
                    DisplayCutout dc = in.getDisplayCutout();
                    if (dc != null) {
                        l = dc.getSafeInsetLeft(); t = dc.getSafeInsetTop();
                        r = dc.getSafeInsetRight(); bt = dc.getSafeInsetBottom();
                    }
                }
                v.setPadding(l, t, r, bt);
                return in;
            }
        });

        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setHapticFeedbackEnabled(false);
        web.setLongClickable(false);
        web.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) { return true; }
        });
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= 29) s.setForceDark(WebSettings.FORCE_DARK_OFF);

        web.addJavascriptInterface(new Bridge(), "GCNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) {
                pickTrack(url);
            }
            @Override
            public void onPageFinished(WebView v, String url) {
                if (clearHistory && HOME.equals(url)) { v.clearHistory(); clearHistory = false; }
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                return url == null || !url.startsWith(ASSET);
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                String u = r.getUrl().toString();
                return !u.startsWith(ASSET);
            }
            @Override
            public boolean onRenderProcessGone(WebView v, android.webkit.RenderProcessGoneDetail d) {
                h.post(new Runnable() { @Override public void run() { recreate(); } });
                return true;
            }
        });
        web.addOnLayoutChangeListener(new View.OnLayoutChangeListener() {
            @Override
            public void onLayoutChange(View v, int l, int t, int r, int bt, int ol, int ot, int or, int ob) {
                int w = r - l, hh = bt - t;
                if (w != lastW || hh != lastH) {
                    lastW = w; lastH = hh;
                    web.evaluateJavascript("window.GCFit&&GCFit()", null);
                }
            }
        });

        if (b == null) web.loadUrl(HOME); else web.restoreState(b);
        root.requestApplyInsets();

        ads = AdsConfig.create();
        if (ads != null) ads.init(this);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) {
                    networkCallback = new ConnectivityManager.NetworkCallback() {
                        @Override public void onAvailable(Network network) {
                            h.post(() -> {
                                if (ads != null) ads.onNetworkAvailable();
                                if (web != null) web.evaluateJavascript("window.GCNetwork&&GCNetwork(true)", null);
                            });
                        }
                        @Override public void onLost(Network network) {
                            h.post(() -> {
                                if (web != null) web.evaluateJavascript("window.GCNetwork&&GCNetwork(false)", null);
                            });
                        }
                    };
                    cm.registerDefaultNetworkCallback(networkCallback);
                }
            } catch (Exception ignored) { }
        }

        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    new OnBackInvokedCallback() { @Override public void onBackInvoked() { handleBack(); } });
        }
    }

    @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }

    private int bgColor() { return dark ? 0xFF0A0F22 : 0xFFDCF0FF; }

    // ---------- immersive ----------
    @SuppressWarnings("deprecation")
    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
            return;
        }
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }
    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }
    @Override public void onConfigurationChanged(Configuration c) { super.onConfigurationChanged(c); immersive(); root.requestApplyInsets(); }

    // ---------- lifecycle ----------
    @Override protected void onResume() {
        super.onResume();
        resumed = true;
        web.onResume();
        immersive();
        applyMusic();
        if (ads != null && isNetworkAvailable(this)) {
            ads.onNetworkAvailable();
        }
    }
    @Override protected void onPause() { resumed = false; applyMusic(); web.onPause(); super.onPause(); }
    @Override protected void onDestroy() {
        if (networkCallback != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) cm.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) { }
            networkCallback = null;
        }
        h.removeCallbacksAndMessages(null);
        if (mp != null) { try { mp.release(); } catch (Exception e) { } mp = null; }
        if (ads != null) ads.destroy();
        if (web != null) { root.removeView(web); web.destroy(); }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() { handleBack(); }

    /** Back: closes an ad if allowed, else asks the page (pause menu / resume / ...), else portal exit / back to portal. */
    private void handleBack() {
        long now = System.currentTimeMillis();
        if (now - lastBackEvt < 250) return;
        lastBackEvt = now;
        if (ads != null && ads.isShowing()) { ads.onBack(); return; }
        final String u = web.getUrl();
        final boolean portal = u == null || u.startsWith(HOME);
        web.evaluateJavascript("(function(){try{return window.GCBack?GCBack():false}catch(e){return false}})()", new ValueCallback<String>() {
            @Override public void onReceiveValue(String v) {
                if ("true".equals(v)) return;
                if (!portal) { clearHistory = true; web.loadUrl(HOME); return; }
                long t = System.currentTimeMillis();
                if (t - backAt < 2000) { finish(); return; }
                backAt = t;
                Toast.makeText(MainActivity.this, "Appuyez encore pour quitter / Press again to exit", Toast.LENGTH_SHORT).show();
            }
        });
    }

    // ---------- music ----------
    private static String trackFor(String url) {
        if (url == null || !url.startsWith(ASSET)) return null;
        int i = url.indexOf("/games/");
        if (i < 0) return "menu";
        String rest = url.substring(i + 7);
        int e = rest.indexOf('/');
        String g = e > 0 ? rest.substring(0, e) : rest;
        if (g.equals("simon")) return null;
        if (g.equals("tetrisneon")) return "neon";
        if (g.equals("Sudoku") || g.equals("flow") || g.equals("unblock")) return "focus";
        if (g.equals("checkers") || g.equals("connect4") || g.equals("fiveinarow") || g.equals("tictactoe") || g.equals("dots")) return "board";
        if (g.equals("tapcircle") || g.equals("stoptimer") || g.equals("fruitfusion")) return "arcade";
        return "chill";
    }

    private void pickTrack(String url) {
        String t = trackFor(url);
        if ((t == null && wanted == null) || (t != null && t.equals(wanted))) return;
        wanted = t;
        applyMusic();
    }

    private void applyMusic() {
        if (!resumed || adActive) { if (mp != null) { try { if (mp.isPlaying()) mp.pause(); } catch (Exception e) { } } return; }
        if (!musicOn || wanted == null) {
            if (mp != null) { gainTarget = 0f; h.removeCallbacks(tick); h.post(tick); }
            return;
        }
        if (mp == null) { startTrack(wanted); return; }
        if (!wanted.equals(track)) { gainTarget = 0f; h.removeCallbacks(tick); h.post(tick); return; }
        try { if (!mp.isPlaying()) mp.start(); } catch (Exception e) { }
        gainTarget = 1f; h.removeCallbacks(tick); h.post(tick);
    }

    private void startTrack(String name) {
        try {
            AssetFileDescriptor afd = getAssets().openFd("music/" + name + ".ogg");
            MediaPlayer p = new MediaPlayer();
            p.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            if (Build.VERSION.SDK_INT >= 21) {
                p.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
            }
            p.setLooping(true);
            p.prepare();
            mp = p; track = name; gain = 0f; gainTarget = 1f;
            updateVol();
            p.start();
            h.removeCallbacks(tick); h.post(tick);
        } catch (Exception e) {
            mp = null; track = null;
        }
    }

    private void updateVol() {
        if (mp == null) return;
        float v = (float) Math.pow(musicVol / 100f, 1.6) * gain;
        try { mp.setVolume(v, v); } catch (Exception e) { }
    }

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            float step = 0.07f;
            if (gain < gainTarget) gain = Math.min(gainTarget, gain + step);
            else if (gain > gainTarget) gain = Math.max(gainTarget, gain - step);
            updateVol();
            if (gain != gainTarget) { h.postDelayed(this, 40); return; }
            if (gain == 0f) {
                if (mp != null) { try { mp.release(); } catch (Exception e) { } mp = null; track = null; }
                if (resumed && musicOn && wanted != null) startTrack(wanted);
            }
        }
    };

    private void jsAd(String id, String st) {
        web.evaluateJavascript("window.GCAdsResult&&GCAdsResult('" + id + "','" + st + "')", null);
    }

    // ---------- JS bridge ----------
    private class Bridge {
        @JavascriptInterface public void setDark(final boolean d) {
            h.post(new Runnable() { @Override public void run() {
                dark = d; sp.edit().putBoolean("dark", d).apply(); root.setBackgroundColor(bgColor());
            } });
        }
        @JavascriptInterface public boolean isMusicOn() { return musicOn; }
        @JavascriptInterface public int getMusicVolume() { return musicVol; }
        @JavascriptInterface public void setMusicOn(final boolean on) {
            musicOn = on; sp.edit().putBoolean("music_on", on).apply();
            h.post(new Runnable() { @Override public void run() { applyMusic(); } });
        }
        @JavascriptInterface public void setMusicVolume(final int v) {
            musicVol = Math.max(0, Math.min(100, v)); sp.edit().putInt("music_vol", musicVol).apply();
            h.post(new Runnable() { @Override public void run() { updateVol(); } });
        }
        @JavascriptInterface public boolean isOnline() {
            return isNetworkAvailable(MainActivity.this);
        }
        @JavascriptInterface public boolean adsReady(int type) { return ads != null && ads.ready(type); }
        @JavascriptInterface public void adsShow(final int type, final String id, final String lang) {
            final String cid = id == null ? "" : id.replaceAll("[^A-Za-z0-9_]", "");
            h.post(new Runnable() { @Override public void run() {
                if (!isNetworkAvailable(MainActivity.this)) {
                    jsAd(cid, "no_internet");
                    return;
                }
                if (ads == null) { jsAd(cid, "failed"); return; }
                adActive = true; applyMusic();
                ads.show(MainActivity.this, type, lang, new AdsProvider.Result() {
                    @Override public void on(String st) {
                        if ("closed".equals(st) || "failed".equals(st) || "not_completed".equals(st) || "no_internet".equals(st)) {
                            adActive = false;
                            applyMusic();
                        }
                        jsAd(cid, st);
                    }
                });
            } });
        }
        @JavascriptInterface public void openUrl(final String url) {
            if (url == null || !url.startsWith("https://")) return;
            h.post(new Runnable() { @Override public void run() {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                catch (ActivityNotFoundException e) { Toast.makeText(MainActivity.this, "Impossible d’ouvrir la page / Could not open the page", Toast.LENGTH_SHORT).show(); }
            } });
        }
        @JavascriptInterface public float viewW() { return web.getWidth() / getResources().getDisplayMetrics().density; }
        @JavascriptInterface public float viewH() { return web.getHeight() / getResources().getDisplayMetrics().density; }
    }
}
