import { parser } from '@elifesciences/docmap-ts';
import { Context } from '@temporalio/activity';

export const parseDocMap = async (docMapInput: string): Promise<parser.ManuscriptData> => {
  Context.current().heartbeat('pre-parsing DocMap for tdmPath');
  // TO-DO: This is a temporary hack, remove/replace once DocMaps are fixed to hold the meca path in the output content
  const docmapStruct = JSON.parse(docMapInput);
  /* eslint-disable no-underscore-dangle */
  const mapExpressionWithTdmPathToContent = (expression: any) => {
    if (!expression._tdmPath) {
      return expression;
    }

    if (!Array.isArray(expression.content)) {
      return {
        ...expression,
        content: [{ url: expression._tdmPath }],
      };
    }

    expression.content.push({ url: expression._tdmPath });
    return expression;
  };

  Object.entries(docmapStruct.steps).forEach(([stepId, step]: [string, any]) => {
    docmapStruct.steps[stepId] = {
      ...step,
      inputs: step.inputs.map(mapExpressionWithTdmPathToContent),
      actions: step.actions.map((action: any) => ({
        ...action,
        outputs: action.outputs.map(mapExpressionWithTdmPathToContent),
      })),
      assertions: step.assertions.map((assertion: any) => {
        if (!assertion.item) {
          return assertion;
        }
        return {
          ...assertion,
          item: mapExpressionWithTdmPathToContent(assertion.item),
        };
      }),
    };
  });
  const docMap = JSON.stringify(docmapStruct);

  Context.current().heartbeat('parsing DocMap');
  return parser.parsePreprintDocMap(docMap);
};
