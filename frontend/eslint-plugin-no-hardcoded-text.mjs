const noHardcodedTextRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded text in JSX elements, require using translation function t()',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          allowedElements: {
            type: 'array',
            items: { type: 'string' },
            description: 'JSX elements that are allowed to have hardcoded text',
          },
          allowedAttributes: {
            type: 'array',
            items: { type: 'string' },
            description: 'JSX attributes that are allowed to have hardcoded text',
          },
          translationFunction: {
            type: 'string',
            default: 't',
            description: 'Name of the translation function',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Regex patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hardcodedText: 'Hardcoded text "{{text}}" found in {{element}}. Use {{function}}() for translations instead.',
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const allowedElements = new Set(options.allowedElements || ['script', 'style', 'noscript']);
    const allowedAttributes = new Set(
      options.allowedAttributes || ['className', 'id', 'key', 'data-testid', 'data-cy']
    );
    const translationFunction = options.translationFunction || 't';
    const ignorePatterns = (options.ignorePatterns || []).map((pattern) => new RegExp(pattern));

    function isTranslationCall(node) {
      if (!node || node.type !== 'CallExpression') return false;

      const callee = node.callee;
      if (callee.type === 'Identifier' && callee.name === translationFunction) {
        return true;
      }

      if (callee.type === 'MemberExpression') {
        const object = callee.object;
        const property = callee.property;
        if (
          object.type === 'Identifier' &&
          property.type === 'Identifier' &&
          property.name === translationFunction
        ) {
          return true;
        }
      }

      return false;
    }

    function shouldIgnoreText(text) {
      if (!text || typeof text !== 'string') return false;

      const trimmed = text.trim();

      if (trimmed.length === 0) return true;

      if (trimmed.match(/^[0-9\s.,\-+()]+$/)) return true;

      if (trimmed.match(/^[a-z]+:\/\/|^www\.|^mailto:/i)) return true;

      if (trimmed.match(/^[:;|•\-\s/×]+$/)) return true;

      if (trimmed.length === 1) {
        if (/^[:\-;|•/×·]$/.test(trimmed)) return true;
        if (/^[A-Z]$/.test(trimmed)) return true;
      }

      if (trimmed.length <= 2 && /^[×·/|:\-;]+$/.test(trimmed)) return true;

      if (/^[\u{1F300}-\u{1F9FF}]$/u.test(trimmed)) return true;

      if (ignorePatterns.some((pattern) => pattern.test(text))) return true;

      return false;
    }

    function checkTextNode(node, parent) {
      if (node.type !== 'Literal' && node.type !== 'JSXText') return;

      const text = node.value;
      if (typeof text !== 'string') return;

      if (shouldIgnoreText(text)) return;

      const parentElement = parent.type === 'JSXElement' ? parent : null;
      if (!parentElement) return;

      const elementName = parentElement.openingElement.name;
      const elementTagName =
        elementName.type === 'JSXIdentifier' ? elementName.name : null;

      if (!elementTagName) return;

      if (allowedElements.has(elementTagName)) return;

      if (isTranslationCall(parent)) return;

      const hasTranslationInSiblings = (() => {
        const parentJSX = parentElement.parent;
        if (parentJSX && parentJSX.type === 'JSXElement') {
          const children = parentJSX.children || [];
          return children.some(
            (child) =>
              child.type === 'JSXExpressionContainer' &&
              child.expression &&
              isTranslationCall(child.expression)
          );
        }
        return false;
      })();

      if (hasTranslationInSiblings) return;

      context.report({
        node,
        messageId: 'hardcodedText',
        data: {
          text: text.trim().substring(0, 30) + (text.trim().length > 30 ? '...' : ''),
          element: `<${elementTagName}>`,
          function: translationFunction,
        },
      });
    }

    function checkJSXExpressionContainer(node) {
      if (node.type !== 'JSXExpressionContainer') return;

      const expression = node.expression;

      if (expression.type === 'Literal' && typeof expression.value === 'string') {
        if (shouldIgnoreText(expression.value)) return;

        const parent = node.parent;
        if (parent && parent.type === 'JSXElement') {
          const elementName = parent.openingElement.name;
          const elementTagName =
            elementName.type === 'JSXIdentifier' ? elementName.name : null;

          if (!elementTagName || allowedElements.has(elementTagName)) return;

          if (!isTranslationCall(expression)) {
            context.report({
              node: expression,
              messageId: 'hardcodedText',
              data: {
                text:
                  expression.value.trim().substring(0, 30) +
                  (expression.value.trim().length > 30 ? '...' : ''),
                element: `<${elementTagName}>`,
                function: translationFunction,
              },
            });
          }
        }
      }
    }

    function checkJSXAttribute(node) {
      if (node.type !== 'JSXAttribute') return;

      const attributeName = node.name.name;
      if (allowedAttributes.has(attributeName)) return;

      const value = node.value;
      if (!value) return;

      if (value.type === 'Literal' && typeof value.value === 'string') {
        if (shouldIgnoreText(value.value)) return;

        if (!isTranslationCall(value)) {
          const importantAttributes = ['aria-label', 'title', 'placeholder', 'alt'];
          if (importantAttributes.includes(attributeName)) {
            context.report({
              node: value,
              messageId: 'hardcodedText',
              data: {
                text:
                  value.value.trim().substring(0, 30) +
                  (value.value.trim().length > 30 ? '...' : ''),
                element: `${attributeName} attribute`,
                function: translationFunction,
              },
            });
          }
        }
      }

      if (value.type === 'JSXExpressionContainer') {
        const expression = value.expression;
        if (
          expression.type === 'Literal' &&
          typeof expression.value === 'string' &&
          !shouldIgnoreText(expression.value) &&
          !isTranslationCall(expression)
        ) {
          const importantAttributes = ['aria-label', 'title', 'placeholder', 'alt'];
          if (importantAttributes.includes(attributeName)) {
            context.report({
              node: expression,
              messageId: 'hardcodedText',
              data: {
                text:
                  expression.value.trim().substring(0, 30) +
                  (expression.value.trim().length > 30 ? '...' : ''),
                element: `${attributeName} attribute`,
                function: translationFunction,
              },
            });
          }
        }
      }
    }

    return {
      JSXText(node) {
        checkTextNode(node, node.parent);
      },
      Literal(node) {
        if (node.parent && node.parent.type === 'JSXExpressionContainer') {
          checkJSXExpressionContainer(node.parent);
        }
      },
      JSXExpressionContainer: checkJSXExpressionContainer,
      JSXAttribute: checkJSXAttribute,
    };
  },
};

export default {
  rules: {
    'no-hardcoded-text': noHardcodedTextRule,
  },
};

