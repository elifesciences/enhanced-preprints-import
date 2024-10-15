import { env } from 'process';

export type S3Config = {
  accessKey?: string,
  secretKey?: string,
  region: string,
  endPoint?: string,
  webIdentityTokenFile?: string,
  awsAssumeRoleArn?: string,
};

export type Config = {
  eppS3: S3Config,
  mecaS3: S3Config,
  eppBucketName: string,
  eppBucketPrefix: string,
  eppServerUri: string,
  temporalServer: string,
  temporalNamespace: string,
  temporalTaskQueue: string,
  prometheusBindAddress: string,
  xsltTransformAddress: string,
  encodaTransformAddress: string,
  encodaDefaultVersion: string,
  temporalMaxConcurrentActivityTaskExecutions: number,
  temporalMaxConcurrentWorkflowTaskExecutions: number,
  temporalMaxCachedWorkflows: number,
};

if (!env.EPP_SERVER_URI) {
  throw Error('Environment variable `EPP_SERVER_URI` is required');
}

const getNumericEnvVar = (varName: string, defaultValue: number) => {
  if (env[varName] === undefined) {
    return defaultValue;
  }

  const value = parseInt(env[varName] || '', 10);

  if (Number.isInteger(value)) {
    return value;
  }

  // eslint-disable-next-line no-console
  console.log(`Could not interpret EnvVar ${varName} value '${env[varName]}' as integer, returning default ${defaultValue}`);
  return defaultValue;
};

export const config: Config = {
  eppS3: {
    accessKey: env.AWS_ACCESS_KEY_ID || undefined,
    secretKey: env.AWS_SECRET_ACCESS_KEY || undefined,
    region: env.S3_REGION || 'us-east-1',
    endPoint: env.S3_ENDPOINT || undefined,
    webIdentityTokenFile: env.AWS_WEB_IDENTITY_TOKEN_FILE || undefined,
    awsAssumeRoleArn: env.AWS_ROLE_ARN || undefined,
  },
  mecaS3: {
    accessKey: env.MECA_AWS_ACCESS_KEY_ID || undefined,
    secretKey: env.MECA_AWS_SECRET_ACCESS_KEY || undefined,
    region: env.MECA_S3_REGION || 'us-east-1',
    endPoint: env.MECA_S3_ENDPOINT || undefined,
    webIdentityTokenFile: env.MECA_AWS_WEB_IDENTITY_TOKEN_FILE || undefined,
    awsAssumeRoleArn: env.MECA_AWS_ROLE_ARN || undefined,
  },
  eppBucketName: env.BUCKET_NAME || 'epp',
  eppBucketPrefix: env.BUCKET_PREFIX || 'automation/',
  eppServerUri: env.EPP_SERVER_URI,
  prometheusBindAddress: env.PROMETHEUS_BIND_ADDRESS || '0.0.0.0:9464',
  temporalServer: env.TEMPORAL_SERVER || 'localhost',
  xsltTransformAddress: env.XSLT_TRANSFORM_ADDRESS || 'http://localhost:3004',
  encodaTransformAddress: env.ENCODA_TRANSFORM_ADDRESS || 'http://localhost:3005',
  encodaDefaultVersion: env.ENCODA_DEFAULT_VERSION || '1.0.8',
  temporalNamespace: env.TEMPORAL_NAMESPACE || 'default',
  temporalTaskQueue: env.TEMPORAL_TASK_QUEUE || 'epp',
  temporalMaxConcurrentActivityTaskExecutions: getNumericEnvVar('TEMPORAL_MAX_CONCURRENT_ACTIVITY_TASK_EXECUTIONS', 10),
  temporalMaxConcurrentWorkflowTaskExecutions: getNumericEnvVar('TEMPORAL_MAX_CONCURRENT_WORKFLOW_TASK_EXECUTIONS', 2),
  temporalMaxCachedWorkflows: getNumericEnvVar('TEMPORAL_MAX_CACHED_WORKFLOWS', 2),
};
