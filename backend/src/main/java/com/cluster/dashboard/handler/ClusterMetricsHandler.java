package com.cluster.dashboard.handler;

import com.cluster.dashboard.model.NodeMetrics;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class ClusterMetricsHandler extends TextWebSocketHandler {

    private final List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Random random = new Random();
    private final String[] nodeIds = {"node-001", "node-002", "node-003", "node-004", "node-005"};
    private final Map<String, Double> cpuBase = new HashMap<>();
    private final Map<String, Double> memoryBase = new HashMap<>();

    public ClusterMetricsHandler() {
        for (String nodeId : nodeIds) {
            cpuBase.put(nodeId, 30 + random.nextDouble() * 20);
            memoryBase.put(nodeId, 40 + random.nextDouble() * 20);
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        sendInitialData(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload();
        if ("ping".equals(payload)) {
            try {
                session.sendMessage(new TextMessage("pong"));
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    private void sendInitialData(WebSocketSession session) {
        List<NodeMetrics> metrics = generateMetrics();
        try {
            String json = objectMapper.writeValueAsString(metrics);
            session.sendMessage(new TextMessage(json));
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Scheduled(fixedRate = 1000)
    public void broadcastMetrics() {
        if (sessions.isEmpty()) {
            return;
        }

        List<NodeMetrics> metrics = generateMetrics();
        try {
            String json = objectMapper.writeValueAsString(metrics);
            TextMessage message = new TextMessage(json);

            Iterator<WebSocketSession> iterator = sessions.iterator();
            while (iterator.hasNext()) {
                WebSocketSession session = iterator.next();
                if (session.isOpen()) {
                    try {
                        session.sendMessage(message);
                    } catch (IOException e) {
                        iterator.remove();
                    }
                } else {
                    iterator.remove();
                }
            }
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
    }

    private List<NodeMetrics> generateMetrics() {
        List<NodeMetrics> metrics = new ArrayList<>();
        long timestamp = System.currentTimeMillis();

        for (String nodeId : nodeIds) {
            double baseCpu = cpuBase.get(nodeId);
            double baseMemory = memoryBase.get(nodeId);

            double cpuDelta = (random.nextDouble() - 0.5) * 15;
            double memoryDelta = (random.nextDouble() - 0.5) * 8;

            double cpuUsage = Math.max(0, Math.min(100, baseCpu + cpuDelta));
            double memoryUsage = Math.max(0, Math.min(100, baseMemory + memoryDelta));

            metrics.add(new NodeMetrics(
                    nodeId,
                    Math.round(cpuUsage * 100.0) / 100.0,
                    Math.round(memoryUsage * 100.0) / 100.0,
                    timestamp
            ));
        }

        return metrics;
    }
}