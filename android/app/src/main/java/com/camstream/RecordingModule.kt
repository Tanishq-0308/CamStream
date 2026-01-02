package com.camstream

import android.content.Intent
import android.os.Environment
import android.net.Uri
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import java.io.File

class RecordingModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "RecordingModule"

    @ReactMethod
    fun startRecording(streamUrl: String, promise: Promise) {
        try {
            val path = MjpegRecorder.startRecording(reactApplicationContext, streamUrl)
            if (path != null) {
                promise.resolve(path)
            } else {
                promise.reject("ERROR", "Failed to start recording")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        try {
            val path = MjpegRecorder.stopRecording()
            if (path != null) {
                promise.resolve(path)
            } else {
                promise.reject("ERROR", "Failed to stop recording or file is empty")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isRecording(promise: Promise) {
        try {
            promise.resolve(MjpegRecorder.isRecording())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getRecordingDuration(promise: Promise) {
        try {
            promise.resolve(MjpegRecorder.getRecordingDuration().toDouble())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getRecordings(promise: Promise) {
        try {
            val dir = File(
                reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES),
                "CamStreamRecordings"
            )

            if (!dir.exists()) {
                promise.resolve(Arguments.createArray())
                return
            }

            val recordings = Arguments.createArray()

            dir.listFiles()
                ?.filter { it.extension == "mp4" && it.length() > 0 }
                ?.sortedByDescending { it.lastModified() }
                ?.forEach { file ->
                    val recording = Arguments.createMap().apply {
                        putString("id", file.nameWithoutExtension)
                        putString("path", file.absolutePath)
                        putString("name", file.name)
                        putDouble("size", file.length().toDouble())
                        putDouble("timestamp", file.lastModified().toDouble())
                    }
                    recordings.pushMap(recording)
                }

            promise.resolve(recordings)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun deleteRecording(path: String, promise: Promise) {
        try {
            val file = File(path)
            if (file.exists() && file.delete()) {
                promise.resolve(true)
            } else {
                promise.reject("ERROR", "Failed to delete recording")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun deleteAllRecordings(promise: Promise) {
        try {
            val dir = File(
                reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES),
                "CamStreamRecordings"
            )

            if (dir.exists()) {
                dir.listFiles()?.forEach { it.delete() }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun playVideo(path: String, promise: Promise) {
        try {
            val file = File(path)
            
            if (!file.exists()) {
                promise.reject("ERROR", "File not found")
                return
            }
            
            if (file.length() == 0L) {
                promise.reject("ERROR", "File is empty")
                return
            }

            // Use content URI directly for external files path
            val uri: Uri = try {
                FileProvider.getUriForFile(
                    reactApplicationContext,
                    "${reactApplicationContext.packageName}.fileprovider",
                    file
                )
            } catch (e: Exception) {
                // Fallback to file URI
                Uri.fromFile(file)
            }

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "video/mp4")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            reactApplicationContext.startActivity(intent)
            promise.resolve(true)

        } catch (e: Exception) {
            promise.reject("ERROR", "Play failed: ${e.message}")
        }
    }

    @ReactMethod
    fun getRecordingsDirectory(promise: Promise) {
        try {
            val dir = File(
                reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_MOVIES),
                "CamStreamRecordings"
            )
            promise.resolve(dir.absolutePath)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}