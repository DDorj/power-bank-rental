const path = require('node:path');
const ts = require('typescript');

const configPath = path.join(__dirname, '..', 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.join(__dirname, '..'),
);

module.exports = {
  process(sourceText, sourcePath) {
    const { outputText } = ts.transpileModule(sourceText, {
      compilerOptions: {
        ...parsedConfig.options,
        module: ts.ModuleKind.ESNext,
        sourceMap: false,
        inlineSourceMap: true,
        inlineSources: true,
        declaration: false,
      },
      fileName: sourcePath,
      reportDiagnostics: false,
    });

    return {
      code: outputText,
    };
  },
};
