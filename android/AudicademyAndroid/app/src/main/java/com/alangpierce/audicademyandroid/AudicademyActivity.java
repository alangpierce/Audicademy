package com.alangpierce.audicademyandroid;

import butterknife.Bind;
import butterknife.ButterKnife;

import android.app.Activity;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.Menu;
import android.view.MenuItem;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.util.Locale;
import java.util.Random;

public class AudicademyActivity extends Activity {
    private Random mRandom = new Random();
    @Bind(R.id.web_view) WebView mWebView;

    private TextToSpeech mTextToSpeech;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_audicademy);
        ButterKnife.bind(this);

        mTextToSpeech = new TextToSpeech(this, null);
        mTextToSpeech.setLanguage(Locale.US);

        // Note that order is important here!
        mWebView.getSettings().setJavaScriptEnabled(true);
        final CallbackJavaScriptBridge bridge = CallbackJavaScriptBridge.register(mWebView);

        mWebView.loadUrl("file:///android_asset/index.html");
        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                bridge.registerHandler(new AudicademyInterface(), "AudicademyInterface");
                mWebView.evaluateJavascript("runAudicademyTopLevel()", null);
            }
        });
    }

    public class AudicademyInterface {
        public void toast(String message, JsCallback<Void> callback) {
            Toast.makeText(AudicademyActivity.this, message, Toast.LENGTH_SHORT).show();
            callback.respond(null);
        }

        public void speak(String message, JsCallback<String> callback) {
            String utteranceId = randomId();
            mTextToSpeech.speak(message, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
            callback.respond(utteranceId);

        }
    }

    private String randomId() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 15; i++) {
            sb.append('a' + mRandom.nextInt(26));
        }
        return sb.toString();
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
