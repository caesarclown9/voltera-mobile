package kg.evpower.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Правильная настройка edge-to-edge для Android
        Window window = getWindow();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ (API 30+)
            // Используем WindowInsetsController для управления system bars
            WindowCompat.setDecorFitsSystemWindows(window, false);

            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                // Делаем статус-бар прозрачным, но НЕ скрываем его
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }

            // Устанавливаем прозрачные цвета для system bars
            window.setStatusBarColor(android.graphics.Color.TRANSPARENT);
            window.setNavigationBarColor(android.graphics.Color.TRANSPARENT);

            // Контент может рисоваться под system bars, но с правильными insets
            window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
        } else {
            // Android 10 и ниже (API 29 и ниже)
            WindowCompat.setDecorFitsSystemWindows(window, false);

            window.setStatusBarColor(android.graphics.Color.TRANSPARENT);
            window.setNavigationBarColor(android.graphics.Color.TRANSPARENT);

            window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
        }
    }
}
