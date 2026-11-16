export interface HealthStatus {
  status: 'ok';
  service: 'docusense-ai-api';
  timestamp: string;
}

export interface DatabaseHealthStatus {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
}
