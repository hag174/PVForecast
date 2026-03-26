const net = require('node:net');
const { spawn } = require('node:child_process');

function isJsControllerRunning() {
    return new Promise(resolve => {
        const client = new net.Socket();
        const timeout = setTimeout(() => {
            client.destroy();
            resolve(false);
        }, 1000);

        client
            .connect({
                port: 9000,
                host: '127.0.0.1',
            })
            .on('connect', () => {
                client.destroy();
                clearTimeout(timeout);
                resolve(true);
            })
            .on('error', () => {
                client.destroy();
                clearTimeout(timeout);
                resolve(false);
            });
    });
}

async function main() {
    if (await isJsControllerRunning()) {
        console.error('A local ioBroker JS-Controller is already running on 127.0.0.1:9000.');
        console.error('Stop the host controller before running `npm run test:integration`.');
        process.exit(1);
    }

    const mochaPath = require.resolve('mocha/bin/mocha.js');
    const child = spawn(process.execPath, [mochaPath, 'test/integration.js', '--exit'], {
        stdio: 'inherit',
        env: process.env,
    });

    child.on('exit', (code, signal) => {
        if (signal) {
            process.kill(process.pid, signal);
            return;
        }

        process.exit(code ?? 1);
    });
}

void main();
