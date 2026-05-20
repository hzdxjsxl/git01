class WarehouseAPI {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async getWarehouseData() {
    try {
      const response = await fetch(`${this.baseUrl}/api/warehouse`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取仓库数据失败:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
