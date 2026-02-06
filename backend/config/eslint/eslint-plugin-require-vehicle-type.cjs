module.exports = {
  rules: {
    'require-vehicle-type': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Require vehicle_types for Brand and vehicle_type for VehicleModel when creating entities',
          category: 'Best Practices',
          recommended: true,
        },
        fixable: null,
        schema: [
          {
            type: 'object',
            properties: {
              checkScripts: {
                type: 'boolean',
                default: true,
              },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          missingVehicleTypes: 'Brand entity must include vehicle_types field when creating. Example: { name: "...", vehicle_types: ["car"] }',
          missingVehicleType: 'VehicleModel entity must include vehicle_type field when creating. Example: { name: "...", brand_id: "...", vehicle_type: "car" }',
        },
      },
      create(context) {
        const checkScripts = context.options[0]?.checkScripts !== false;
        const filename = context.getFilename();
        const isScript = filename.includes('/scripts/');

        if (!checkScripts && isScript) {
          return {};
        }

        function isBrandRepository(node) {
          if (node.type !== 'MemberExpression') {
            return false;
          }

          const property = node.property;
          if (property.type !== 'Identifier' || property.name !== 'create') {
            return false;
          }

          const object = node.object;
          if (object.type !== 'Identifier') {
            return false;
          }

          const varName = object.name;
          return varName === 'brandRepo' || varName.endsWith('BrandRepo') || varName === 'brandRepository';
        }

        function isModelRepository(node) {
          if (node.type !== 'MemberExpression') {
            return false;
          }

          const property = node.property;
          if (property.type !== 'Identifier' || property.name !== 'create') {
            return false;
          }

          const object = node.object;
          if (object.type !== 'Identifier') {
            return false;
          }

          const varName = object.name;
          return varName === 'modelRepo' || varName.endsWith('ModelRepo') || varName === 'modelRepository';
        }

        function hasVehicleTypesProperty(objNode) {
          if (objNode.type !== 'ObjectExpression') {
            return false;
          }

          return objNode.properties.some(
            (prop) =>
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'vehicle_types'
          );
        }

        function hasVehicleTypeProperty(objNode) {
          if (objNode.type !== 'ObjectExpression') {
            return false;
          }

          return objNode.properties.some(
            (prop) =>
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'vehicle_type'
          );
        }

        return {
          CallExpression(node) {
            const callee = node.callee;

            if (isBrandRepository(callee)) {
              if (node.arguments.length > 0) {
                const firstArg = node.arguments[0];
                if (!hasVehicleTypesProperty(firstArg)) {
                  context.report({
                    node: firstArg,
                    messageId: 'missingVehicleTypes',
                  });
                }
              }
            }

            if (isModelRepository(callee)) {
              if (node.arguments.length > 0) {
                const firstArg = node.arguments[0];
                if (!hasVehicleTypeProperty(firstArg)) {
                  context.report({
                    node: firstArg,
                    messageId: 'missingVehicleType',
                  });
                }
              }
            }
          },
        };
      },
    },
  },
};
