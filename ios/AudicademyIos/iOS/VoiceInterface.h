#import "RCTBridgeModule.h"

#import <OpenEars/OEEventsObserver.h>

@interface VoiceInterface : NSObject <RCTBridgeModule, AVSpeechSynthesizerDelegate, OEEventsObserverDelegate>

@property (strong, nonatomic) OEEventsObserver *openEarsEventsObserver;

@end