const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { withDangerousMod } = require('@expo/config-plugins');

const NODE_RESOLVER_IN_PLUGIN_MANAGEMENT = `  def resolveNodeExecutable = {
    def nodeEnv = System.getenv("NODE_BINARY")
    if (nodeEnv != null && !nodeEnv.isBlank()) {
      return nodeEnv
    }
    def localProperties = new Properties()
    def localPropertiesFile = new File(rootDir, "local.properties")
    if (localPropertiesFile.exists()) {
      localPropertiesFile.withInputStream { localProperties.load(it) }
      def nodeDir = localProperties.getProperty("node.dir")
      if (nodeDir != null) {
        def nodeFile = new File(nodeDir, "node")
        if (nodeFile.canExecute()) {
          return nodeFile.absolutePath
        }
      }
    }
    def candidates = [
      "/opt/homebrew/bin/node",
      "/usr/local/bin/node",
    ]
    for (candidate in candidates) {
      def nodeFile = new File(candidate)
      if (nodeFile.canExecute()) {
        return nodeFile.absolutePath
      }
    }
    return "node"
  }

`;

const NODE_EXECUTABLE_GRADLE = `ext.resolveNodeExecutable = {
  def nodeEnv = System.getenv("NODE_BINARY")
  if (nodeEnv != null && !nodeEnv.isBlank()) {
    return nodeEnv
  }
  def localProperties = new Properties()
  def androidRoot = rootProject.projectDir
  def localPropertiesFile = new File(androidRoot, "local.properties")
  if (localPropertiesFile.exists()) {
    localPropertiesFile.withInputStream { localProperties.load(it) }
    def nodeDir = localProperties.getProperty("node.dir")
    if (nodeDir != null) {
      def nodeFile = new File(nodeDir, "node")
      if (nodeFile.canExecute()) {
        return nodeFile.absolutePath
      }
    }
  }
  def candidates = [
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
  ]
  for (candidate in candidates) {
    def nodeFile = new File(candidate)
    if (nodeFile.canExecute()) {
      return nodeFile.absolutePath
    }
  }
  return "node"
}
`;

const ROOT_BUILD_GRADLE_SNIPPET = `apply from: new File(rootDir, "gradle/node-executable.gradle")

ext {
  REACT_NATIVE_NODE_MODULES_DIR = file("\${rootDir}/../node_modules/react-native").absolutePath
}

subprojects { subproject ->
  subproject.ext.resolveNodeExecutable = rootProject.ext.resolveNodeExecutable
  subproject.ext.REACT_NATIVE_NODE_MODULES_DIR = rootProject.ext.REACT_NATIVE_NODE_MODULES_DIR
}
`;

function detectNodeDir() {
  const nodeBinary = process.env.NODE_BINARY;
  if (nodeBinary) {
    return path.dirname(nodeBinary);
  }
  try {
    const nodePath = execSync('command -v node', {
      encoding: 'utf8',
      env: process.env,
    }).trim();
    if (nodePath) {
      return path.dirname(nodePath);
    }
  } catch {
    // ignore
  }
  for (const candidate of ['/opt/homebrew/bin/node', '/usr/local/bin/node']) {
    if (fs.existsSync(candidate)) {
      return path.dirname(candidate);
    }
  }
  return null;
}

function upsertLocalProperties(androidRoot, nodeDir) {
  const localPropertiesPath = path.join(androidRoot, 'local.properties');
  const lines = fs.existsSync(localPropertiesPath)
    ? fs.readFileSync(localPropertiesPath, 'utf8').split('\n')
    : [];
  const withoutNodeDir = lines.filter((line) => !line.startsWith('node.dir='));
  if (nodeDir) {
    withoutNodeDir.push(`node.dir=${nodeDir}`);
  }
  const content = withoutNodeDir.filter((line, index, arr) => {
    return line.length > 0 || index < arr.length - 1;
  });
  fs.writeFileSync(
    localPropertiesPath,
    `${content.join('\n').replace(/\n*$/, '')}\n`,
  );
}

