declare class SpeechInterface {
    // Returns the utterance ID which can be used later.
    speak(text: string): Promise<string>;
}
