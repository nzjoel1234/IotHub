const { spawn } = require("child_process");

function execute(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { shell: true });
    process.stdout.on('data', data => console.log(data.toString()));
    process.stderr.on('data', data => console.error(data.toString()));
    process.on('exit', code => code === 0 ? resolve() : reject(code));
  });
}

Promise.resolve()
  .then(() => execute('yarn.cmd', ['run', 'build']))
  .then(() => execute('aws', ['s3', 'sync', './build', 's3://iot.nzjoel.net', '--delete']))
  .then(() => execute('aws', ['cloudfront', 'create-invalidation', '--distribution-id', 'E29VO4BUYBSI8O', '--paths', '"/*"']));
