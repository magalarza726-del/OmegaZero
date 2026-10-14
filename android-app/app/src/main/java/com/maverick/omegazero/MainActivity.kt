package com.maverick.omegazero

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Toast
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import java.nio.charset.StandardCharsets

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private var pendingDownload: PendingDownload? = null

    private val assetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    data class PendingDownload(
        val filename: String,
        val text: String,
        val mime: String
    )

    inner class AndroidBridge {
        @JavascriptInterface
        fun saveText(filename: String, text: String, mime: String) {
            runOnUiThread {
                launchSaveDocument(filename, text, mime)
            }
        }

        @JavascriptInterface
        fun platform(): String = "android-offline"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = Color.rgb(7, 17, 31)
        window.navigationBarColor = Color.rgb(2, 7, 11)

        webView = WebView(this)
        webView.setBackgroundColor(Color.rgb(2, 7, 11))
        setContentView(webView)

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(false)
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setGeolocationEnabled(false)
        }

        webView.addJavascriptInterface(AndroidBridge(), "OmegaZeroAndroid")
        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val uri = request.url
                return uri.scheme != "https" || uri.host != APP_HOST
            }
        }

        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    @Suppress("DEPRECATION")
    private fun launchSaveDocument(filename: String, text: String, mime: String) {
        val safeName = filename
            .replace(Regex("[\\/:*?\"<>|]"), "_")
            .ifBlank { "OmegaZero.txt" }
        val safeMime = mime.substringBefore(';').ifBlank { "text/plain" }
        pendingDownload = PendingDownload(safeName, text, safeMime)

        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = safeMime
            putExtra(Intent.EXTRA_TITLE, safeName)
        }
        startActivityForResult(intent, REQUEST_SAVE_TEXT)
    }

    @Deprecated("Compatibilidad con ACTION_CREATE_DOCUMENT en la Activity mínima.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_SAVE_TEXT) return

        val pending = pendingDownload
        pendingDownload = null
        if (resultCode != RESULT_OK || pending == null) return

        val uri: Uri = data?.data ?: return
        runCatching {
            contentResolver.openOutputStream(uri, "w")?.use { stream ->
                stream.write(pending.text.toByteArray(StandardCharsets.UTF_8))
            } ?: error("No se pudo abrir el archivo de destino")
        }.onSuccess {
            Toast.makeText(this, "Archivo guardado", Toast.LENGTH_SHORT).show()
        }.onFailure {
            Toast.makeText(this, "No se pudo guardar el archivo", Toast.LENGTH_LONG).show()
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.removeJavascriptInterface("OmegaZeroAndroid")
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }

    companion object {
        private const val APP_HOST = "appassets.androidplatform.net"
        private const val APP_URL = "https://appassets.androidplatform.net/assets/www/index.html"
        private const val REQUEST_SAVE_TEXT = 726
    }
}
