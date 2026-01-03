package com.camstream

import android.os.Environment
import android.util.Log
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFmpegSession
import com.arthenica.ffmpegkit.ReturnCode
import java.io.File
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

object MjpegRecorder {
    private const val TAG = "MjpegRecorder"
    private var currentSession: FFmpegSession? = null
    private var currentOutputPath: String? = null
    private var isRecording = false
    private var recordingStartTime: Long = 0
    private var sessionCompleteLatch: CountDownLatch? = null

    fun startRecording(context: android.content.Context, streamUrl: String): String? {
        if (isRecording) {
            Log.w(TAG, "Already recording")
            return currentOutputPath
        }

        try {
            // Cancel any lingering sessions first
            FFmpegKit.cancel()

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

            sessionCompleteLatch = CountDownLatch(1)

            val command = "-i \"$streamUrl\" " +
                    "-c:v libx264 -preset ultrafast -crf 23 " +
                    "-vsync vfr -pix_fmt yuv420p " +
                    "-movflags frag_keyframe+empty_moov+faststart " +
                    "-t 86400 \"${currentOutputPath}\""

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
                sessionCompleteLatch?.countDown()
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
            Log.d(TAG, "Stopping recording...")
            
            val outputPath = currentOutputPath

            // Cancel current session
            currentSession?.cancel()
            
            // Wait for callback
            val completed = sessionCompleteLatch?.await(5, TimeUnit.SECONDS) ?: false
            Log.d(TAG, "FFmpeg callback completed: $completed")

            // Force cancel ALL FFmpeg sessions
            FFmpegKit.cancel()
            
            // Clear references
            isRecording = false
            currentOutputPath = null
            currentSession = null
            sessionCompleteLatch = null

            // Wait for file system to flush
            Thread.sleep(2000)

            // Force garbage collection to release file handles
            System.gc()
            
            Thread.sleep(500)

            val file = File(outputPath ?: "")
            if (file.exists() && file.length() > 0) {
                Log.d(TAG, "Recording saved: $outputPath (${file.length()} bytes)")
                return outputPath
            } else {
                Log.w(TAG, "Recording file is empty or missing")
                file.delete()
                return null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop recording", e)
            isRecording = false
            FFmpegKit.cancel()
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