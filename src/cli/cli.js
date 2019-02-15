
const readline = require('readline');
const io = require('socket.io-client');
const { RemoteTaskManager } = require('../server/TaskManager');

const nodeConfig = require('../nodeConfig');

function startInteractiveCli(cluster) {
  const cliInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'GGS> ',
  });

  cliInterface.prompt();

  cliInterface.on('line', (line) => {
    const words = line.trim().split(' ');
    switch (words[0]) {
      case 'nodes':
        cluster.nodes().forEach((node) => {
          console.log(node.id, node.name);
        });
        break;

      case 'tasks':
        cluster.tasks().forEach((task) => {
          console.log(task.id, task.name);
        });
        break;

      case 'cli':
        {
          const newTask = {
            name: words.slice(1).join(' '),
            service: 'cli',
            args: ['-cwd=${dataPath}'].concat(words.slice(1)),
            details: {},
          };
          cluster.start(newTask, (task) => {
            console.log(task);
          });
        }
        break;

      case 'exit':
        cliInterface.close();
        break;

      default:
        console.log(`unknown command: ${words[0]}`);
        break;
    }
    cliInterface.prompt();
  }).on('close', () => {
    console.log('Have a great day!');
    process.exit(0);
  });
}

module.exports = () => {
  if (process.argv[2] !== 'cli') {
    throw new Error(`unexpected command: ${process.argv[2]}`);
  }

  console.log(`${nodeConfig.master}/cluster`);

  const socket = io(`${nodeConfig.master}/cluster`);

  const cluster = new RemoteTaskManager(socket);

  cluster.on('ready', () => {
    console.log('Cluster is Ready');
    console.log(`Nodes: ${cluster.nodes().length}`);
    console.log(`Tasks: ${cluster.tasks().length}`);
    startInteractiveCli(cluster);
  });

  cluster.on('disconnect', () => {
    console.log('disconnect');
  });
};
