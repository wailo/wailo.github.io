import path from 'path';
import ts from 'typescript';
import { Plugin } from 'vite';

// Core TypeScript source file
const inputPath = path.resolve(__dirname, 'public/LearningModules/core.ts');

// Virtual module IDs
const virtualModules = {
  'virtual:transpiled-core-js': 'js',
  'virtual:transpiled-core-dts': 'dts',
};

export default function transpileCorePlugin(): Plugin {

  let tsCode: string | undefined;
  let transpiledJs: string | undefined;
  let transpiledDts: string | undefined;

  return {
    name: 'vite:transpile-core-to-virtual-modules',

    async buildStart() {
      const fs = await import('fs/promises');
      tsCode = await fs.readFile(inputPath, 'utf-8');

      const transpileResult = ts.transpileModule(tsCode, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          declaration: true,
        },
      });

      transpiledJs = transpileResult.outputText;

      // Extract declarations using custom compiler host
      const result = ts.transpileDeclaration(tsCode, {
        compilerOptions: {
          declaration: true,
          emitDeclarationOnly: true,
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      });

      transpiledDts = result.outputText;
    },

    resolveId(id) {
      if (id in virtualModules) {
        return `\0${id}`;
      }
    },

    load(id) {
      if (id === '\0virtual:transpiled-core-js') {
        return `export default ${JSON.stringify(transpiledJs)};`;
      }
      if (id === '\0virtual:transpiled-core-dts') {
        return `export default ${JSON.stringify(transpiledDts)};`;
      }
    },
  };
}
