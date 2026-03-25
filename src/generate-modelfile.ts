import {
  Project,
  Node,
  SourceFile,
  InterfaceDeclaration,
  EnumDeclaration,
  TypeAliasDeclaration,
  FunctionDeclaration,
  VariableDeclaration,
  Type,
  SyntaxKind,
} from "ts-morph";

import fs from "fs";
import path from "path";

/*
CONFIG
*/

const ENTRY_FILE = "src/core.ts";
const META_FILE = "public/flightsimulator_exec_meta.ts";
const OUTPUT_FILE = "Modelfile";
const MODEL_NAME = "qwen3.5";

/*
PROJECT
*/

const project = new Project({
  tsConfigFilePath: "tsconfig.app.json",
});

/*
STATE
*/

const visited = new Set<string>();
const collected: Node[] = [];

/*
UTILS
*/

function isPromiseType(type: Type) {
  const text = type.getText();
  return text.startsWith("Promise<");
}

function isLocalFile(source?: SourceFile) {
  if (!source) return false;
  return !source.getFilePath().includes("node_modules");
}

function getNodeName(node: Node) {
  if (
    Node.isInterfaceDeclaration(node) ||
    Node.isEnumDeclaration(node) ||
    Node.isTypeAliasDeclaration(node) ||
    Node.isFunctionDeclaration(node) ||
    Node.isVariableDeclaration(node)
  ) {
    return node.getName();
  }
  return undefined;
}

/*
TYPE NORMALIZATION
*/

function normalizeType(typeText: string) {
  return typeText
    .replace(/import\([^)]+\)\./g, "")
    .replace(/Array<(.*?)>/g, "$1[]")
    .replace(/Promise<(.*?)>/g, "$1")
    .replace(/\"/g, "")
    .trim();
}

/*
DEPENDENCY RESOLUTION
*/

function resolveDependencies(node: Node) {
  const name = getNodeName(node);
  if (!name) return;
  if (visited.has(name)) return;

  visited.add(name);
  collected.push(node);

  // ✅ NEW: handle variable type dependencies
  if (Node.isVariableDeclaration(node)) {
    const type = node.getType();
    resolveTypeDependencies(type);
  }
}

/*
EXPAND TYPES FROM TYPE OBJECT
*/

function resolveTypeDependencies(type: Type) {
  // handle unions/intersections
  if (type.isUnion()) {
    type.getUnionTypes().forEach(resolveTypeDependencies);
    return;
  }
  if (type.isIntersection()) {
    type.getIntersectionTypes().forEach(resolveTypeDependencies);
    return;
  }

  // handle generics
  type.getTypeArguments().forEach(resolveTypeDependencies);

  const symbol = type.getAliasSymbol() ?? type.getSymbol();
  if (!symbol) return;

  const decls = symbol.getDeclarations();
  if (!decls?.length) return;

  for (const decl of decls) {
    const source = decl.getSourceFile();
    if (!isLocalFile(source)) continue;

    resolveDependencies(decl);
  }
}

/*
GRAMMAR BUILDERS
*/

function interfaceToGrammar(node: InterfaceDeclaration, metadata: {}) {
  const interfaceName = node.getName();
  const properties = node.getProperties().map((p) => {
    const field = p.getName();
    const type = p.getType();
    const metaitem = metadata[interfaceName]?.[field];
    const metajson =
      metaitem !== undefined
        ? JSON.stringify(new Function(`return ${metaitem}`)())
        : null;
    resolveTypeDependencies(type);
    const typeText = normalizeType(type.getText());
    let output_text = metajson ? `// ${metajson}\n` : "";
    output_text += `${field}: ${typeText}`;
    return output_text;
  });

  const methods = node.getMethods().map((m) => {
    const methodName = m.getName();
    const metaitem = metadata[interfaceName]?.[methodName.replace("set_", "")];
    const metajson =
      metaitem !== undefined
        ? JSON.stringify(new Function(`return ${metaitem}`)())
        : "";
    const params = m.getParameters().map((p) => {
      const pname = p.getName();
      const type = p.getType();
      resolveTypeDependencies(type);
      const typeText = normalizeType(type.getText());
      let output_text = `${pname}: ${typeText}`;
      return output_text;
    });

    const returnTypeObj = m.getReturnType();
    resolveTypeDependencies(returnTypeObj);
    const asyncFlag = isPromiseType(returnTypeObj);
    const returnType = normalizeType(returnTypeObj.getText());
    const prefix = asyncFlag ? "async " : "";
    let output_text = metajson ? `// ${metajson}\n` : "";
    output_text += `${prefix}${methodName}(${params.join(", ")}) -> ${returnType}`;
    return output_text;
  });

  const lines = [...properties, ...methods];
  return `${interfaceName} {\n${lines.join("\n")}\n}`;
}

