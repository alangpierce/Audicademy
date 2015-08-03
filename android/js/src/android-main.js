/* @flow */

var $ = require("jquery");
var _ = require("underscore");

// Run some side-effects to expose some global functions for the Android bridge.
require("./android-bridge-lib.js");
var audicademyTopLevel = require("../../../core/src/audicademy.js");

var buttonDownHandlers = [];
var buttonUpHandlers = [];


// Object mapping from article ID to callback for that article.
var articleResponseHandlers = {};


function runAudicademyTopLevel() {
    var contentInterface = {
        loadArticle: function(articleId) {
            return new Promise(function(resolve, reject) {
                if (!articleResponseHandlers[articleId]) {
                    articleResponseHandlers[articleId] = [];
                }
                articleResponseHandlers[articleId].push(resolve);

                var script = document.createElement('script');
                script.src = 'file:///sdcard/KhanAcademyData/articles/' + articleId + '.js';
                document.head.appendChild(script);
            });
        },
        performSearch: function(query: string) {
            return $.get("http://www.khanacademy.org/api/internal/search/query", {
                q: query,
                content_kinds: "Video,Article"
            });
        }
    };
    var buttonInterface = {
        registerButtonDownHandler: function(callback) {
            buttonDownHandlers.push(callback);
        },
        registerButtonUpHandler: function(callback) {
            buttonUpHandlers.push(callback);
        }
    };

    audicademyTopLevel(AudicademyInterface, contentInterface, buttonInterface);
}

window.runAudicademyTopLevel = runAudicademyTopLevel;

window.handleSpeakButtonDown = function () {
    _.each(buttonDownHandlers, function (handler) {
        handler();
    });
};
window.handleSpeakButtonUp = function () {
    _.each(buttonUpHandlers, function (handler) {
        handler();
    });
};

window.KhanAcademyRegisterArticle = function(articleId, articleText) {
    var handlers = articleResponseHandlers[articleId];
    articleResponseHandlers[articleId] = null;
    if (handlers) {
        _.each(handlers, function(handler) {
            handler(articleText);
        })
    }
}