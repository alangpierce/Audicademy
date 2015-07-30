declare class SpeechInterface {
    // Returns the utterance ID which can be used later.
    speak(text: string): Promise<string>;
    waitForEndOfSpeech(utteranceId: string): Promise<void>;
    recognizeSpeech(): Promise<string>;
    // stringList should be comma-separated
    recognizeFromList(stringList: string): Promise<string>;
}
