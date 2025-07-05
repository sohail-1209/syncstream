package com.syncstream.app;

import android.app.Activity;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.PluginResult;

@CapacitorPlugin(name = "ScreenShare")
public class ScreenSharePlugin extends Plugin {

    private static final int SCREEN_CAPTURE_REQUEST_CODE = 1001;
    private PluginCall savedCall;

    @PluginMethod
    public void start(PluginCall call) {
        savedCall = call;
        Activity activity = getActivity();
        MediaProjectionManager projectionManager =
                (MediaProjectionManager) activity.getSystemService(Activity.MEDIA_PROJECTION_SERVICE);
        Intent captureIntent = projectionManager.createScreenCaptureIntent();
        startActivityForResult(call, captureIntent, "handleScreenCaptureResult");
    }

    @ActivityCallback
    private void handleScreenCaptureResult(PluginCall call, Activity activity, int resultCode, Intent data) {
        if (resultCode == Activity.RESULT_OK) {
            call.resolve();
        } else {
            call.reject("Screen capture permission denied");
        }
    }
}
