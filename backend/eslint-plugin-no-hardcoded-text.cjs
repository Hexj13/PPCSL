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
    const macedonianPattern = /[А-Яа-яЁёЉљЊњЌќЏџЅѕ]/;
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
        const callee = node.callee;
        if (
          callee.type === 'NewExpression' ||
          (callee.type === 'Identifier' &&
            ['BadRequestException', 'ForbiddenException', 'NotFoundException', 'UnauthorizedException', 'ConflictException'].includes(callee.name)) ||
          (callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'Error' &&
            callee.property.type === 'Identifier' &&
            ['BadRequestException', 'ForbiddenException', 'NotFoundException', 'UnauthorizedException', 'ConflictException'].includes(callee.property.name))
        ) {
          if (node.arguments.length > 0) {
            const firstArg = node.arguments[0];
            checkStringLiteral(firstArg);
          }
        }
      },
      ThrowStatement(node) {
        if (node.argument) {
          if (node.argument.type === 'NewExpression') {
            if (node.argument.arguments.length > 0) {
              const firstArg = node.argument.arguments[0];
              checkStringLiteral(firstArg);
            }
          } else if (node.argument.type === 'CallExpression') {
            if (node.argument.arguments.length > 0) {
              const firstArg = node.argument.arguments[0];
              checkStringLiteral(firstArg);
            }
          }
        }
      },
    };
      },
    },
  },
};

