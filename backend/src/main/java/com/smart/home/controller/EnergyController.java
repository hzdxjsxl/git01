package com.smart.home.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
@RequestMapping("/api")
public class EnergyController {

    @GetMapping("/appliances")
    public Map<String, Object> getAppliances() {
        List<Map<String, Object>> appliances = Arrays.asList(
            createAppliance("air_conditioner", "空调", 1500, 8, Arrays.asList(10, 22)),
            createAppliance("water_heater", "热水器", 2000, 2, Arrays.asList(18, 22)),
            createAppliance("washing_machine", "洗衣机", 500, 2, Arrays.asList(7, 22)),
            createAppliance("dishwasher", "洗碗机", 1200, 1, Arrays.asList(12, 20)),
            createAppliance("oven", "烤箱", 1800, 1, Arrays.asList(12, 20)),
            createAppliance("dryer", "烘干机", 3000, 1, Arrays.asList(10, 22)),
            createAppliance("electric_car", "电动汽车", 6600, 6, Arrays.asList(20, 28)),
            createAppliance("refrigerator", "冰箱", 100, 24, null)
        );

        Map<String, Object> response = new HashMap<>();
        response.put("appliances", appliances);
        return response;
    }

    @GetMapping("/electricity-prices")
    public Map<String, Object> getElectricityPrices() {
        double[] prices = new double[24];
        
        for (int hour = 0; hour < 24; hour++) {
            if (hour >= 0 && hour < 6) {
                prices[hour] = 0.25;
            } else if (hour >= 6 && hour < 10) {
                prices[hour] = 0.85;
            } else if (hour >= 10 && hour < 14) {
                prices[hour] = 0.55;
            } else if (hour >= 14 && hour < 19) {
                prices[hour] = 0.85;
            } else if (hour >= 19 && hour < 23) {
                prices[hour] = 1.10;
            } else {
                prices[hour] = 0.55;
            }
        }

        List<Map<String, Object>> pricePeriods = Arrays.asList(
            createPricePeriod("谷时", "00:00-06:00", 0.25),
            createPricePeriod("平时", "06:00-10:00", 0.85),
            createPricePeriod("平时", "10:00-14:00", 0.55),
            createPricePeriod("峰时", "14:00-19:00", 0.85),
            createPricePeriod("尖峰", "19:00-23:00", 1.10),
            createPricePeriod("谷时", "23:00-24:00", 0.55)
        );

        Map<String, Object> response = new HashMap<>();
        response.put("hourlyPrices", prices);
        response.put("periods", pricePeriods);
        response.put("currency", "元/度");
        return response;
    }

    private Map<String, Object> createAppliance(String id, String name, int power, int duration, List<Integer> usageWindow) {
        Map<String, Object> appliance = new HashMap<>();
        appliance.put("id", id);
        appliance.put("name", name);
        appliance.put("powerWatts", power);
        appliance.put("durationHours", duration);
        appliance.put("usageWindow", usageWindow);
        appliance.put("unit", "瓦");
        return appliance;
    }

    private Map<String, Object> createPricePeriod(String type, String time, double price) {
        Map<String, Object> period = new HashMap<>();
        period.put("type", type);
        period.put("time", time);
        period.put("price", price);
        return period;
    }
}
