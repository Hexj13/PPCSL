module.exports = {
  rules: {
    'no-hardcoded-text': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow hardcoded user-facing text in error messages and exceptions',
          category: 'Best Practices',
          recommended: true,
        },
        fixable: null,
        schema: [
          {
            type: 'object',
            properties: {
              allowedPatterns: {
                type: 'array',
                items: { type: 'string' },
              },
              translationKeys: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          hardcodedText: 'User-facing text should use translation keys (errors.* or validation.*) instead of hardcoded text. Found: "{{text}}"',
        },
      },
      create(context) {
    const macedonianPattern = /[\u0400-\u04FF]/;
    const translationKeyPattern = /^(errors|validation)\./;
    const allowedPatternsConfig = context.options[0]?.allowedPatterns || [
      '^[A-Za-z0-9\\s\\-_.,:;!?()\\[\\]{}@#$%^&*+=|\\\\/<>`~]+$',
      '^[0-9\\s.,\\-+()]+$',
      '^[a-z]+://',
      '^www\\.',
      '^mailto:',
      '^#',
    ];
    const allowedPatterns = allowedPatternsConfig.map((pattern) =>
      typeof pattern === 'string' ? new RegExp(pattern) : pattern,
    );

    function isHardcodedText(text) {
      if (!text || typeof text !== 'string') {
        return false;
      }

      if (translationKeyPattern.test(text)) {
        return false;
      }

      if (macedonianPattern.test(text)) {
        return true;
      }

      if (allowedPatterns.some((pattern) => pattern.test(text))) {
        return false;
      }

      return false;
    }

    function isExceptionCallee(node) {
      if (!node) return false;
      const name =
        node.type === 'Identifier'
          ? node.name
          : node.type === 'MemberExpression' && node.property?.type === 'Identifier'
            ? node.property.name
            : null;
      return [
        'BadRequestException',
        'ForbiddenException',
        'NotFoundException',
        'UnauthorizedException',
        'ConflictException',
      ].includes(name);
    }

    function isTranslationKey(str) {
      return /^(errors|validation)\./.test(str || '');
    }

    function checkExceptionMessage(firstArg) {
      if (!firstArg) return;
      if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
        if (!isTranslationKey(firstArg.value)) {
          context.report({
            node: firstArg,
            messageId: 'hardcodedText',
            data: {
              text: firstArg.value.substring(0, 50) + (firstArg.value.length > 50 ? '...' : ''),
            },
          });
        }
      } else if (firstArg.type === 'TemplateLiteral' && firstArg.quasis?.length > 0) {
        const firstQuasi = firstArg.quasis[0].value?.raw || '';
        if (!isTranslationKey(firstQuasi)) {
          context.report({
            node: firstArg.quasis[0],
            messageId: 'hardcodedText',
            data: { text: firstQuasi.substring(0, 50) + (firstQuasi.length > 50 ? '...' : '') },
          });
        }
      }
    }

    function checkStringLiteral(node) {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        if (isHardcodedText(node.value)) {
          context.report({
            node,
            messageId: 'hardcodedText',
            data: {
              text: node.value.substring(0, 50) + (node.value.length > 50 ? '...' : ''),
            },
          });
        }
      } else if (node.type === 'TemplateLiteral') {
        node.quasis.forEach((quasi) => {
          if (quasi.value.raw && isHardcodedText(quasi.value.raw)) {
            context.report({
              node: quasi,
              messageId: 'hardcodedText',
              data: {
                text: quasi.value.raw.substring(0, 50) + (quasi.value.raw.length > 50 ? '...' : ''),
              },
            });
          }
        });
      }
    }

    return {
      CallExpression(node) {
        if (!isExceptionCallee(node.callee)) return;
        if (node.arguments.length > 0) {
          checkExceptionMessage(node.arguments[0]);
        }
      },
      ThrowStatement(node) {
        if (node.argument?.type === 'NewExpression' && isExceptionCallee(node.argument.callee)) {
          if (node.argument.arguments.length > 0) {
            checkExceptionMessage(node.argument.arguments[0]);
          }
        } else if (node.argument?.type === 'CallExpression' && isExceptionCallee(node.argument.callee)) {
          if (node.argument.arguments.length > 0) {
            checkExceptionMessage(node.argument.arguments[0]);
          }
        }
      },
    };
      },
    },
  },
};

