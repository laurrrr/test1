package com.wifimap.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import androidx.core.content.ContextCompat
import org.json.JSONObject

/**
 * JavaScript bridge exposed to the web app as `window.WifiNative`.
 * Supplies real Wi-Fi radio telemetry from WifiManager: SSID, BSSID, RSSI,
 * link speeds, frequency/channel/band, channel width, Wi-Fi standard and
 * security — the data a browser alone can never access.
 */
class WifiBridge(
    private val context: Context,
    private val onPrint: () -> Unit
) {

    private val mainHandler = Handler(Looper.getMainLooper())

    private fun hasLocationPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    @JavascriptInterface
    fun hasPermissions(): Boolean = hasLocationPermission()

    /** Returns a JSON snapshot of the currently connected Wi-Fi network. */
    @JavascriptInterface
    fun getWifiInfo(): String {
        val out = JSONObject()
        try {
            if (!hasLocationPermission()) {
                return out.put("available", false).put("reason", "permission").toString()
            }
            val wm = context.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager
            if (!wm.isWifiEnabled) {
                return out.put("available", false).put("reason", "wifi_disabled").toString()
            }
            // connectionInfo is deprecated since API 31 in favour of
            // NetworkCallback, but remains the simplest synchronous snapshot
            // and is fully functional for this use case.
            @Suppress("DEPRECATION")
            val info = wm.connectionInfo
            if (info == null || info.bssid == null || info.networkId == -1) {
                return out.put("available", false).put("reason", "not_connected").toString()
            }

            val rawSsid = info.ssid?.removeSurrounding("\"") ?: ""
            val ssid = if (rawSsid == "<unknown ssid>") "" else rawSsid
            val freq = info.frequency

            out.put("available", true)
            out.put("ssid", ssid)
            out.put("bssid", info.bssid ?: "")
            out.put("rssi", info.rssi)
            out.put("signalPercent", signalPercent(wm, info.rssi))
            out.put("linkSpeedMbps", info.linkSpeed)
            if (Build.VERSION.SDK_INT >= 29) {
                out.put("txLinkSpeedMbps", info.txLinkSpeedMbps)
                out.put("rxLinkSpeedMbps", info.rxLinkSpeedMbps)
            }
            out.put("frequencyMhz", freq)
            out.put("channel", frequencyToChannel(freq))
            out.put("band", bandName(freq))
            if (Build.VERSION.SDK_INT >= 30) {
                out.put("standard", standardName(info.wifiStandard))
            }

            // Channel width + security come from the scan result that matches
            // the AP we're connected to.
            val scan = try {
                @Suppress("DEPRECATION")
                wm.scanResults.firstOrNull { it.BSSID.equals(info.bssid, ignoreCase = true) }
            } catch (e: SecurityException) {
                null
            }
            if (scan != null) {
                out.put("width", widthName(scan.channelWidth))
                out.put("security", securityName(scan.capabilities))
            }
        } catch (e: Exception) {
            return JSONObject().put("available", false)
                .put("reason", e.message ?: "error").toString()
        }
        return out.toString()
    }

    /** Routes the web app's certificate download to the Android print dialog. */
    @JavascriptInterface
    fun printPage() {
        mainHandler.post { onPrint() }
    }

    private fun signalPercent(wm: WifiManager, rssi: Int): Int =
        if (Build.VERSION.SDK_INT >= 30) {
            val max = wm.maxSignalLevel
            if (max > 0) wm.calculateSignalLevel(rssi) * 100 / max else 0
        } else {
            @Suppress("DEPRECATION")
            WifiManager.calculateSignalLevel(rssi, 101)
        }

    private fun frequencyToChannel(freq: Int): Int = when {
        freq == 2484 -> 14
        freq in 2412..2472 -> (freq - 2407) / 5
        freq in 5160..5905 -> (freq - 5000) / 5
        freq in 5955..7115 -> (freq - 5950) / 5
        else -> -1
    }

    private fun bandName(freq: Int): String = when {
        freq in 2400..2500 -> "2.4 GHz"
        freq in 4900..5925 -> "5 GHz"
        freq > 5925 -> "6 GHz"
        else -> ""
    }

    private fun standardName(standard: Int): String = when (standard) {
        ScanResult.WIFI_STANDARD_11N -> "Wi-Fi 4 (802.11n)"
        ScanResult.WIFI_STANDARD_11AC -> "Wi-Fi 5 (802.11ac)"
        ScanResult.WIFI_STANDARD_11AX -> "Wi-Fi 6 (802.11ax)"
        8 -> "Wi-Fi 7 (802.11be)" // ScanResult.WIFI_STANDARD_11BE, API 33+
        ScanResult.WIFI_STANDARD_LEGACY -> "802.11a/b/g"
        else -> ""
    }

    private fun widthName(width: Int): String = when (width) {
        ScanResult.CHANNEL_WIDTH_20MHZ -> "20 MHz"
        ScanResult.CHANNEL_WIDTH_40MHZ -> "40 MHz"
        ScanResult.CHANNEL_WIDTH_80MHZ -> "80 MHz"
        ScanResult.CHANNEL_WIDTH_160MHZ -> "160 MHz"
        ScanResult.CHANNEL_WIDTH_80MHZ_PLUS_MHZ -> "80+80 MHz"
        5 -> "320 MHz" // ScanResult.CHANNEL_WIDTH_320MHZ, API 33+
        else -> ""
    }

    private fun securityName(capabilities: String): String = when {
        capabilities.contains("SAE") || capabilities.contains("WPA3") -> "WPA3"
        capabilities.contains("WPA2") || capabilities.contains("RSN") -> "WPA2"
        capabilities.contains("WPA") -> "WPA"
        capabilities.contains("WEP") -> "WEP"
        else -> "Open"
    }
}
