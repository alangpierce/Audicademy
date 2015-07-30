declare class SpeechInterface {
    // Returns the utterance ID which can be used later.
    speak(text: string): Promise<string>;
    waitForEndOfSpeech(utteranceId: string): Promise<void>;

    // Returns a grammard ID. Takes a comma-separate list.
    prepareSpeechList(stringList: string): Promise<string>;
    startListening(grammarId: string): Promise<void>;
    stopListening(): Promise<string>;
}


declare class ButtonInterface {
    registerButtonDownHandler(callback: () => void);
    registerButtonUpHandler(callback: () => void);
}