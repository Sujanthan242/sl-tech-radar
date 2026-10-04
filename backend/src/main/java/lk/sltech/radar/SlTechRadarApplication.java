package lk.sltech.radar;

import lk.sltech.radar.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class SlTechRadarApplication {

    public static void main(String[] args) {
        SpringApplication.run(SlTechRadarApplication.class, args);
    }
}
