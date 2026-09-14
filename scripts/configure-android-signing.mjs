import fs from 'node:fs';

const file = 'src-tauri/gen/android/app/build.gradle.kts';
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('import java.io.FileInputStream')) {
  source = `import java.io.FileInputStream\nimport java.util.Properties\n${source}`;
}

if (!source.includes('create("release")')) {
  const marker = '    buildTypes {';
  const signing = `    signingConfigs {\n        create("release") {\n            val keystorePropertiesFile = rootProject.file("keystore.properties")\n            val keystoreProperties = Properties()\n            keystoreProperties.load(FileInputStream(keystorePropertiesFile))\n            keyAlias = keystoreProperties["keyAlias"] as String\n            keyPassword = keystoreProperties["password"] as String\n            storeFile = file(keystoreProperties["storeFile"] as String)\n            storePassword = keystoreProperties["password"] as String\n        }\n    }\n\n`;
  if (!source.includes(marker)) throw new Error(`Could not find ${marker} in ${file}`);
  source = source.replace(marker, signing + marker);
}

if (!source.includes('signingConfig = signingConfigs.getByName("release")')) {
  const releaseMarker = '        getByName("release") {';
  if (!source.includes(releaseMarker)) throw new Error(`Could not find release buildType in ${file}`);
  source = source.replace(
    releaseMarker,
    `${releaseMarker}\n            signingConfig = signingConfigs.getByName("release")`,
  );
}

fs.writeFileSync(file, source);
console.log(`Configured release signing in ${file}`);
