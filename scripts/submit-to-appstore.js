const { importPKCS8, SignJWT } = require('jose');
const fs = require('fs');
const https = require('https');

const KEY_ID = '5NN4TP2H5Z';
const ISSUER_ID = '4a1e051f-4778-4a94-a4e5-01623283e07d';
const APP_ID = '6800837351';
const P8_PATH = 'C:\\Users\\DELL\\Downloads\\AuthKey_5NN4TP2H5Z.p8';

async function createToken() {
  const p8 = fs.readFileSync(P8_PATH, 'utf8').trim();
  const privateKey = await importPKCS8(p8, 'ES256');
  const jwt = await new SignJWT({ aud: 'appstoreconnect-v1', iss: ISSUER_ID })
    .setProtectedHeader({ alg: 'ES256', kid: KEY_ID })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
  console.log('JWT:', jwt.substring(0, 50) + '...');
  return jwt;
}

function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.appstoreconnect.apple.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  try {
    const token = await createToken();
    console.log('Token created');

    // Get builds
    console.log('Fetching builds...');
    const builds = await apiCall('GET', `/v1/apps/${APP_ID}/builds?sort=-uploadedDate&limit=3`, null, token);
    console.log('Builds:', JSON.stringify(builds, null, 2));

    if (!builds.data || builds.data.length === 0) {
      console.log('No builds found');
      return;
    }

    const latestBuild = builds.data[0];
    const buildId = latestBuild.id;
    const buildVersion = latestBuild.attributes.version;
    console.log(`Using build: ${buildVersion} (ID: ${buildId})`);

    // Check if app store version already exists for this version
    const existingVersions = await apiCall('GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[versionString]=${buildVersion}&filter[platform]=IOS`, null, token);
    console.log('Existing versions:', JSON.stringify(existingVersions, null, 2));

    if (existingVersions.data && existingVersions.data.length > 0) {
      const versionId = existingVersions.data[0].id;
      const versionState = existingVersions.data[0].attributes.appStoreState;
      console.log(`Version ${buildVersion} already exists (state: ${versionState}, ID: ${versionId})`);

      // Try to create submission
      console.log('Creating submission...');
      const submission = await apiCall('POST', '/v1/appStoreVersionSubmissions', {
        data: {
          type: 'appStoreVersionSubmissions',
          relationships: {
            appStoreVersion: {
              data: { type: 'appStoreVersions', id: versionId }
            }
          }
        }
      }, token);
      console.log('Submission result:', JSON.stringify(submission, null, 2));
      return;
    }

    // Create App Store version
    console.log('Creating App Store version...');
    const version = await apiCall('POST', '/v1/appStoreVersions', {
      data: {
        type: 'appStoreVersions',
        attributes: {
          platform: 'IOS',
          versionString: buildVersion,
          copyright: '2026 ScalAI',
        },
        relationships: {
          app: {
            data: { type: 'apps', id: APP_ID }
          },
          build: {
            data: { type: 'builds', id: buildId }
          },
        }
      }
    }, token);
    console.log('Version created:', JSON.stringify(version, null, 2));

    if (version.data) {
      const versionId = version.data.id;
      console.log('Version ID:', versionId);

      // Create submission
      console.log('Creating submission...');
      const submission = await apiCall('POST', '/v1/appStoreVersionSubmissions', {
        data: {
          type: 'appStoreVersionSubmissions',
          relationships: {
            appStoreVersion: {
              data: { type: 'appStoreVersions', id: versionId }
            }
          }
        }
      }, token);
      console.log('Submission result:', JSON.stringify(submission, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

main();
