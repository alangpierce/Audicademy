declare class SpeechInterface {
    // Returns the utterance ID which can be used later.
    speak(text: string): Promise<string>;
    waitForEndOfSpeech(utteranceId: string): Promise<void>;
    stopSpeaking(): Promise<void>;

    playYoutubeVideo(youtubeId: string): Promise<string>;
    setYoutubePlaybackSpeed(playbackSpeed: number): Promise<void>;
    pauseYoutubeVideo(): Promise<string>;
    resumeYoutubeVideo(): Promise<string>;

    // Returns a grammar ID. Takes a comma-separate list.
    prepareSpeechList(stringList: string): Promise<string>;
    startListening(grammarId: string): Promise<void>;
    stopListening(): Promise<string>;

    startListeningFreeForm(): Promise<void>;
    stopListeningFreeForm(): Promise<string>;

    // Returns a note ID.
    recordUserVoice(): Promise<string>;
    stopRecordingUserVoice(): Promise<void>;
    playBackUserVoice(noteId: string): Promise<void>;
    stopUserVoice(): Promise<void>;
}

declare class ContentInterface {
    loadArticle(articleId: string): Promise<string>;
    performSearch(query: string): Promise<any>;
}

declare class ButtonInterface {
    registerButtonDownHandler(callback: () => void): void;
    registerButtonUpHandler(callback: () => void): void;
}