function variableToGrammar(node: VariableDeclaration) {
  const name = node.getName();

  const type = node.getType();
  resolveTypeDependencies(type);
  const typeText = normalizeType(type.getText());

  const stmt = node.getVariableStatement();

  const isConst = stmt?.getDeclarationKind() === "const";

  const isDeclare = stmt?.hasModifier(SyntaxKind.DeclareKeyword);
  const isExported = stmt?.hasModifier(SyntaxKind.ExportKeyword);

  const kind = isConst ? "const" : "let";

  const declarePrefix = isDeclare ? "declare " : "";
  const exportPrefix = isExported ? "export " : "";

  return `${exportPrefix}${declarePrefix}${kind} ${name}: ${typeText}`;
}

function enumToGrammar(node: EnumDeclaration) {
  const name = node.getName();

  const values = node.getMembers().map((m) => {
    const init = m.getInitializer()?.getText();
    if (init) return init;
    return `"${m.getName()}"`;
  });

  return `${name} = ${values.join(" | ")}`;
}

function aliasToGrammar(node: TypeAliasDeclaration) {
  const name = node.getName();
  const typeNode = node.getTypeNode();
  if (!typeNode) return `${name} = unknown`;
  const type = node.getType();

  if (type.isIntersection()) {
    return intersectionToGrammar(name, type);
  }

  resolveTypeDependencies(type);
  const typeText = normalizeType(typeNode.getText());
  return `${name} = ${typeText}`;
}

function intersectionToGrammar(name: string, type: Type) {
  const parts = type.getIntersectionTypes();

  const fields: string[] = [];
  const spreads: string[] = [];

  for (const part of parts) {
    resolveTypeDependencies(part);

    // 🟢 Case 1: inline object type
    const props = part.getProperties();

    if (props.length > 0) {
      props.forEach((prop) => {
        const propType = prop.getTypeAtLocation(prop.getDeclarations()[0]);
        resolveTypeDependencies(propType);

        const typeText = normalizeType(propType.getText());
        fields.push(`${prop.getName()}: ${typeText}`);
      });

      continue;
    }

    // 🔵 Case 2: named type (e.g., MainModule)
    const symbol = part.getAliasSymbol() ?? part.getSymbol();
    if (symbol) {
      const name = symbol.getName();
      spreads.push(`...${name}`);
    }
  }

  const lines = [...spreads, ...fields];

  return `${name} {\n${lines.join("\n")}\n}`;
}

function functionToGrammar(node: FunctionDeclaration) {
  const name = node.getName();
  if (!name) return "";

  const params = node.getParameters().map((p) => {
    const pname = p.getName();
    const type = p.getType();
    resolveTypeDependencies(type);
    const typeText = normalizeType(type.getText());
    return `${pname}: ${typeText}`;
  });

  const returnTypeObj = node.getReturnType();
  resolveTypeDependencies(returnTypeObj);
  const asyncFlag = isPromiseType(returnTypeObj);
  const returnType = normalizeType(returnTypeObj.getText());
  const prefix = asyncFlag ? "async fn" : "fn";
  return `${prefix} ${name}(${params.join(", ")}) -> ${returnType}`;
}

/*
GRAMMAR ROUTER
*/

function toGrammar(node: Node, metadata: {}) {
  if (Node.isInterfaceDeclaration(node))
    return interfaceToGrammar(node, metadata);
  if (Node.isEnumDeclaration(node)) return enumToGrammar(node);
  if (Node.isTypeAliasDeclaration(node)) return aliasToGrammar(node);
  if (Node.isFunctionDeclaration(node)) return functionToGrammar(node);
  if (Node.isVariableDeclaration(node)) return variableToGrammar(node);
  return "";
}

