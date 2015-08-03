package com.alangpierce.audicademyandroid;

import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.SpeechRecognizer;

import java.util.ArrayList;

public class FreeFormRecognitionListener implements RecognitionListener {
    private final ResultHandler mResultHandler;

    public FreeFormRecognitionListener(ResultHandler resultHandler) {
        mResultHandler = resultHandler;
    }

    public interface ResultHandler {
        public void handleResult(String result);
    }

    @Override
    public void onReadyForSpeech(Bundle params) {

    }

    @Override
    public void onBeginningOfSpeech() {

    }

    @Override
    public void onRmsChanged(float rmsdB) {

    }

    @Override
    public void onBufferReceived(byte[] buffer) {

    }

    @Override
    public void onEndOfSpeech() {

    }

    @Override
    public void onError(int error) {

    }

    @Override
    public void onResults(Bundle results) {
        System.out.printf("Got results " + results);
        ArrayList<String> resultList =
                results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (resultList.isEmpty()) {
            mResultHandler.handleResult(null);
        } else {
            mResultHandler.handleResult(resultList.get(0));
        }
    }

    @Override
    public void onPartialResults(Bundle partialResults) {

    }

    @Override
    public void onEvent(int eventType, Bundle params) {

    }
}
