package com.alangpierce.audicademyandroid;

import edu.cmu.pocketsphinx.Hypothesis;
import edu.cmu.pocketsphinx.RecognitionListener;

public class AudicademyRecognitionListener implements RecognitionListener {
    private final ResultHandler mHandler;

    public AudicademyRecognitionListener(ResultHandler handler) {
        mHandler = handler;
    }

    public interface ResultHandler {
        void handleResult(String result);
    }

    @Override
    public void onBeginningOfSpeech() {
    }

    @Override
    public void onEndOfSpeech() {
    }

    @Override
    public void onPartialResult(Hypothesis hypothesis) {
    }

    @Override
    public void onResult(Hypothesis hypothesis) {
        mHandler.handleResult(hypothesis.getHypstr());
    }

    @Override
    public void onError(Exception e) {
        System.out.println("Got an error: " + e);
        e.printStackTrace();
    }

    @Override
    public void onTimeout() {
        System.out.println("Timeout");
    }
}
