package com.alangpierce.audicademyandroid;

import com.google.common.base.Function;
import com.google.common.collect.FluentIterable;
import com.google.common.collect.ImmutableList;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CallbackJavaScriptBridge {
    private final WebView mWebView;
    private Map<String, BridgeHandler> mBridgeHandlers = new HashMap<>();

    public CallbackJavaScriptBridge(WebView webView) {
        mWebView = webView;
    }

    public interface BridgeHandler {
        void handleFuncCall(String argJson);
    }

    public static CallbackJavaScriptBridge register(WebView webView) {
        CallbackJavaScriptBridge result = new CallbackJavaScriptBridge(webView);
        webView.addJavascriptInterface(result.createBridgeInterface(), "AndroidBridge");
        return result;
    }

    public class BridgeInterface {
        @JavascriptInterface
        public void callFunc(String funcName, String argJson) {
            mBridgeHandlers.get(funcName).handleFuncCall(argJson);
        }
    }

    private BridgeInterface createBridgeInterface() {
        return new BridgeInterface();
    }

    public void registerHandler(final Object obj, String handlerName) {
        for (final Method method : obj.getClass().getDeclaredMethods()) {
            validateHandlerMethod(method);
            String methodFullName = handlerName + "." + method.getName();
            mBridgeHandlers.put(methodFullName,
                    new BridgeHandler() {
                        @Override
                        public void handleFuncCall(String argJson) {
                            JsonArray argArray = new JsonParser().parse(argJson).getAsJsonArray();
                            List<JsonElement> argElements = ImmutableList.copyOf(argArray);
                            final String callbackId = argElements.get(argElements.size() - 1).getAsString();

                            Object[] rawArgs = FluentIterable
                                    .from(argElements.subList(0, argElements.size() - 1))
                                    .transform(new Function<JsonElement, Object>() {
                                        @Override
                                        public Object apply(JsonElement element) {
                                            return new Gson().fromJson(element, Object.class);
                                        }
                                    })
                                    .append(new JsCallback<Object>() {
                                        @Override
                                        public void respond(Object result) {
                                            respondToCallback(callbackId, result);
                                        }
                                    })
                                    .toArray(Object.class);

                            try {
                                method.invoke(obj, rawArgs);
                            } catch (IllegalAccessException e) {
                                throw new RuntimeException(e);
                            } catch (InvocationTargetException e) {
                                throw new RuntimeException(e.getCause());
                            }
                        }
                    });
            mWebView.evaluateJavascript(
                    String.format("CallbackJavaScriptBridge_defineWrapperMethod(%s, %s)",
                            new Gson().toJson(handlerName), new Gson().toJson(method.getName())),
                    null);
        }
    }

    private void validateHandlerMethod(Method method) {
        if (method.getGenericReturnType() != void.class) {
            throw new RuntimeException("Expected void return type on method " + method);
        }

        Type[] parameterTypes = method.getGenericParameterTypes();
        if (parameterTypes.length == 0) {
            throw new RuntimeException(
                    "Expected method " + method + " to have at least one parameter."
            );
        }
    }

    private void respondToCallback(final String callbackId, final Object result) {
        mWebView.post(new Runnable() {
            @Override
            public void run() {
                // Result should just be a primitive.
                String resultCode = new Gson().toJson(result);
                String jsCode = String.format(
                        "CallbackJavaScriptBridge_callbackForId(\"%s\")(%s)",
                        callbackId, resultCode);
                mWebView.evaluateJavascript(jsCode, null);
            }
        });
    }
}
