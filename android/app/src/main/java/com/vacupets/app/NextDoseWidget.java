package com.vacupets.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Widget "próxima dosis": nombre de la mascota, qué toca y en cuántos días.
 * Los datos los escribe WidgetPlugin (SharedPreferences "vacupet_widget");
 * tocar el widget abre la app.
 */
public class NextDoseWidget extends AppWidgetProvider {

  @Override
  public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
    for (int id : ids) mgr.updateAppWidget(id, build(context));
  }

  static void refreshAll(Context ctx) {
    AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
    int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, NextDoseWidget.class));
    if (ids != null) for (int id : ids) mgr.updateAppWidget(id, build(ctx));
  }

  private static RemoteViews build(Context ctx) {
    SharedPreferences sp = ctx.getSharedPreferences("vacupet_widget", Context.MODE_PRIVATE);
    RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_next_dose);

    String pet = sp.getString("pet", "");
    String dose = sp.getString("dose", "");
    String date = sp.getString("date", "");
    String days = sp.getString("days", "");

    if (pet == null || pet.isEmpty()) {
      rv.setTextViewText(R.id.w_days, "🐾");
      rv.setTextViewText(R.id.w_title, ctx.getString(R.string.widget_empty));
      rv.setTextViewText(R.id.w_sub, "");
    } else if (days == null || days.isEmpty() || "✓".equals(days)) {
      rv.setTextViewText(R.id.w_days, "✓");
      rv.setTextViewText(R.id.w_title, pet);
      rv.setTextViewText(R.id.w_sub, dose);
    } else {
      rv.setTextViewText(R.id.w_days, days);
      rv.setTextViewText(R.id.w_title, pet + " · " + dose);
      rv.setTextViewText(R.id.w_sub, date);
    }

    Intent i = new Intent(ctx, MainActivity.class);
    PendingIntent pi = PendingIntent.getActivity(
        ctx, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    rv.setOnClickPendingIntent(R.id.w_root, pi);
    return rv;
  }
}
