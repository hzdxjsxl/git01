package com.cluster.dashboard.model;

public class NodeMetrics {
    private String nodeId;
    private double cpuUsage;
    private double memoryUsage;
    private long timestamp;

    public NodeMetrics() {
    }

    public NodeMetrics(String nodeId, double cpuUsage, double memoryUsage, long timestamp) {
        this.nodeId = nodeId;
        this.cpuUsage = cpuUsage;
        this.memoryUsage = memoryUsage;
        this.timestamp = timestamp;
    }

    public String getNodeId() {
        return nodeId;
    }

    public void setNodeId(String nodeId) {
        this.nodeId = nodeId;
    }

    public double getCpuUsage() {
        return cpuUsage;
    }

    public void setCpuUsage(double cpuUsage) {
        this.cpuUsage = cpuUsage;
    }

    public double getMemoryUsage() {
        return memoryUsage;
    }

    public void setMemoryUsage(double memoryUsage) {
        this.memoryUsage = memoryUsage;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}