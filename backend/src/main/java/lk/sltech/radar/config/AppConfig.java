package lk.sltech.radar.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.time.Duration;
import java.util.concurrent.Executor;

/**
 * Async executor for the Saturday pipeline + Caffeine caches.
 * Caches: "draftCache" (content-addressed drafts), "tavilyCache" (query+week search results).
 */
@Configuration
@EnableAsync
@EnableCaching
public class AppConfig {

    @Bean(name = "pipelineExecutor")
    public Executor pipelineExecutor() {
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
        ex.setCorePoolSize(2);
        ex.setMaxPoolSize(4);
        ex.setQueueCapacity(16);
        ex.setThreadNamePrefix("radar-pipeline-");
        ex.initialize();
        return ex;
    }

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager mgr = new CaffeineCacheManager();
        mgr.setCaffeine(Caffeine.newBuilder()
                .maximumSize(1_000)
                .expireAfterWrite(Duration.ofDays(30)));
        // Per-cache tuning: drafts and Tavily results both live ~ a month (weekly workload).
        mgr.registerCustomCache("draftCache", Caffeine.newBuilder()
                .maximumSize(500).expireAfterWrite(Duration.ofDays(30)).build());
        mgr.registerCustomCache("tavilyCache", Caffeine.newBuilder()
                .maximumSize(1_000).expireAfterWrite(Duration.ofDays(7)).build());
        return mgr;
    }
}
