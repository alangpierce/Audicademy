#import <AVFoundation/AVFoundation.h>

#import "VoiceInterface.h"
#import "RCTLog.h"


@implementation VoiceInterface

RCT_EXPORT_MODULE();


AVSpeechSynthesizer *synth = NULL;
RCTResponseSenderBlock speechFinishedCallback = NULL;


RCT_EXPORT_METHOD(speak:(NSString *)text callback:(RCTResponseSenderBlock)callback) {
	if (synth == NULL) {
		synth = [[AVSpeechSynthesizer alloc] init];
		synth.delegate = self;
	}
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


@end