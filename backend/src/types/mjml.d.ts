declare module 'mjml' {
  type MjmlValidationLevel = 'strict' | 'soft' | 'skip';

  type MjmlOptions = {
    minify?: boolean;
    validationLevel?: MjmlValidationLevel;
  };

  type MjmlResult = {
    html: string;
    errors?: unknown[];
  };

  function mjml2html(input: string, options?: MjmlOptions): MjmlResult;

  export = mjml2html;
}
