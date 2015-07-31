/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 */
'use strict';

var Button = require('react-native-button');
var React = require('react-native');
var {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    } = React;

var AudicademyIos = React.createClass({
    handleButtonDown: function() {
        console.log("Button down");
    },

    handleButtonUp: function() {
        console.log("Button up");
    },

    render: function () {
        console.log("Called render.");
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
