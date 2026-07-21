/**
 * Cloud provider mapping — value add.
 * -----------------------------------
 * Maps each generic node type to a concrete managed service per major cloud, so
 * the UI can offer a "deploy on AWS / GCP / Azure" view with real service names.
 * Pure data, authored here (₹0). Types without a managed equivalent fall back to
 * a generic compute/self-hosted label.
 */

export const CLOUD_MAP = {
  // client / edge
  cdn:                 { aws: 'CloudFront',            gcp: 'Cloud CDN',              azure: 'Azure CDN' },
  waf:                 { aws: 'AWS WAF',               gcp: 'Cloud Armor',            azure: 'Azure WAF' },
  dns:                 { aws: 'Route 53',              gcp: 'Cloud DNS',              azure: 'Azure DNS' },
  static_hosting:      { aws: 'S3 + CloudFront',       gcp: 'Cloud Storage + CDN',    azure: 'Static Web Apps' },

  // gateway
  api_gateway:         { aws: 'API Gateway',           gcp: 'API Gateway',            azure: 'API Management' },
  load_balancer:       { aws: 'ELB / ALB',             gcp: 'Cloud Load Balancing',   azure: 'Load Balancer' },
  reverse_proxy:       { aws: 'ALB',                   gcp: 'Cloud Load Balancing',   azure: 'Application Gateway' },

  // service / compute
  service:             { aws: 'ECS / EKS',             gcp: 'Cloud Run / GKE',        azure: 'AKS / Container Apps' },
  monolith:            { aws: 'EC2 / Elastic Beanstalk', gcp: 'Compute Engine',       azure: 'App Service' },
  serverless_function: { aws: 'Lambda',                gcp: 'Cloud Functions',        azure: 'Azure Functions' },
  graphql_server:      { aws: 'AppSync',               gcp: 'Cloud Run',              azure: 'Container Apps' },
  websocket_server:    { aws: 'API Gateway WebSockets', gcp: 'Cloud Run',             azure: 'Web PubSub' },

  // async
  message_queue:       { aws: 'SQS',                   gcp: 'Pub/Sub',                azure: 'Service Bus' },
  event_bus:          { aws: 'EventBridge / MSK',      gcp: 'Pub/Sub',                azure: 'Event Grid' },
  stream_processor:    { aws: 'Kinesis / MSK',         gcp: 'Dataflow',               azure: 'Stream Analytics' },
  worker:              { aws: 'ECS / Lambda',          gcp: 'Cloud Run Jobs',         azure: 'Container Apps Jobs' },
  scheduler:           { aws: 'EventBridge Scheduler', gcp: 'Cloud Scheduler',        azure: 'Logic Apps' },

  // data
  sql_db:              { aws: 'RDS / Aurora',          gcp: 'Cloud SQL / AlloyDB',    azure: 'Azure SQL' },
  nosql_db:            { aws: 'DynamoDB',              gcp: 'Firestore',              azure: 'Cosmos DB' },
  wide_column_db:      { aws: 'Keyspaces',             gcp: 'Bigtable',               azure: 'Cosmos DB (Cassandra)' },
  graph_db:            { aws: 'Neptune',               gcp: 'Spanner Graph',          azure: 'Cosmos DB (Gremlin)' },
  time_series_db:      { aws: 'Timestream',            gcp: 'Bigtable',               azure: 'Data Explorer' },
  cache:               { aws: 'ElastiCache (Redis)',   gcp: 'Memorystore',            azure: 'Azure Cache for Redis' },
  search_index:        { aws: 'OpenSearch',            gcp: 'Vertex AI Search',       azure: 'AI Search' },
  blob_storage:        { aws: 'S3',                    gcp: 'Cloud Storage',          azure: 'Blob Storage' },
  data_warehouse:      { aws: 'Redshift',              gcp: 'BigQuery',               azure: 'Synapse' },
  ledger_db:           { aws: 'QLDB',                  gcp: 'Spanner',                azure: 'SQL Ledger' },

  // ml
  model_serving:       { aws: 'SageMaker',             gcp: 'Vertex AI',              azure: 'Azure ML' },
  vector_db:           { aws: 'OpenSearch (vectors)',  gcp: 'Vertex Vector Search',   azure: 'AI Search (vectors)' },
  feature_store:       { aws: 'SageMaker Feature Store', gcp: 'Vertex Feature Store', azure: 'Azure ML Feature Store' },

  // security
  auth_service:        { aws: 'Cognito',               gcp: 'Identity Platform',      azure: 'Entra ID / B2C' },
  identity_provider:   { aws: 'IAM Identity Center',   gcp: 'Cloud Identity',         azure: 'Entra ID' },
  secrets_manager:     { aws: 'Secrets Manager',       gcp: 'Secret Manager',         azure: 'Key Vault' },

  // observability
  logging:             { aws: 'CloudWatch Logs',       gcp: 'Cloud Logging',          azure: 'Monitor Logs' },
  metrics:             { aws: 'CloudWatch',            gcp: 'Cloud Monitoring',       azure: 'Azure Monitor' },
  tracing:             { aws: 'X-Ray',                 gcp: 'Cloud Trace',            azure: 'App Insights' },
  alerting:            { aws: 'CloudWatch Alarms',     gcp: 'Cloud Monitoring',       azure: 'Azure Monitor Alerts' },
};

/** Managed-service names for a node type, or null if generic/self-hosted. */
export function cloudServicesFor(type) {
  return CLOUD_MAP[type] || null;
}
