package com.alangpierce.audicademyandroid;

import butterknife.Bind;
import butterknife.ButterKnife;
import com.falconware.prestissimo.Track;
import com.google.common.base.Joiner;
import com.google.common.collect.ImmutableList;
import edu.cmu.pocketsphinx.Assets;
import edu.cmu.pocketsphinx.Decoder;
import edu.cmu.pocketsphinx.SpeechRecognizer;
import edu.cmu.pocketsphinx.SpeechRecognizerSetup;

import android.app.Activity;
import android.os.AsyncTask;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.Menu;
import android.view.MenuItem;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;

public class AudicademyActivity extends Activity {
    private Random mRandom = new Random();
    @Bind(R.id.web_view) WebView mWebView;
    @Bind(R.id.speak_button) Button mSpeakButton;

    private TextToSpeech mTextToSpeech;
    private SpeechRecognizer mRecognizer;
    private Track mTrack;

    // If not null, this callback is the the one to actually use when the user finishes speaking.
    private volatile JsCallback<String> mSpeechCompletionCallback;

    private Map<String, JsCallback<Void>> mUtteranceCompletionCallbacks = new HashMap<>();
    private Set<String> mCompletedUtterances = new HashSet<>();

    private static final String DIGITS_SEARCH = "digits";

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

        initRecognizer();

        mSpeakButton.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        mWebView.post(new Runnable() {
                            @Override
                            public void run() {
                                mWebView.evaluateJavascript("handleSpeakButtonDown()", null);
                            }
                        });
                        break;
                    case MotionEvent.ACTION_UP:
                        mWebView.post(new Runnable() {
                            @Override
                            public void run() {
                                mWebView.evaluateJavascript("handleSpeakButtonUp()", null);
                            }
                        });
                        break;
                }
                return true;
            }
        });

        mTextToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String utteranceId) {
            }

            @Override
            public void onDone(String utteranceId) {
                JsCallback<Void> callback = mUtteranceCompletionCallbacks.get(utteranceId);
                if (callback != null) {
                    callback.respond(null);
                } else {
                    mCompletedUtterances.add(utteranceId);
                }
            }

            @Override
            public void onError(String utteranceId) {
            }
        });

        mTrack = new Track(this);
    }

    public class AudicademyInterface {
        public void speak(String message, JsCallback<String> callback) {
            String utteranceId = randomId();
            mTextToSpeech.speak(message, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
            callback.respond(utteranceId);
        }
        public void stopSpeaking(JsCallback<Void> callback) {
            mTextToSpeech.stop();
            callback.respond(null);
        }
        public void waitForEndOfSpeech(String utteranceId, JsCallback<Void> callback) {
            if (mCompletedUtterances.contains(utteranceId)) {
                callback.respond(null);
            } else {
                mUtteranceCompletionCallbacks.put(utteranceId, callback);
            }
        }

        public void playYoutubeVideo(String youtubeId, JsCallback<Void> callback) {
            mTrack.setDataSourceString("file:///mnt/sdcard/KhanAcademyData/videos/" + youtubeId + ".mp3");
            mTrack.prepare();
            mTrack.start();
            callback.respond(null);
        }

        public void pauseYoutubeVideo(JsCallback<Void> callback) {
            mTrack.pause();
            callback.respond(null);
        }

        public void resumeYoutubeVideo(JsCallback<Void> callback) {
            mTrack.start();
            callback.respond(null);
        }

        public void prepareSpeechList(String optionList, JsCallback<String> callback) {
            ImmutableList<String> options = ImmutableList.copyOf(optionList.split(","));
            String grammarId = randomId();
            setJsgfString(grammarId, jsgfFromOptionList(grammarId, options));
            callback.respond(grammarId);
        }
        public void startListening(String grammarId, JsCallback<Void> callback) {
            mRecognizer.startListening(grammarId);
            callback.respond(null);
        }
        public void stopListening(JsCallback<String> callback) {
            mSpeechCompletionCallback = callback;
            mRecognizer.stop();
        }
    }

    private String jsgfFromOptionList(String name, List<String> options) {
        return String.format("#JSGF V1.0;\n" +
                "\n" +
                "grammar %s;\n" +
                "\n" +
                "public <result> = %s;\n",
                name, Joiner.on(" | ").join(options));
    }

    private void setJsgfString(String name, String jsgfString) {
        System.out.println("Writing jsgf file:\n" + jsgfString);
        try {
            Field decoderField = mRecognizer.getClass().getDeclaredField("decoder");
            decoderField.setAccessible(true);
            Decoder decoder = (Decoder) decoderField.get(mRecognizer);
            decoder.setJsgfString(name, jsgfString);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void initRecognizer() {
        // Recognizer initialization is a time-consuming and it involves IO,
        // so we execute it in async task
        new AsyncTask<Void, Void, Exception>() {
            @Override
            protected Exception doInBackground(Void... params) {
                try {
                    Assets assets = new Assets(AudicademyActivity.this);
                    File assetDir = assets.syncAssets();
                    setupRecognizer(assetDir);
                } catch (IOException e) {
                    System.out.println("Error in setting up recognizer: " + e);
                    return e;
                }
                return null;
            }
        }.execute();
    }

    private void setupRecognizer(File assetsDir) throws IOException {
        System.out.println("Called setupRecognizer");

        mRecognizer = SpeechRecognizerSetup.defaultSetup()
                .setAcousticModel(new File(assetsDir, "en-us-ptm"))
                .setDictionary(new File(assetsDir, "cmudict-en-us.dict"))
                // To disable logging of raw audio comment out this call (takes a lot of space on the device)
                .setRawLogDir(assetsDir)
                // Threshold to tune for keyphrase to balance between false alarms and misses
                .setKeywordThreshold(1e-45f)
                // Use context-independent phonetic search, context-dependent is too slow for mobile
                .setBoolean("-allphone_ci", true)
                .getRecognizer();

        mRecognizer.addListener(new AudicademyRecognitionListener(
                new AudicademyRecognitionListener.ResultHandler() {
            @Override
            public void handleResult(String result) {
                if (mSpeechCompletionCallback != null) {
                    mSpeechCompletionCallback.respond(result);
                }
            }
        }));

        // Create grammar-based search for digit recognition
        File digitsGrammar = new File(assetsDir, "digits.gram");
        mRecognizer.addGrammarSearch(DIGITS_SEARCH, digitsGrammar);
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
