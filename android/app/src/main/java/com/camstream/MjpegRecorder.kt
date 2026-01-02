package com.camstream

import android.os.Environment
import android.util.Log
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFmpegSession
import com.arthenica.ffmpegkit.ReturnCode
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

object MjpegRecorder {
    private const val TAG = "MjpegRecorder"
    private var currentSession: FFmpegSession? = null
    private var currentOutputPath: String? = null
    private var isRecording = false
    private var recordingStartTime: Long = 0

    fun startRecording(context: android.content.Context, streamUrl: String): String? {
        if (isRecording) {
            Log.w(TAG, "Already recording")
            return currentOutputPath
        }

        try {
            val recordingsDir = File(
                context.getExternalFilesDir(Environment.DIRECTORY_MOVIES),
                "CamStreamRecordings"
            )
            if (!recordingsDir.exists()) {
                recordingsDir.mkdirs()
            }

            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
            val outputFile = File(recordingsDir, "recording_$timestamp.mp4")
            currentOutputPath = outputFile.absolutePath

            // Fixed FFmpeg command:
            // -r 15: Set input frame rate (adjust based on your camera's FPS)
            // -i: input URL
            // -c:v libx264: H.264 codec
            // -preset ultrafast: fast encoding
            // -crf 23: quality
            // -r 30: output frame rate
            // -vsync cfr: constant frame rate
            // -pix_fmt yuv420p: pixel format for compatibility
            val command = "-r 15 -i \"$streamUrl\" -c:v libx264 -preset ultrafast -crf 23 -r 30 -vsync cfr -pix_fmt yuv420p -t 86400 \"${currentOutputPath}\""

            Log.d(TAG, "Starting recording: $command")

            currentSession = FFmpegKit.executeAsync(command) { session ->
                val returnCode = session.returnCode

                when {
                    ReturnCode.isSuccess(returnCode) -> {
                        Log.d(TAG, "Recording completed successfully")
                    }
                    ReturnCode.isCancel(returnCode) -> {
                        Log.d(TAG, "Recording cancelled")
                    }
                    else -> {
                        Log.e(TAG, "Recording failed with code: ${returnCode?.value}")
                        Log.e(TAG, "Output: ${session.output}")
                    }
                }

                isRecording = false
            }

            isRecording = true
            recordingStartTime = System.currentTimeMillis()

            return currentOutputPath
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start recording", e)
            return null
        }
    }

    fun stopRecording(): String? {
        if (!isRecording) {
            Log.w(TAG, "Not recording")
            return null
        }

        try {
            currentSession?.cancel()

            isRecording = false
            val outputPath = currentOutputPath
            currentOutputPath = null
            currentSession = null

            Thread.sleep(1000)  // Wait for file to finalize

            val file = File(outputPath ?: "")
            if (file.exists() && file.length() > 0) {
                Log.d(TAG, "Recording saved: $outputPath (${file.length()} bytes)")
                return outputPath
            } else {
                Log.w(TAG, "Recording file is empty or missing")
                return null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop recording", e)
            return null
        }
    }

    fun isRecording(): Boolean = isRecording

    fun getRecordingDuration(): Long {
        return if (isRecording) {
            System.currentTimeMillis() - recordingStartTime
        } else {
            0
        }
    }
}