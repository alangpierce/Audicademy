#import <AVFoundation/AVFoundation.h>

#import "VoiceInterface.h"
#import "RCTLog.h"

#import <OpenEars/OELanguageModelGenerator.h>
#import <OpenEars/OEAcousticModel.h>
#import <OpenEars/OEPocketsphinxController.h>

@implementation VoiceInterface

RCT_EXPORT_MODULE();


RCT_EXPORT_METHOD(initialize) {
	synth = [[AVSpeechSynthesizer alloc] init];
	synth.delegate = self;

//	OELanguageModelGenerator *lmGenerator = [[OELanguageModelGenerator alloc] init];
//
//	NSArray *words = [NSArray arrayWithObjects:@"WORD", @"STATEMENT", @"OTHER WORD", @"A PHRASE", nil];
//	NSString *name = @"NameIWantForMyLanguageModelFiles";
//	NSError *err = [lmGenerator generateLanguageModelFromArray:words withFilesNamed:name forAcousticModelAtPath:[OEAcousticModel pathToModel:@"AcousticModelEnglish"]];
//
//	NSString *lmPath = nil;
//	NSString *dicPath = nil;
//
//	if(err == nil) {
//		lmPath = [lmGenerator pathToSuccessfullyGeneratedLanguageModelWithRequestedName:@"NameIWantForMyLanguageModelFiles"];
//		dicPath = [lmGenerator pathToSuccessfullyGeneratedDictionaryWithRequestedName:@"NameIWantForMyLanguageModelFiles"];
//	} else {
//		NSLog(@"Error: %@",[err localizedDescription]);
//	}



//	[[OEPocketsphinxController sharedInstance] setActive:TRUE error:nil];
//	[[OEPocketsphinxController sharedInstance]
//			startListeningWithLanguageModelAtPath:lmPath
//			dictionaryAtPath:dicPath
//			acousticModelAtPath:[OEAcousticModel pathToModel:@"AcousticModelEnglish"]
//			languageModelIsJSGF:NO];

	self.openEarsEventsObserver = [[OEEventsObserver alloc] init];
	[self.openEarsEventsObserver setDelegate:self];
}



AVSpeechSynthesizer *synth = NULL;
// TODO(alan): Deal with the different race condition cases like in Android.
RCTResponseSenderBlock speechFinishedCallback = NULL;
RCTResponseSenderBlock voiceRecognitionResultCallback = NULL;


RCT_EXPORT_METHOD(speak:(NSString *)text callback:(RCTResponseSenderBlock)callback) {
	AVSpeechUtterance *utterance = [AVSpeechUtterance
																	speechUtteranceWithString:text];
	[synth speakUtterance:utterance];
	callback(@[[NSNull null]]);
}

RCT_EXPORT_METHOD(waitForEndOfSpeech:(NSString *)utteranceId callback:(RCTResponseSenderBlock)callback) {
	speechFinishedCallback = callback;
}

RCT_EXPORT_METHOD(stopSpeaking:(RCTResponseSenderBlock)callback) {
	if (synth != NULL) {
		[synth stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
	}
	callback(@[[NSNull null]]);
}

-(void)speechSynthesizer:(AVSpeechSynthesizer *)synthesizer didFinishSpeechUtterance:(AVSpeechUtterance *)utterance {
	if (speechFinishedCallback != NULL) {
		speechFinishedCallback(@[[NSNull null]]);
		speechFinishedCallback = NULL;
	}
}


// Should send the grammar ID that was created.
RCT_EXPORT_METHOD(prepareSpeechList:(NSString *)stringList callback:(RCTResponseSenderBlock)callback) {
	// Looks like I will need to call changeLanguageModelToFile or something equivalent
}

RCT_EXPORT_METHOD(startListening:(NSString *)grammarId callback:(RCTResponseSenderBlock)callback) {
	//
}

// Should send the recognized string (or null) to the callback.
RCT_EXPORT_METHOD(stopListening:(RCTResponseSenderBlock)callback) {

	[[OEPocketsphinxController sharedInstance] stopListening];
}





- (void) pocketsphinxDidReceiveHypothesis:(NSString *)hypothesis recognitionScore:(NSString *)recognitionScore utteranceID:(NSString *)utteranceID {
	NSLog(@"The received hypothesis is %@ with a score of %@ and an ID of %@", hypothesis, recognitionScore, utteranceID);
}

- (void) pocketsphinxDidStartListening {
	NSLog(@"Pocketsphinx is now listening.");
}

- (void) pocketsphinxDidDetectSpeech {
	NSLog(@"Pocketsphinx has detected speech.");
}

- (void) pocketsphinxDidDetectFinishedSpeech {
	NSLog(@"Pocketsphinx has detected a period of silence, concluding an utterance.");
}

- (void) pocketsphinxDidStopListening {
	NSLog(@"Pocketsphinx has stopped listening.");
	// TODO(alan): trigger voiceRecognitionResultCallback here, probably.
}

- (void) pocketsphinxDidSuspendRecognition {
	NSLog(@"Pocketsphinx has suspended recognition.");
}

- (void) pocketsphinxDidResumeRecognition {
	NSLog(@"Pocketsphinx has resumed recognition.");
}

- (void) pocketsphinxDidChangeLanguageModelToFile:(NSString *)newLanguageModelPathAsString andDictionary:(NSString *)newDictionaryPathAsString {
	NSLog(@"Pocketsphinx is now using the following language model: \n%@ and the following dictionary: %@",newLanguageModelPathAsString,newDictionaryPathAsString);
}

- (void) pocketSphinxContinuousSetupDidFailWithReason:(NSString *)reasonForFailure {
	NSLog(@"Listening setup wasn't successful and returned the failure reason: %@", reasonForFailure);
}

- (void) pocketSphinxContinuousTeardownDidFailWithReason:(NSString *)reasonForFailure {
	NSLog(@"Listening teardown wasn't successful and returned the failure reason: %@", reasonForFailure);
}

- (void) testRecognitionCompleted {
	NSLog(@"A test file that was submitted for recognition is now complete.");
}

@end