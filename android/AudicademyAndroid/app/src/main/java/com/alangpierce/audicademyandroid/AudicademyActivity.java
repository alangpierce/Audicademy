package com.alangpierce.audicademyandroid;

import butterknife.Bind;
import butterknife.ButterKnife;
import com.alangpierce.audicademyandroid.FreeFormRecognitionListener.ResultHandler;
import com.falconware.prestissimo.Track;
import com.google.common.base.Joiner;
import com.google.common.collect.ImmutableList;
import edu.cmu.pocketsphinx.Assets;
import edu.cmu.pocketsphinx.Decoder;
import edu.cmu.pocketsphinx.SpeechRecognizer;
import edu.cmu.pocketsphinx.SpeechRecognizerSetup;

import android.app.Activity;
import android.content.Intent;
import android.media.AudioManager;
import android.media.MediaRecorder;
import android.os.AsyncTask;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.KeyEvent;
import android.view.Menu;
import android.view.MenuItem;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
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
    private android.speech.SpeechRecognizer mFreeFormRecognizer;
    private Track mTrack;
    private MediaRecorder mMediaRecorder;

    // True if the the headset button is "logically" held down. Pressing the button toggles it.
    private boolean headsetButtonHeldDown = false;

    // If not null, this callback is the the one to actually use when the user finishes speaking.
    private volatile JsCallback<String> mSpeechCompletionCallback;

    private volatile JsCallback<String> mFreeFormSpeechCompletionCallback;
    private volatile String mPendingFreeFormResult;

    private Map<String, JsCallback<Void>> mUtteranceCompletionCallbacks = new HashMap<>();
    private Set<String> mCompletedUtterances = new HashSet<>();

    private float mPlaybackSpeed = 1.0f;

    private static final String DIGITS_SEARCH = "digits";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_audicademy);
        ButterKnife.bind(this);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        setVolumeControlStream(AudioManager.STREAM_MUSIC);

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
                        buttonDown();
                        break;
                    case MotionEvent.ACTION_UP:
                        buttonUp();
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

        mMediaRecorder = new MediaRecorder();

        mFreeFormRecognizer = android.speech.SpeechRecognizer.createSpeechRecognizer(this);
        mFreeFormRecognizer.setRecognitionListener(new FreeFormRecognitionListener(new ResultHandler() {
            @Override
            public void handleResult(String result) {
                if (mFreeFormSpeechCompletionCallback != null) {
                    mFreeFormSpeechCompletionCallback.respond(result);
                } else {
                    mPendingFreeFormResult = result;
                }
            }
        }));
    }

    private void buttonDown() {
        mWebView.post(new Runnable() {
            @Override
            public void run() {
                mWebView.evaluateJavascript("handleSpeakButtonDown()", null);
            }
        });
    }

    private void buttonUp() {
        mWebView.post(new Runnable() {
            @Override
            public void run() {
                mWebView.evaluateJavascript("handleSpeakButtonUp()", null);
            }
        });
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_HEADSETHOOK) {
            if (!headsetButtonHeldDown) {
                buttonDown();
            } else {
                buttonUp();
            }
            headsetButtonHeldDown = !headsetButtonHeldDown;
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    public class AudicademyInterface {
        public void speak(String message, JsCallback<String> callback) {
            String utteranceId = randomId();

            Bundle paramsBundle = new Bundle();
            paramsBundle.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 0.3f);

            mTextToSpeech.speak(message, TextToSpeech.QUEUE_FLUSH, paramsBundle, utteranceId);
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
            mTrack = new Track(AudicademyActivity.this);
            mTrack.setDataSourceString(
                    "file:///sdcard/KhanAcademyData/videos/" + youtubeId + "/" + youtubeId + ".ts");
            mTrack.setPlaybackSpeed(mPlaybackSpeed);
            mTrack.prepare();
            mTrack.start();
            callback.respond(null);
        }

        public void setYoutubePlaybackSpeed(double playbackSpeed, JsCallback<Void> callback) {
            mPlaybackSpeed = (float) playbackSpeed;
            mTrack.setPlaybackSpeed((float) playbackSpeed);
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

        public void startListeningFreeForm(JsCallback<Void> callback) {
            final Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE,
                    AudicademyActivity.this.getPackageName());
            mWebView.post(new Runnable() {
                @Override
                public void run() {
                    mFreeFormRecognizer.startListening(intent);
                }
            });
            callback.respond(null);
        }
        public void stopListeningFreeForm(JsCallback<String> callback) {
            if (mPendingFreeFormResult != null) {
                String result = mPendingFreeFormResult;
                mPendingFreeFormResult = null;
                callback.respond(result);
            } else {
                mFreeFormSpeechCompletionCallback = callback;
            }
            mWebView.post(new Runnable() {
                @Override
                public void run() {
                    mFreeFormRecognizer.stopListening();
                }
            });
        }

        // Starts recording the user's voice.
        public void recordUserVoice(JsCallback<String> callback) {
            String noteId = randomId();
            mMediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            mMediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.THREE_GPP);
            mMediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AMR_NB);
            mMediaRecorder.setOutputFile(pathForNoteFile(noteId));
            try {
                mMediaRecorder.prepare();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }

            mMediaRecorder.start();
            callback.respond(noteId);
        }
        public void stopRecordingUserVoice(JsCallback<Void> callback) {
            mMediaRecorder.stop();
            callback.respond(null);
        }
        public void playBackUserVoice(String noteId, JsCallback<Void> callback) {

            mTrack = new Track(AudicademyActivity.this);
            mTrack.setDataSourceString(pathForNoteFile(noteId));
            mTrack.prepare();
            mTrack.start();
            callback.respond(null);
        }
        public void stopUserVoice(JsCallback<Void> callback) {
            mTrack.stop();
            callback.respond(null);
        }
    }

    private String pathForNoteFile(String noteId) {
        return "/sdcard/temp/KhanAcademyNote" + noteId + ".3gpp";
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
        File quadraticFormulaGrammar = new File(assetsDir, "quadratic_formula_grammar.gram");
        mRecognizer.addGrammarSearch("quadratic_formula_grammar", quadraticFormulaGrammar);
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
