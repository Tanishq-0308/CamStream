package com.camstream

import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import com.facebook.react.bridge.*
import java.util.*

class TTSModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null
    private var isInitialized = false
    private var pendingSpeak: String? = null

    companion object {
        private const val TAG = "TTSModule"
    }

    init {
        tts = TextToSpeech(reactContext, this)
    }

    override fun getName() = "TTSModule"

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.US)
            
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.e(TAG, "Language not supported")
            } else {
                isInitialized = true
                Log.d(TAG, "TTS initialized successfully")
                
                // Speak pending text if any
                pendingSpeak?.let {
                    speakInternal(it)
                    pendingSpeak = null
                }
            }
            
            // Set up progress listener
            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    Log.d(TAG, "TTS started: $utteranceId")
                }

                override fun onDone(utteranceId: String?) {
                    Log.d(TAG, "TTS done: $utteranceId")
                }

                override fun onError(utteranceId: String?) {
                    Log.e(TAG, "TTS error: $utteranceId")
                }
            })
        } else {
            Log.e(TAG, "TTS initialization failed")
        }
    }

    @ReactMethod
    fun speak(text: String, promise: Promise) {
        try {
            if (!isInitialized) {
                pendingSpeak = text
                promise.resolve(true)
                return
            }
            
            speakInternal(text)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    private fun speakInternal(text: String) {
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "utterance_${System.currentTimeMillis()}")
    }

    @ReactMethod
    fun speakNotification(title: String?, body: String?, promise: Promise) {
        try {
            val text = when {
                !title.isNullOrEmpty() && !body.isNullOrEmpty() -> "$title. $body"
                !title.isNullOrEmpty() -> title
                !body.isNullOrEmpty() -> body
                else -> ""
            }

            if (text.isNotEmpty()) {
                if (!isInitialized) {
                    pendingSpeak = text
                } else {
                    speakInternal(text)
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            tts?.stop()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setLanguage(language: String, promise: Promise) {
        try {
            val locale = Locale.forLanguageTag(language)
            val result = tts?.setLanguage(locale)
            
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                promise.reject("ERROR", "Language not supported: $language")
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setRate(rate: Float, promise: Promise) {
        try {
            tts?.setSpeechRate(rate)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun setPitch(pitch: Float, promise: Promise) {
        try {
            tts?.setPitch(pitch)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isSpeaking(promise: Promise) {
        try {
            promise.resolve(tts?.isSpeaking ?: false)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getAvailableLanguages(promise: Promise) {
        try {
            val languages = Arguments.createArray()
            tts?.availableLanguages?.forEach { locale ->
                languages.pushString(locale.toLanguageTag())
            }
            promise.resolve(languages)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        tts?.stop()
        tts?.shutdown()
    }
}