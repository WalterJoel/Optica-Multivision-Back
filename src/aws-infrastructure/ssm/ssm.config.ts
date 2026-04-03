import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const client = new SSMClient({ region: 'us-east-1' });

export async function getAwsParameter(name: string): Promise<string> {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true,
  });

  const response = await client.send(command);
  return response.Parameter?.Value || '';
}
