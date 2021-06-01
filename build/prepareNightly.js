const fs = require('fs');
const packageJsonPath = __dirname + '/../package.json';
const nightlyPackageName = 'zrender-nightly';

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;
const parts = /(\d+)\.(\d+)\.(\d+)($|\-)/.exec(version);
if (!parts) {
    throw new Error(`Invalid version number ${version}`);
}
// Add date to version.
const major = +parts[1];
const minor = +parts[2];
let patch = +parts[3];
const isStable = !parts[4];
if (isStable) {
    // It's previous stable version. Dev version should be higher.
    patch++;
}

const date = new Date().toISOString().replace(/:|T|\.|-/g, '').slice(0, 8);
const nightlyVersion = `${major}.${minor}.${patch}-dev.${date}`;

packageJson.name = nightlyPackageName;
packageJson.version = nightlyVersion;

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');