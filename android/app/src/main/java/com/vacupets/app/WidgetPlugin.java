package com.vacupets.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Puente webview → widget: la app guarda la "próxima dosis" en SharedPreferences
 * y refresca el widget de pantalla de inicio. Lo llama updateWidget() en el JS
 * después de cada guardado.
 */
@CapacitorPlugin(name = "VacuWidget")
public class WidgetPlugin extends Plugin {

  @PluginMethod
  public void update(PluginCall call) {
    Context ctx = getContext();
    SharedPreferences.Editor ed =
        ctx.getSharedPreferences("vacupet_widget", Context.MODE_PRIVATE).edit();
    ed.putString("pet", call.getString("pet", ""));
    ed.putString("dose", call.getString("dose", ""));
    ed.putString("date", call.getString("date", ""));
    ed.putString("days", call.getString("days", ""));
    ed.putString("state", call.getString("state", "aldia"));
    ed.apply();
    NextDoseWidget.refreshAll(ctx);
    call.resolve();
  }
}
