package com.camstream

import android.content.Intent
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.*
import java.net.HttpURLConnection
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.URL
import java.util.Collections
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

class HotspotModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "HotspotModule"
    }

    override fun getName() = "HotspotModule"

    @ReactMethod
    fun findCamDevice(promise: Promise) {
        Thread {
            try {
                Log.d(TAG, "========== Finding Cam Device ==========")

                // Step 1: Get phone's IP and subnet
                val subnets = getPhoneSubnets()
                
                Log.d(TAG, "Subnets to scan: $subnets")

                if (subnets.isEmpty()) {
                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("found", false)
                        putString("error", "No network found. Is hotspot enabled?")
                    })
                    return@Thread
                }

                // Step 2: Scan each subnet for port 5000
                for (subnet in subnets) {
                    Log.d(TAG, "Scanning $subnet.x for port 5000...")
                    
                    val foundIp = scanSubnet(subnet)
                    
                    if (foundIp != null) {
                        Log.d(TAG, "✓ Found cam at: $foundIp")
                        promise.resolve(Arguments.createMap().apply {
                            putBoolean("found", true)
                            putString("ip", foundIp)
                        })
                        return@Thread
                    }
                }

                Log.d(TAG, "✗ Cam not found")
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("found", false)
                })

            } catch (e: Exception) {
                Log.e(TAG, "Error: ${e.message}")
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("found", false)
                    putString("error", e.message)
                })
            }
        }.start()
    }

    private fun getPhoneSubnets(): List<String> {
        val subnets = mutableSetOf<String>()
        
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            
            for (intf in Collections.list(interfaces)) {
                val name = intf.name.lowercase()
                
                Log.d(TAG, "Interface: $name")
                
                for (addr in Collections.list(intf.inetAddresses)) {
                    if (addr is Inet4Address && !addr.isLoopbackAddress) {
                        val ip = addr.hostAddress ?: continue
                        val subnet = ip.substringBeforeLast(".")
                        
                        Log.d(TAG, "  IP: $ip → Subnet: $subnet")
                        
                        if (!subnet.startsWith("127")) {
                            subnets.add(subnet)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting subnets: ${e.message}")
        }
        
        return subnets.toList()
    }

    private fun scanSubnet(subnet: String): String? {
        val foundIp = AtomicReference<String?>(null)
        val executor = Executors.newFixedThreadPool(25)

        // Scan .2 to .50 (skip .1 which is usually the hotspot host)
        for (i in 2..50) {
            if (foundIp.get() != null) break
            
            val ip = "$subnet.$i"
            
            executor.submit {
                if (foundIp.get() == null && isPort5000Open(ip)) {
                    foundIp.set(ip)
                }
            }
        }

        executor.shutdown()
        try {
            executor.awaitTermination(15, TimeUnit.SECONDS)
        } catch (e: Exception) {
            Log.e(TAG, "Scan timeout")
        }

        return foundIp.get()
    }

    private fun isPort5000Open(ip: String): Boolean {
        return try {
            val url = URL("http://$ip:5000/")
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 600
            connection.readTimeout = 600
            connection.requestMethod = "GET"

            val code = connection.responseCode
            connection.disconnect()

            Log.d(TAG, "$ip:5000 → $code")
            
            // Any HTTP response means server is there
            code in 100..599
        } catch (e: Exception) {
            false
        }
    }

    @ReactMethod
    fun getPhoneIp(promise: Promise) {
        Thread {
            try {
                val result = Arguments.createArray()
                val interfaces = NetworkInterface.getNetworkInterfaces()
                
                for (intf in Collections.list(interfaces)) {
                    for (addr in Collections.list(intf.inetAddresses)) {
                        if (addr is Inet4Address && !addr.isLoopbackAddress) {
                            val ip = addr.hostAddress
                            
                            result.pushMap(Arguments.createMap().apply {
                                putString("ip", ip)
                                putString("interface", intf.name)
                                putString("subnet", ip?.substringBeforeLast("."))
                            })
                        }
                    }
                }
                
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERROR", e.message)
            }
        }.start()
    }

    @ReactMethod
    fun openHotspotSettings(promise: Promise) {
        try {
            val intent = Intent("android.settings.TETHERING_SETTINGS")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            try {
                val intent = Intent()
                intent.setClassName("com.android.settings", "com.android.settings.TetherSettings")
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } catch (e2: Exception) {
                try {
                    val intent = Intent(Settings.ACTION_WIRELESS_SETTINGS)
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    reactApplicationContext.startActivity(intent)
                    promise.resolve(true)
                } catch (e3: Exception) {
                    promise.reject("ERROR", "Could not open settings")
                }
            }
        }
    }
}