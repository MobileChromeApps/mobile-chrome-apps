package com.google.cordova;

import org.apache.cordova.Config;
import org.apache.cordova.CordovaActivity;
import org.apache.cordova.CordovaChromeClient;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaWebView;

import android.annotation.SuppressLint;
import android.os.Message;
import android.util.Log;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings.LayoutAlgorithm;

public class ChromeChromeClient extends CordovaChromeClient {
    
    public ChromeChromeClient(CordovaInterface cordova) {
		super(cordova);
	}

    public ChromeChromeClient(CordovaInterface ctx, CordovaWebView app) {
    	super(ctx, app);
        app.getSettings().setSupportMultipleWindows(true);
    }

	@SuppressWarnings("unused")
	private WebView backgroundWebView = null;

    @SuppressLint({ "NewApi", "SetJavaScriptEnabled" })
    public boolean onCreateWindow (WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
    	CordovaActivity act = (CordovaActivity)this.cordova.getActivity();
    	WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;

    	final WebView newWebView = new WebView(act);

    	newWebView.setWebViewClient(new WebViewClient(){
    		@Override
    		public WebResourceResponse shouldInterceptRequest(final WebView view, String url) {
    			if (Config.isUrlWhiteListed(url)) {
        			Log.d("WhitelistCheck", "Fail: " + url);
    				return super.shouldInterceptRequest(view, url);
    			}
    			Log.d("WhitelistCheck", "Pass: " + url);
    			return new WebResourceResponse(null, null, null);
    		}
    		@Override
    		public boolean shouldOverrideUrlLoading(WebView view, String url) {
    			String payload = "<html>hu<script>opener.XMLHttpRequest=XMLHttpRequest;opener.onChromeCorsReady();</script></html>";
    			newWebView.loadDataWithBaseURL("file:///hi.html", payload, "text/html", "UTF-8", "file:///hi.html");
    			return true;
    		}
    	});
    	WebSettings settings = newWebView.getSettings();
    	settings.setJavaScriptEnabled(true);
    	settings.setAllowFileAccess(true);
    	if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.JELLY_BEAN) {
    		settings.setAllowUniversalAccessFromFileURLs(true);
    	}

    	// Make it visible in the application layout
    	//act.root.addView(newWebView, 0);

    	// Hold on to this webView so it doesn't get GC'd
    	backgroundWebView = newWebView;

    	transport.setWebView(newWebView);
    	resultMsg.sendToTarget();
    	return true;
    }

}
