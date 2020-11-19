const { spawn } = require("child_process");

const cloudFronDistributionId = 'E29VO4BUYBSI8O';
const s3InstanceName = 'iot.nzjoel.net';

function execute(command, args) {
  return new Promise((resolve, reject) => {
    const outputData = [];
    const process = spawn(command, args, { shell: true });
    process.stdout.on('data', data =>
      console.log(outputData[outputData.length] = data.toString()));
    process.stderr.on('data', data => console.error(data.toString()));
    process.on('exit', code => code === 0 ? resolve(outputData.join('')) : reject(code));
  });
}

const timeoutPromise = timeoutMs =>
  new Promise(resolve => setTimeout(resolve, timeoutMs));

const waitForInvalidationCompletion = invalidationId =>
  execute('aws', ['cloudfront', 'get-invalidation', '--distribution-id', cloudFronDistributionId, '--id', invalidationId])
    .then(JSON.parse)
    .then(invalidation => invalidation.Invalidation.Status === 'InProgress' &&
      timeoutPromise(2000).then(() => waitForInvalidationCompletion(invalidationId)));

Promise.resolve()
  .then(() => execute('yarn.cmd', ['run', 'build']))
  .then(() => execute('aws', ['s3', 'sync', './build', `s3://${s3InstanceName}`, '--delete']))
  .then(() => execute('aws', ['cloudfront', 'create-invalidation', '--distribution-id', cloudFronDistributionId, '--paths', '"/*"']))
  .then(JSON.parse)
  .then(({ Invalidation }) => waitForInvalidationCompletion(Invalidation.Id));
