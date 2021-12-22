const exec = require('@actions/exec');
const fs = require('fs');

module.exports = { createManualActivationFile, activateManualLicense, activateSerialLicense, returnLicense };

async function activateSerialLicense(unityPath, username, password, serial) {
    // use '-projectPath ?' for skipping project indexing
    const stdout = await executeUnity(unityPath, `-batchmode -nographics -quit -logFile "-" -projectPath "?" -username "${username}" -password "${password}" -serial "${serial}"`);
    if (!stdout.includes('Next license update check is after')) {
        throw new Error('Activation failed');
    }
}

async function createManualActivationFile(unityPath) {
    await executeUnity(unityPath, '-batchmode -nographics -quit -logFile "-" -createManualActivationFile');
    return fs.readdirSync('./').find(path => path.endsWith('.alf'));
}

async function activateManualLicense(unityPath, licenseData) {
    let licensePath;

    if (os.platform() === 'win32') {
        licensePath = path.join(path.join(process.env.ProgramData, 'Unity'), 'Unity_lic.ulf');
    }
    else if (os.platform() === 'darwin') {
        licensePath = '/Library/Application Support/Unity/Unity_lic.ulf';
    }
    else if (os.platform() === 'linux') {
        licensePath = `${os.homedir()}/.local/share/unity3d/Unity/Unity_lic.ulf`;
    }

    fs.writeFileSync(licensePath, licenseData);

    fs.writeFileSync('license.ulf', licenseData);
    const stdout = await executeUnity(unityPath, `-batchmode -nographics -quit -logFile "-" -manualLicenseFile license.ulf`);
    if (!stdout.includes('Next license update check is after')) {
        throw new Error('Activation failed');
    }
}

async function returnLicense(unityPath) {
    await executeUnity(unityPath, '-batchmode -nographics -quit -logFile "-" -returnlicense');
}

async function executeUnity(unityPath, args) {
    if (process.platform === 'linux') {
        return await execute(`xvfb-run --auto-servernum "${unityPath}" ${args}`, true);
    } else {
        return await execute(`"${unityPath}" ${args}`, true);
    }
}

async function execute(command, ignoreReturnCode) {
    let stdout = '';
    await exec.exec(command, [], {
        ignoreReturnCode: ignoreReturnCode,
        listeners: { stdout: buffer => stdout += buffer.toString() }
    });
    return stdout;
}