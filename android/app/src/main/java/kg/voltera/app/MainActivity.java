package kg.voltera.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Настройка edge-to-edge для Android 15+ совместимости
        // Не используем устаревшие setStatusBarColor/setNavigationBarColor (deprecated в Android 15)
        Window window = getWindow();

        // Включаем edge-to-edge режим для всех версий Android
        WindowCompat.setDecorFitsSystemWindows(window, false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ (API 30+): используем современный WindowInsetsController
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                // Светлые иконки статус-бара для темного фона (или наоборот - настраивается в CSS/JS)
                controller.setSystemBarsAppearance(
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                );
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Android 6-10 (API 23-29): используем флаги для светлого статус-бара
            View decorView = window.getDecorView();
            int flags = decorView.getSystemUiVisibility();
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            decorView.setSystemUiVisibility(flags);
        }

        // Примечание: Цвет system bars теперь управляется через CSS/Capacitor плагины
        // setStatusBarColor() и setNavigationBarColor() устарели в Android 15
    }
}
