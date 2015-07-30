package com.alangpierce.audicademyandroid;

import butterknife.Bind;
import butterknife.ButterKnife;

import android.app.Activity;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class AudicademyActivity extends Activity {
    @Bind(R.id.web_view) WebView mWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_audicademy);
        ButterKnife.bind(this);

        // Note that order is important here!
        mWebView.getSettings().setJavaScriptEnabled(true);
        final CallbackJavaScriptBridge bridge = CallbackJavaScriptBridge.register(mWebView);

        mWebView.loadUrl("file:///android_asset/index.html");
        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                bridge.registerHandler(new AndroidBridge(), "ToastInterface");
                mWebView.evaluateJavascript("runAudicademyTopLevel()", null);
            }
        });
    }

    public class AndroidBridge {
        public void toast(String message, JsCallback<Void> callback) {
            Toast.makeText(AudicademyActivity.this, message, Toast.LENGTH_SHORT).show();
            callback.respond(null);
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.menu_audicademy, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_settings) {
            return true;
        }

        return super.onOptionsItemSelected(item);
    }
}