function patchSettingsGradle(contents) {
  if (contents.includes('def resolveNodeExecutable')) {
    return contents.replace(/commandLine\("node",/g, 'commandLine(resolveNodeExecutable(),');
  }
  let next = contents.replace(
    /pluginManagement \{\n/,
    `pluginManagement {\n${NODE_RESOLVER_IN_PLUGIN_MANAGEMENT}`,
  );
  next = next.replace(/commandLine\("node",/g, 'commandLine(resolveNodeExecutable(),');
  return next;
}

function patchRootBuildGradle(contents) {
  if (contents.includes('REACT_NATIVE_NODE_MODULES_DIR')) {
    return contents;
  }
  const marker = 'apply plugin: "expo-root-project"';
  if (contents.includes(marker)) {
    return contents.replace(marker, `${ROOT_BUILD_GRADLE_SNIPPET}\n${marker}`);
  }
  return `${ROOT_BUILD_GRADLE_SNIPPET}\n${contents}`;
}

function patchAppBuildGradle(contents) {
  const applyLine =
    'apply from: new File(rootProject.projectDir, "gradle/node-executable.gradle")\n\n';
  let next = contents
    .replace(
      /apply from: new File\(rootDir, "gradle\/node-executable\.gradle"\)\n\n/,
      applyLine,
    )
    .replace(
      /apply from: new File\(rootDir, "\.\.\/gradle\/node-executable\.gradle"\)\n\n/,
      applyLine,
    );
  if (
    next.includes('gradle/node-executable.gradle') &&
    next.includes('nodeExecutableAndArgs = [resolveNodeExecutable()]')
  ) {
    return next.replace(/\["node",/g, '[resolveNodeExecutable(),');
  }
  if (!next.includes('gradle/node-executable.gradle')) {
    next = next.replace(
      /def projectRoot = rootDir\.getAbsoluteFile\(\)\.getParentFile\(\)\.getAbsolutePath\(\)\n\n/,
      (match) => `${match}${applyLine}`,
    );
  }
  next = next.replace(/\["node",/g, '[resolveNodeExecutable(),');
  if (!next.includes('nodeExecutableAndArgs = [resolveNodeExecutable()]')) {
    next = next.replace(
      /react \{\n/,
      'react {\n    nodeExecutableAndArgs = [resolveNodeExecutable()]\n',
    );
  }
  return next;
}

function withGradleNode(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidRoot = config.modRequest.platformProjectRoot;
      const gradleDir = path.join(androidRoot, 'gradle');
      fs.mkdirSync(gradleDir, { recursive: true });
      fs.writeFileSync(
        path.join(gradleDir, 'node-executable.gradle'),
        NODE_EXECUTABLE_GRADLE,
      );

      const nodeDir = detectNodeDir();
      upsertLocalProperties(androidRoot, nodeDir);

      const settingsGradlePath = path.join(androidRoot, 'settings.gradle');
      if (fs.existsSync(settingsGradlePath)) {
        const settingsGradle = fs.readFileSync(settingsGradlePath, 'utf8');
        const cleaned = settingsGradle.replace(
          /  def resolveNodeExecutable = \{[\s\S]*?  \}\n\n/gm,
          '',
        );
        fs.writeFileSync(settingsGradlePath, patchSettingsGradle(cleaned));
      }

      const rootBuildGradlePath = path.join(androidRoot, 'build.gradle');
      if (fs.existsSync(rootBuildGradlePath)) {
        const rootBuildGradle = fs.readFileSync(rootBuildGradlePath, 'utf8');
        const cleaned = rootBuildGradle.replace(
          /apply from: new File\(rootDir, "gradle\/node-executable.gradle"\)\n\next \{[\s\S]*?\}\n\nsubprojects \{[\s\S]*?\}\n\n/gm,
          '',
        );
        fs.writeFileSync(rootBuildGradlePath, patchRootBuildGradle(cleaned));
      }

      const appBuildGradlePath = path.join(androidRoot, 'app', 'build.gradle');
      if (fs.existsSync(appBuildGradlePath)) {
        const appBuildGradle = fs.readFileSync(appBuildGradlePath, 'utf8');
        fs.writeFileSync(appBuildGradlePath, patchAppBuildGradle(appBuildGradle));
      }

      return config;
    },
  ]);
}

module.exports = withGradleNode;
