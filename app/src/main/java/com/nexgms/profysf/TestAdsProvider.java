package com.nexgms.profysf;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Simulated full-screen ads, clearly labelled as test ads. Lets every ad flow be exercised without the SDK. */
public class TestAdsProvider implements AdsProvider {
    private final Handler h = new Handler(Looper.getMainLooper());
    private Activity act;
    private FrameLayout ov;
    private Result res;
    private int type, left;
    private boolean closable, earned, fr;
    private TextView info;
    private Button close;

    @Override public void init(Activity a) { act = a; }
    @Override public boolean ready(int t) { return true; }
    @Override public boolean isShowing() { return ov != null; }
    @Override public void onNetworkAvailable() { }

    @Override
    public void show(Activity a, int t, String lang, Result r) {
        if (ov != null) { r.on("failed"); return; }
        act = a; res = r; type = t;
        fr = !"en".equals(lang);
        earned = false; closable = false; left = (t == REWARDED) ? 5 : 3;

        ov = new FrameLayout(a);
        ov.setBackgroundColor(0xF2050A24);
        ov.setClickable(true);
        LinearLayout box = new LinearLayout(a);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        int p = (int) (24 * a.getResources().getDisplayMetrics().density);
        box.setPadding(p, p, p, p);

        String titleStr = fr ? "Annonce de test" : "Test ad";
        String subStr = fr ? "Simule une vraie publicité AdMob (aucune donnée envoyée)."
                : "Simulates a real AdMob ad (no data is sent).";
        TextView title = tv(a, titleStr, 22, true);
        TextView sub = tv(a, subStr, 14, false);
        info = tv(a, "", 17, true);
        close = new Button(a);
        close.setAllCaps(false);
        close.setText(fr ? "Fermer" : "Close");
        close.setEnabled(false);
        close.setOnClickListener(new View.OnClickListener() { @Override public void onClick(View v) { finish(); } });

        box.addView(title); box.addView(sub); box.addView(info);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = p; box.addView(close, lp);
        ov.addView(box, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, Gravity.CENTER));
        ((ViewGroup) a.findViewById(android.R.id.content)).addView(ov,
                new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        render();
        h.postDelayed(tick, 1000);
    }

    private TextView tv(Activity a, String s, int sp, boolean bold) {
        TextView t = new TextView(a);
        t.setText(s); t.setTextColor(Color.WHITE); t.setTextSize(sp); t.setGravity(Gravity.CENTER);
        t.setPadding(0, 8, 0, 8);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    private void render() {
        if (type == REWARDED) {
            if (earned) {
                info.setText(fr ? "Récompense obtenue !" : "Reward earned!");
            } else {
                String prefix = fr ? "Regardez jusqu’à la fin : " : "Watch until the end: ";
                info.setText(prefix + left + " s");
            }
            // closable after 2 s, but closing early gives NO reward
            closable = earned || left <= 3;
        } else {
            String done = fr ? "Terminé" : "Done";
            String prefix = fr ? "Publicité : " : "Ad: ";
            info.setText(left > 0 ? prefix + left + " s" : done);
            closable = left <= 0;
        }
        close.setEnabled(closable);
    }

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (ov == null) return;
            if (left > 0) left--;
            if (type == REWARDED && left == 0 && !earned) {
                earned = true;
                if (res != null) res.on("rewarded");
            }
            render();
            if (left > 0) h.postDelayed(this, 1000);
        }
    };

    private void finish() {
        h.removeCallbacks(tick);
        if (ov != null) { ((ViewGroup) ov.getParent()).removeView(ov); ov = null; }
        Result r = res; res = null;
        if (r != null) {
            if (type == REWARDED && !earned) {
                r.on("not_completed");
            } else {
                r.on("closed");
            }
        }
    }

    @Override public void onBack() { if (closable) finish(); }
    @Override public void destroy() {
        h.removeCallbacks(tick);
        if (ov != null && ov.getParent() != null) ((ViewGroup) ov.getParent()).removeView(ov);
        ov = null; res = null;
    }
}
