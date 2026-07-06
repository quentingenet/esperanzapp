package com.quentingenet.esperanzapp;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ExactAlarm")
public class ExactAlarmPlugin extends Plugin {

    @PluginMethod
    public void canScheduleExactAlarms(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            result.put("value", am != null && am.canScheduleExactAlarms());
        } else {
            result.put("value", true);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(
                Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.fromParts("package", getContext().getPackageName(), null)
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }
}
