# Audicademy

Audicademy is a cross-platform app that allows you access any Khan Academy content in an audio-only format using voice commands for navigation. It is designed to be useful both for blind users and for other situation where are unable to see their screen (e.g. as a replacement for audiobooks and podcasts).

A feature-incomplete demo is available at https://audicademy.appspot.com (requires a recent version of Chrome).

## Current state

The app is very much demoware at this point, but it is useful in particular situations on Android.

Limitations:
* On Android, the app can play any video or article, but it must be saved to the filesystem in a particular format.
* Exercises are not supported, aside from two demo exercises ("simple exercise" and "advanced exercise").
* The app requires the screen to be on the entire time.
* The voice recognition is often accurate, but also often gets things wrong.
* On web, voice recognition works for basic navigation, but not for the exercises.
* On web, articles are not available and search does not work.
* On iOS, voice recognition is not hooked up, so the app is not usable.

## Interesting technical details

* In order to be cross-platform, all core logic is implemented in JavaScript, with native code powering the voice recognition, speech synthesis, and other capabilities.
* The iOS code uses React Native. The Android code runs JS in a WebView using the built-in interop. In addition, there is a layer that makes it easy for JS code to pass callbacks to Java code.
* The JavaScript itself is written using ES7, most notably async/await, transpiled to earlier JavaScript using Babel.
* The web implementation uses the Chrome speech recognition and speech synthesis APIs.