/*
CONTRACT METADATA
*/

function extractMetdata(entryFile: string) {
  const source = project.getSourceFileOrThrow(entryFile);
  let c172_meta = {};
  let b747_meta = {};
  let graphics_meta = {};
  source.getFunctions().forEach((func) => {
    let functionName = func.getName();
    let body = func.getBody();
    const metaData: Record<string, string> = {};
    body?.forEachDescendant((node) => {
      if (node.getKind() === SyntaxKind.ReturnStatement) {
        const returnStmt = node.asKindOrThrow(SyntaxKind.ReturnStatement);
        const expr = returnStmt.getExpression();

        if (!expr) return;

        if (expr.getKind() === SyntaxKind.ObjectLiteralExpression) {
          const obj = expr.asKindOrThrow(SyntaxKind.ObjectLiteralExpression);

          obj.getProperties().forEach((prop) => {
            if (prop.getKind() === SyntaxKind.PropertyAssignment) {
              const assignment = prop.asKindOrThrow(
                SyntaxKind.PropertyAssignment,
              );

              const key = assignment.getName();
              const value = assignment.getInitializer();
              // remove unwanted properties
              value?.getProperties().forEach((prop) => {
                if (prop.isKind(SyntaxKind.PropertyAssignment)) {
                  const name = prop.getName().toLowerCase();

                  // Remove these entries..
                  if (
                    ["id", "inputvalue", "setterfunc", "type"].includes(name)
                  ) {
                    prop.remove();
                  }
                }
              });
              const valueText = value?.getText();
              if (!key || !value) {
                return;
              }

              metaData[key] = valueText;
            }
          });
        }
      }
    });
    const function_name = functionName?.toLowerCase();
    if (function_name == "get_parameters_b747") {
      b747_meta = metaData;
    } else if (function_name == "get_parameters_c172") {
      c172_meta = metaData;
    } else if (function_name == "get_parameters_graphics") {
      graphics_meta = metaData;
    }
  });

  if (!c172_meta || !b747_meta || !graphics_meta) {
    // Throw an error
    throw "Missing metadata for C172 or B747 or graphics";
  }

  return { c172: c172_meta, b747: b747_meta, graphics: graphics_meta };
}

/*
CONTRACT EXTRACTION
*/

function extractContract(entryFile: string, metadata: {}) {
  const source = project.getSourceFileOrThrow(entryFile);

  source.getExportedDeclarations().forEach((decls) => {
    decls.forEach((decl) => resolveDependencies(decl));
  });

  const sorted = collected.sort((a, b) =>
    (getNodeName(a) ?? "").localeCompare(getNodeName(b) ?? ""),
  );

  return sorted.map((node) => toGrammar(node, metadata)).join("\n\n");
}

/*
MODELFILE
*/

function generateModelfile(contract: string) {
  return `FROM ${MODEL_NAME}

SYSTEM """
You are a strict TypeScript and JavaScript code generator.

Implement the declared functions using the TYPE GRAMMAR.

Rules:
- Output only valid JavaScript code — no markdown, no standalone explanations.
- Objects must follow the grammar exactly
- Do not invent properties
- Do not omit required properties
- All explanations must be included as comments inside the code.
- Before putting the code, show the lesson plan in steps as comments inside the code.
- Code must be written in global scope, do not wrap inside a function.
- simControls is provided a global object of type ExtendedMainModule. which has 'simulation' property of type graphics, and 'fm' property of type FlightModelInstance, points to the active flightModel.
   type ExtendedMainModule = MainModule  & { fm : FlightModelInstance} & {simulation : graphics};
   type FlightModelInstance = b747 | c172;
- If no method exists, write:
   // ERROR: No method exists to [describe action]
   Then stop.
"""

TEMPLATE """
### TYPE GRAMMAR

${contract}

### TASK

{{ .Prompt }}
"""
`;
}

/*
MAIN
*/

function main() {
  const entry = path.resolve(ENTRY_FILE);
  const meta = path.resolve(META_FILE);

  const metadata = extractMetdata(meta);
  const contract = extractContract(entry, metadata);
  const modelfile = generateModelfile(contract);

  fs.writeFileSync(OUTPUT_FILE, modelfile);

  console.log("Modelfile generated successfully");
}

main();
