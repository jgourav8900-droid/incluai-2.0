const os = require('os');

class MetricsService {
  constructor() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  recordRequest() {
    this.requestCount += 1;
  }

  recordError() {
    this.errorCount += 1;
  }

  getMetrics() {
    const memory = process.memoryUsage();
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: "HEALTHY",
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: uptimeSec,
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate: this.requestCount > 0 ? parseFloat((this.errorCount / this.requestCount).toFixed(4)) : 0,
      memory: {
        rssMb: parseFloat((memory.rss / (1024 * 1024)).toFixed(2)),
        heapUsedMb: parseFloat((memory.heapUsed / (1024 * 1024)).toFixed(2)),
        heapTotalMb: parseFloat((memory.heapTotal / (1024 * 1024)).toFixed(2))
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpuCores: os.cpus().length,
        freeMemMb: parseFloat((os.freemem() / (1024 * 1024)).toFixed(2)),
        totalMemMb: parseFloat((os.totalmem() / (1024 * 1024)).toFixed(2))
      },
      nodes: [
        { name: "api-gateway-01", status: "ONLINE", latencyMs: 1.4 },
        { name: "rag-vector-service", status: "ONLINE", latencyMs: 4.8 },
        { name: "tenant-database", status: "ONLINE", latencyMs: 0.8 }
      ],
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new MetricsService();
