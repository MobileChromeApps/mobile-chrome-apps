package org.apache.cordova;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Scanner;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.cordova.api.CallbackContext;
import org.apache.cordova.api.CordovaInterface;
import org.apache.cordova.api.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.content.Context;
import android.content.res.AssetManager;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;

public class ChromeI18n extends CordovaPlugin implements ChromeExtensionURLs.RequestModifyInterface {

    private static final String LOG_TAG = "ChromeI18n";
    // Ensure we register with Chrome Extension Urls just once
    private static ChromeI18n registeredInstance = null;
    // Choose a priority for org.apache.cordova.ChromeExtensionURLs. This should be unique for any plugin that wants to register
    private final int CHROME_EXTENSION_URL_PRIORITY = 1000;
    // Save the locale chain so we don't have to recalculate each time
    private List<String> chosenLocales;
    // Save any retrieved message.json contents in memory so that we don't have to retrieve it again
    private Map<String, JSONObject> memoizedJsonContents = new HashMap<String, JSONObject>();
    // The pattern of any messages we need to replace
    private Pattern patterRegex = Pattern.compile("__MSG_(@@)?[a-zA-Z0-9_-]*__");

    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);
        // Unregister any old ChromeI18n objects. This should not be required as Cordova maintains a single instance of each plugin
        if(registeredInstance != null) {
            if (ChromeExtensionURLs.unregisterInterfaceAtPriority(registeredInstance, CHROME_EXTENSION_URL_PRIORITY)) {
                registeredInstance = null;
            } else {
                throw new IllegalArgumentException("Unable to unregister the existing interface at priority : " + CHROME_EXTENSION_URL_PRIORITY
                    + ". Possible duplication of priority by multiple plugins");
            }
        }
        if(ChromeExtensionURLs.registerInterfaceAtPriority(this, CHROME_EXTENSION_URL_PRIORITY)) {
            registeredInstance = this;
        } else {
            throw new IllegalArgumentException("Unable to register the interface at priority : " + CHROME_EXTENSION_URL_PRIORITY
                + ". Possible duplication of priority by multiple plugins");
        }
    }

    @Override
    public boolean execute(String action, CordovaArgs args, final CallbackContext callbackContext) throws JSONException {
        if ("getAcceptLanguages".equals(action)) {
            getAcceptLanguages(args, callbackContext);
            return true;
        }

        return false;
    }

    private void getAcceptLanguages(final CordovaArgs args, final CallbackContext callbackContext) {
        try {
            JSONArray ret = new JSONArray();
            Locale locale = Locale.getDefault();
            String localString = locale.toString().replace('_', '-'); 
            ret.put(localString);
            callbackContext.success(ret);
        } catch (Exception e) {
            callbackContext.error("Could not retrieve supported locales");
            Log.e(LOG_TAG, "Could not retrieve supported locales", e);
        }
    }

    @Override
    public String modifyNewRequestUrl(String url) {
        return replacePatternsInLine(url);
    }

    @Override
    public InputStream modifyResponseInputStream(String url, InputStream is) {
        String cleanUrl = url.split("\\?")[0].split("#")[0];
        String[] urlParts = cleanUrl.split("/");
        String fileName = urlParts[urlParts.length - 1];

        try {
            if (fileName.endsWith(".css") || fileName.equals("manifest.json")) {
                is = replaceI18nPlaceholders(is);
            }
        } catch (IOException ioe) {
            Log.e(LOG_TAG, "Error occurred while replacing i18n Tags in file: " + fileName, ioe);
            // If an error occurs, unlocalized content is returned
        }
        return is;
    }

    private InputStream replaceI18nPlaceholders(InputStream is) throws IOException {
        // Process the input stream line by line
        // Default byte array size is 32 bytes. Use something more reasonable for web resources - 32K
        int defaultByteArraySize = 32768;
        String ls = System.getProperty("line.separator");
        ByteArrayOutputStream os = new ByteArrayOutputStream(defaultByteArraySize);
        String line = null;
        BufferedReader reader = new BufferedReader(new InputStreamReader(is));
        while((line = reader.readLine()) != null) {
            line = replacePatternsInLine(line);
            // Note the last line might get an extra \n pushed in. This shouldn't affect the loading of web resources
            os.write((line + ls).getBytes());
        }
        return new ByteArrayInputStream(os.toByteArray());
    }

    private String replacePatternsInLine(String line) {
        try {
            Matcher matcher = patterRegex.matcher(line);
            StringBuilder constructedLine = new StringBuilder();
            int currStart = 0;

            while (currStart < line.length() && matcher.find(currStart)) {
                String preString = line.substring(currStart, matcher.start());
                String match = matcher.group();

                constructedLine.append(preString);
                constructedLine.append(getReplacement(match));
                currStart = matcher.end();
            }
            //get the remaining piece
            constructedLine.append(line.substring(currStart));

            return constructedLine.toString();
        } catch (Exception e) {
            Log.e(LOG_TAG, "An error occurred during the i18n of line : " + line, e);
            // Return the line itself as it is a more graceful fallback than return nothing 
            return line;
        }
    }

    private String getReplacement(String match) {
        // get the message from __MSG_messagename__
        String messageName = match.substring(6, match.length() - 2).toLowerCase();
        if(messageName.startsWith("@@")){
            if("@@extension_id".equals(messageName)) {
                return "{appId}";
            } else if("@@ui_locale".equals(messageName)) {
                return Locale.getDefault().toString();
            } else if("@@bidi_dir".equals(messageName)) {
                return (TextUtils.getLayoutDirectionFromLocale(Locale.getDefault()) == View.LAYOUT_DIRECTION_RTL)? "rtl" : "ltr";
            } else if("@@bidi_reversed_dir".equals(messageName)) {
                return (TextUtils.getLayoutDirectionFromLocale(Locale.getDefault()) == View.LAYOUT_DIRECTION_RTL)? "ltr" : "rtl";
            } else if("@@bidi_start_edge".equals(messageName)) {
                return (TextUtils.getLayoutDirectionFromLocale(Locale.getDefault()) == View.LAYOUT_DIRECTION_RTL)? "right" : "left";
            } else if("@@bidi_end_edge".equals(messageName)) {
                return (TextUtils.getLayoutDirectionFromLocale(Locale.getDefault()) == View.LAYOUT_DIRECTION_RTL)? "left" : "right";
            }
        }

        // Look for replacement in messages.json files
        List<String> localeChain = getLocalesToUse();
        JSONObject messageObject = getMessageFromMessageJson(messageName, localeChain);
        if(messageObject != null) {
            String ret = messageObject.optString("message");
            if (ret != null) {
                return ret;
            }
        }
        // Didn't find a match, just return string as is
        return match;
    }

    private List<String> getLocalesToUse() {
        try {
            if(chosenLocales == null) {
                List<String> localesToUse = new ArrayList<String>();
                String windowLocale = Locale.getDefault().toString().toLowerCase().replace('-', '_');
                localesToUse.add(windowLocale);

                // Construct fallback chain
                int lastIndex;
                while((lastIndex = windowLocale.lastIndexOf('_')) != -1) {
                    windowLocale = windowLocale.substring(0, lastIndex);
                    localesToUse.add(windowLocale);
                }
                String defaultLocale = getDefaultLocale();
                if(!localesToUse.contains(defaultLocale)) {
                    localesToUse.add(defaultLocale);
                }

                chosenLocales = new ArrayList<String>();
                for(int i = 0; i < localesToUse.size(); i++) {
                    String currentLocale = localesToUse.get(i);
                    if(isLocaleAvailable(currentLocale)) {
                        chosenLocales.add(currentLocale);
                    }
                }
            }
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error occurred while retrieving usable locales", e);
        }
        return chosenLocales;
    }

    private JSONObject getMessageFromMessageJson(String messageName, List<String> localeChain) {
        try {
            for(int i = 0; i < localeChain.size(); i++) {
                String locale = localeChain.get(i);
                if (memoizedJsonContents.get(locale) == null) {
                    String fileName = "www/locales/" + locale + "/messages.json";
                    JSONObject contents = getAssetContents(fileName);
                    // convert all fields to lower case to check case insensitively
                    contents = toLowerCaseMessage(contents);
                    memoizedJsonContents.put(locale, contents);
                }
                JSONObject ret = memoizedJsonContents.get(locale).optJSONObject(messageName);
                if(ret != null) {
                    return ret;
                }
            }
        } catch (Exception e) {
            Log.e(LOG_TAG, "Error occurred while reading through the messages.json files", e);
        }
        return null;
    }

    private JSONObject toLowerCaseMessage(JSONObject contents) throws JSONException {
        List<String> messages = JSONUtils.toStringList(contents.names());
        for(String message : messages) {
            JSONObject value = contents.getJSONObject(message);
            contents.remove(message);
            contents.put(message.toLowerCase(), value);
        }
        return contents;
    }

    private boolean isLocaleAvailable(String locale) throws IOException {
        List<String> availableLocales = new ArrayList<String>();
        AssetManager am = this.cordova.getActivity().getAssets();
        String[] localesArr = am.list("www/locales");
        for(String currLocale : localesArr) {
            try {
                // Check that the manifest.json exists
                InputStream is = am.open("www/locales/" + currLocale + "/messages.json");
                is.close();
                availableLocales.add(currLocale);
            } catch (IOException e) { /* Suppress not found exceptions */ }
        }
        return availableLocales.contains(locale);
    }

    private String getDefaultLocale() throws JSONException, IOException {
        JSONObject manifestContents = getAssetContents("www/manifest.json");
        String defaultLocale = manifestContents.optString("default_locale");
        if(defaultLocale == null) {
            throw new IllegalArgumentException("Default Locale not defined");
        }
        return defaultLocale;
    }

    private JSONObject getAssetContents(String assetName) throws IOException, JSONException {
        Context context = this.cordova.getActivity();
        InputStream is = context.getAssets().open(assetName);
        //Small trick to get the scanner to pull the entire input stream in one go
        Scanner s = new java.util.Scanner(is).useDelimiter("\\A");
        String contents = s.hasNext() ? s.next() : "";
        return new JSONObject(contents);
    }
}
