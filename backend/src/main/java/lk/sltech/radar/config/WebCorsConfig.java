package lk.sltech.radar.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allows the hosted frontend (GitHub Pages) and local dev to call the API
 * from the browser. Origins are configurable via APP_CORS_ORIGINS.
 */
@Configuration
public class WebCorsConfig implements WebMvcConfigurer {

    @Value("${APP_CORS_ORIGINS:https://sujanthan242.github.io,http://localhost:3000}")
    private String corsOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(corsOrigins.split(","))
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .maxAge(3600);
    }
}
