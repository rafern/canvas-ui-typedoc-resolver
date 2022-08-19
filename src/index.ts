import { createProgram, SyntaxKind } from 'typescript';
import resolvePackagePath from 'resolve-package-path';
import { Application } from 'typedoc';
import path from 'node:path';

export function load(app: Application) {
    // get canvas-ui path
    const canvasUIPackageJsonPath = resolvePackagePath('@rafern/canvas-ui', process.cwd());

    if(!canvasUIPackageJsonPath)
        throw new Error('Could not find canvas-ui module.');

    const canvasUIPath = path.dirname(canvasUIPackageJsonPath);
    const canvasUILibPath = path.join(canvasUIPath, 'lib', 'index.d.ts');

    // parse canvas-ui types
    const program = createProgram({
        rootNames: [canvasUILibPath],
        options: {}
    });
    const sourceFile = program.getSourceFile(canvasUILibPath);

    if(!sourceFile)
        throw new Error('Could not get index.d.ts from canvas-ui.');

    const checker = program.getTypeChecker();
    const symbols = checker.getSymbolAtLocation(sourceFile);

    if(!symbols)
        throw new Error('Could not get symbols from canvas-ui\'s index.d.ts file.');

    const tsExports = checker.getExportsOfModule(symbols);

    const classes = new Set<string>();
    const interfaces = new Set<string>();
    const enums = new Set<string>();
    const types = new Set<string>();
    const functions = new Set<string>();
    const variables = new Set<string>();

    for(const tsSymbol of tsExports) {
        const decl = tsSymbol.declarations?.[0];
        if(!decl)
            continue;

        switch(decl.kind) {
            case SyntaxKind.ClassDeclaration:
                classes.add(tsSymbol.name);
                break;
            case SyntaxKind.InterfaceDeclaration:
                interfaces.add(tsSymbol.name);
                break;
            case SyntaxKind.EnumDeclaration:
                enums.add(tsSymbol.name);
                break;
            case SyntaxKind.TypeAliasDeclaration:
                types.add(tsSymbol.name);
                break;
            case SyntaxKind.FunctionDeclaration:
                functions.add(tsSymbol.name);
                break;
            case SyntaxKind.VariableDeclaration:
                const type = checker.getTypeOfSymbolAtLocation(tsSymbol, decl);

                if(type.getCallSignatures().length > 0) {
                    functions.add(tsSymbol.name);
                    break;
                }

                variables.add(tsSymbol.name);
                break;
        }
    }

    // make symbol resolver for exported types
    const baseURL = 'https://rafern.github.io/canvas-ui';
    app.renderer.addUnknownSymbolResolver('@rafern/canvas-ui', (name: string) => {
        if(classes.has(name))
            return `${baseURL}/classes/${name}.html`;
        else if(interfaces.has(name))
            return `${baseURL}/interfaces/${name}.html`;
        else if(enums.has(name))
            return `${baseURL}/enums/${name}.html`;
        else if(types.has(name))
            return `${baseURL}/types/${name}.html`;
        else if(functions.has(name))
            return `${baseURL}/functions/${name}.html`;
        else if(variables.has(name))
            return `${baseURL}/variables/${name}.html`;

        // unknown definition!
        return undefined;
    });
}
