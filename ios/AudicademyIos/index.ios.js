/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

var Button = require('react-native-button');
var React = require('react-native');
var _ = require('underscore');

// Populate window with some globals that we can use.
require('./build/audicademy-ios-bundle.js');

var {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    } = React;


window.buttonDownHandlers = [];
window.buttonUpHandlers = [];

var AudicademyIos = React.createClass({
    handleButtonDown: function() {
        console.log("Button down");
        _.each(window.buttonDownHandlers, function(handler) {
            handler();
        });
    },

    handleButtonUp: function() {
        console.log("Button up");
        _.each(window.buttonUpHandlers, function(handler) {
            handler();
        });
    },

    render: function () {
        console.log("Called render.");
        console.log("the value is " + window.TheValue);

        var VoiceInterface = React.NativeModules.VoiceInterface;

        var speechInterface = {
            // Returns the utterance ID which can be used later.
            speak: function(text) {
                return new Promise(function(resolve, reject) {
                    VoiceInterface.speak(text, resolve);
                });
            },
            waitForEndOfSpeech: function(utteranceId) {
                return new Promise(function(resolve, reject) {
                    VoiceInterface.waitForEndOfSpeech(utteranceId, resolve);
                });
            },
            stopSpeaking: function() {
                return new Promise(function(resolve, reject) {
                    VoiceInterface.stopSpeaking(resolve);
                });
            },
            playYoutubeVideo: function(youtubeId) {

            },
            // Returns a grammard ID. Takes a comma-separate list.
            prepareSpeechList: function(stringList) {

            },
            startListening: function(grammarId) {

            },
            stopListening: function() {

            }
        };

        var buttonInterface = {
            registerButtonDownHandler: function(handler) {
                window.buttonDownHandlers.push(handler);
            },
            registerButtonUpHandler: function(handler) {
                window.buttonUpHandlers.push(handler);
            }
        };

        window.AudicademyIosTopLevel(speechInterface, buttonInterface);

        return (
            <View style={styles.container}>
                <Button style={styles.button}
                        onPressIn={this.handleButtonDown}
                        onPressOut={this.handleButtonUp}>
                    Speak
                </Button>
            </View>
        );
    }
});

var styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5FCFF',
    },
    button: {
        borderWidth: 1,
        fontSize: 20,
        width: 250,
        height: 400,
        backgroundColor: '#CCCCCC',
        paddingTop: 175,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
    },
});

AppRegistry.registerComponent('AudicademyIos', () => AudicademyIos);
