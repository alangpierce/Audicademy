declare class SpeechInterface {
    // Returns the utterance ID which can be used later.
    speak(text: string): Promise<string>;
    waitForEndOfSpeech(utteranceId: string): Promise<void>;
    stopSpeaking(): Promise<void>;

    playYoutubeVideo(youtubeId: string): Promise<string>;
    pauseYoutubeVideo(): Promise<string>;
    resumeYoutubeVideo(): Promise<string>;

    // Returns a grammar ID. Takes a comma-separate list.
    prepareSpeechList(stringList: string): Promise<string>;
    startListening(grammarId: string): Promise<void>;
    stopListening(): Promise<string>;

    // Returns a note ID.
    recordUserVoice(): Promise<string>;
    stopRecordingUserVoice(): Promise<void>;
    playBackUserVoice(noteId: string): Promise<void>;
    stopUserVoice(): Promise<void>;
}

declare class ContentInterface {
    loadArticle(articleId: string): Promise<string>;
}

declare class ButtonInterface {
    registerButtonDownHandler(callback: () => void): void;
    registerButtonUpHandler(callback: () => void): void;
}